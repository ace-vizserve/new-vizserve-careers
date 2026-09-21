import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { createAdminClient } from "@/lib/server-admin";

/**
 * IMAP sync for the recruiting mailbox.
 *
 * Reuses the SMTP credentials (same mailbox login).
 * Fetches the most recent INBOX messages, parses them, and stores
 * any new ones in inbox_threads + inbox_messages. Existing messages
 * are deduplicated by IMAP Message-ID (external_id).
 *
 * Env vars:
 *   IMAP_HOST  (e.g. imap.secureserver.net)
 *   IMAP_PORT  (e.g. 993)
 *   SMTP_USER  (mailbox address — reused as IMAP login)
 *   SMTP_PASS  (mailbox password — reused as IMAP password)
 */

interface SyncResult {
  fetched: number;
  inserted: number;
  skipped: number;
  /** Attachments recovered for messages that were already in the DB. */
  backfilled: number;
  errors: string[];
}

/**
 * Returns the mailbox this server is currently configured to sync from.
 * Every thread/message we persist is tagged with this so swapping
 * SMTP_USER hides the previous mailbox's data without destroying it.
 */
export function currentMailboxAddress(): string {
  const addr = process.env.SMTP_USER?.toLowerCase().trim();
  if (!addr) throw new Error("SMTP_USER is not configured");
  return addr;
}

function imapClient(): ImapFlow {
  return new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    logger: false,
  });
}

/**
 * Appends a raw RFC822 message to the IMAP "Sent" folder so it shows
 * up in Outlook (or any other IMAP client) as a normal sent message.
 * SMTP alone won't put a copy there — the server has no idea what
 * folder the sender wants. Folder name is auto-detected via the
 * `\Sent` special-use flag, with sensible fallbacks for providers
 * that don't advertise it.
 */
export async function appendToSentFolder(rawMessage: Buffer): Promise<void> {
  const client = imapClient();
  await client.connect();
  try {
    const mailboxes = await client.list();
    const fallbackNames = new Set(["Sent", "Sent Items", "INBOX.Sent"]);
    const sentPath =
      mailboxes.find((m) => m.specialUse === "\\Sent")?.path
      ?? mailboxes.find((m) => fallbackNames.has(m.path))?.path;
    if (!sentPath) throw new Error("No Sent folder found on IMAP server");

    await client.append(sentPath, rawMessage, ["\\Seen"]);
  } finally {
    await client.logout();
  }
}

/**
 * Connects to IMAP, fetches recent INBOX messages, and stores any
 * new ones in the database. Returns counts for visibility.
 */
export async function syncInbox(limit = 50): Promise<SyncResult> {
  const result: SyncResult = { fetched: 0, inserted: 0, skipped: 0, backfilled: 0, errors: [] };

  const client = imapClient();

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  try {
    const status = await client.status("INBOX", { messages: true });
    if (!status.messages) return result;

    // Fetch the most recent `limit` messages by sequence number.
    const start = Math.max(1, status.messages - limit + 1);
    const range = `${start}:${status.messages}`;

    for await (const msg of client.fetch(range, { source: true, envelope: true, uid: true })) {
      result.fetched++;
      try {
        const parsed = await simpleParser(msg.source as Buffer);
        const outcome = await persistInboundMessage(parsed, result.errors);
        if (outcome.inserted) result.inserted++;
        else result.skipped++;
        result.backfilled += outcome.backfilled;
      } catch (err: any) {
        result.errors.push(`uid=${msg.uid}: ${err.message}`);
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return result;
}

interface PersistOutcome {
  /** True when a new message row was written, false on a Message-ID dedup hit. */
  inserted: boolean;
  /** Attachments recovered for a message that was already in the DB. */
  backfilled: number;
}

/**
 * Inserts an inbound message and its containing thread, along with any
 * attachments. On a dedup hit the message is left alone but its attachments
 * are backfilled if any are missing.
 *
 * `errors` collects per-attachment failures so they surface in the sync
 * result. A bad attachment must never cost us the message, but it must not
 * pass silently either.
 */
async function persistInboundMessage(
  parsed: ParsedMail,
  errors: string[],
): Promise<PersistOutcome> {
  const supabase = createAdminClient();
  const mailbox = currentMailboxAddress();

  const fromAddress =
    parsed.from?.value[0]?.address?.toLowerCase().trim() ?? "";
  const toAddress =
    Array.isArray(parsed.to)
      ? parsed.to[0]?.value[0]?.address?.toLowerCase().trim() ?? ""
      : parsed.to?.value[0]?.address?.toLowerCase().trim() ?? "";

  if (!fromAddress) return { inserted: false, backfilled: 0 };

  const messageId = parsed.messageId ?? null;
  const subject = parsed.subject ?? "";
  const bodyText = parsed.text ?? "";
  const bodyHtml = parsed.html === false ? null : (parsed.html ?? null);
  const receivedAt = parsed.date?.toISOString() ?? new Date().toISOString();

  // Dedup by Message-ID *within this mailbox* — same Message-ID landing
  // in a different mailbox is a legitimately separate row.
  if (messageId) {
    const { data: existing } = await supabase
      .from("inbox_messages")
      .select("id")
      .eq("external_id", messageId)
      .eq("mailbox_address", mailbox)
      .maybeSingle();
    if (existing) {
      // Messages synced before attachments were stored have none on file.
      // Heal them here so a re-sync surfaces what was previously dropped.
      const backfilled = await backfillAttachments(existing.id, parsed, bodyHtml, errors);
      return { inserted: false, backfilled };
    }
  }

  // Find/create the thread for this participant (by email address).
  const thread = await findOrCreateThread({
    participantEmail: fromAddress,
    subject,
    lastMessageAt: receivedAt,
  });

  const { data: message, error } = await supabase
    .from("inbox_messages")
    .insert({
      thread_id: thread.id,
      direction: "inbound",
      from_address: fromAddress,
      to_address: toAddress,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      external_id: messageId,
      is_read: false,
      created_at: receivedAt,
      mailbox_address: mailbox,
    })
    .select("id")
    .single();
  if (error || !message) throw new Error(`message insert: ${error?.message}`);

  // Store the attachments, then repoint any `cid:` image in the body at
  // the row we just created so inline images actually render in the UI.
  const stored = await persistAttachments(message.id, parsed, errors);
  const rewritten = rewriteInlineCids(bodyHtml, stored);
  if (rewritten !== bodyHtml) {
    await supabase
      .from("inbox_messages")
      .update({ body_html: rewritten })
      .eq("id", message.id);
  }

  // Bump thread metadata.
  await supabase
    .from("inbox_threads")
    .update({
      last_message_at: receivedAt,
      unread_count: thread.unread_count + 1,
    })
    .eq("id", thread.id);

  return { inserted: true, backfilled: 0 };
}

export const ATTACHMENT_BUCKET = "inbox-attachments";

/**
 * Stores the attachments of a message that was already synced, but only when
 * what's on file doesn't account for every part the message actually carries.
 * Lets a re-sync recover attachments from messages that landed before this
 * feature existed — or before the Storage bucket did — without duplicating
 * anything for messages that are already complete.
 */
async function backfillAttachments(
  messageId: string,
  parsed: ParsedMail,
  bodyHtml: string | null,
  errors: string[],
): Promise<number> {
  const expected = parsed.attachments?.length ?? 0;
  if (expected === 0) return 0;

  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("inbox_attachments")
    .select("id", { count: "exact", head: true })
    .eq("message_id", messageId);

  // A missing table (migration not applied yet) must not break the sync.
  if (error) {
    errors.push(`attachment backfill check for ${messageId}: ${error.message}`);
    return 0;
  }

  const have = count ?? 0;
  if (have >= expected) return 0;

  // Fewer rows than the message has parts — an earlier run lost some to an
  // upload failure. Which row came from which part isn't recorded, so drop
  // what's there and redo the whole set. Storage paths are derived from the
  // same parse and uploaded with upsert, so this overwrites in place rather
  // than orphaning objects.
  if (have > 0) {
    const { error: delErr } = await supabase
      .from("inbox_attachments")
      .delete()
      .eq("message_id", messageId);
    if (delErr) {
      errors.push(`attachment backfill reset for ${messageId}: ${delErr.message}`);
      return 0;
    }
  }

  const stored = await persistAttachments(messageId, parsed, errors);
  const rewritten = rewriteInlineCids(bodyHtml, stored);
  if (rewritten && rewritten !== bodyHtml) {
    await supabase
      .from("inbox_messages")
      .update({ body_html: rewritten })
      .eq("id", messageId);
  }
  return stored.length;
}

/** Attachments above this are skipped — the metadata row is still written
 *  so the UI can show the filename and say why there's nothing to open. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

interface StoredAttachment {
  id: string;
  contentId: string | null;
}

/**
 * Uploads every attachment part of a parsed message to Storage and writes
 * one inbox_attachments row per part. A part that can't be stored is skipped
 * and reported via `errors` — a bad attachment must never cost us the
 * message itself, and a later sync will retry it via backfillAttachments.
 */
async function persistAttachments(
  messageId: string,
  parsed: ParsedMail,
  errors: string[],
): Promise<StoredAttachment[]> {
  const attachments = parsed.attachments ?? [];
  if (attachments.length === 0) return [];

  const supabase = createAdminClient();
  const stored: StoredAttachment[] = [];

  for (const [index, att] of attachments.entries()) {
    try {
      const contentId = att.cid ? att.cid.replace(/^<|>$/g, "") : null;
      const isInline =
        att.contentDisposition === "inline" || (att.related === true && !!contentId);
      const filename = safeFilename(att.filename, contentId, index, att.contentType);
      const size = att.size ?? att.content?.length ?? 0;

      let storagePath = "";
      if (size > 0 && size <= MAX_ATTACHMENT_BYTES && att.content) {
        storagePath = `${messageId}/${index}-${filename}`;
        const { error: upErr } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(storagePath, att.content, {
            contentType: att.contentType || "application/octet-stream",
            upsert: true,
          });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
      }

      const { data: row, error: rowErr } = await supabase
        .from("inbox_attachments")
        .insert({
          message_id: messageId,
          filename,
          content_type: att.contentType || "application/octet-stream",
          size_bytes: size,
          storage_path: storagePath,
          content_id: contentId,
          is_inline: isInline,
        })
        .select("id")
        .single();
      if (rowErr || !row) throw new Error(`row insert: ${rowErr?.message}`);

      stored.push({ id: row.id, contentId });
    } catch (err: any) {
      const label = att.filename || `part ${index + 1}`;
      console.error(`[inbox] attachment ${index} of message ${messageId}:`, err.message);
      errors.push(`attachment "${label}" of message ${messageId}: ${err.message}`);
    }
  }

  return stored;
}

/**
 * Turns `src="cid:abc123"` into `src="/api/inbox/attachments/<uuid>"`.
 * Mail clients emit the cid with or without angle brackets and with either
 * quote style, so match loosely and compare on the bare id.
 */
function rewriteInlineCids(
  html: string | null,
  stored: StoredAttachment[],
): string | null {
  if (!html) return html;
  const byCid = new Map(
    stored.filter((s) => s.contentId).map((s) => [s.contentId!.toLowerCase(), s.id]),
  );
  if (byCid.size === 0) return html;

  return html.replace(/(["'(])cid:([^"')\s]+)(["')])/gi, (match, open, cid, close) => {
    const id = byCid.get(cid.replace(/^<|>$/g, "").toLowerCase());
    return id ? `${open}/api/inbox/attachments/${id}${close}` : match;
  });
}

/** Strips path separators and control characters so the value is safe as a
 *  Storage key segment, and always returns something non-empty. */
function safeFilename(
  raw: string | undefined,
  contentId: string | null,
  index: number,
  contentType: string | undefined,
): string {
  const fallbackExt = contentType?.split("/")[1]?.split("+")[0] ?? "bin";
  const base =
    raw?.trim() || (contentId ? `inline-${contentId}` : `attachment-${index + 1}.${fallbackExt}`);
  const cleaned = base
    .replace(/[\/]/g, "-")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._\- ]/g, "_")
    .trim();
  return (cleaned || `attachment-${index + 1}.${fallbackExt}`).slice(0, 120);
}

interface ThreadRow {
  id: string;
  application_id: number | null;
  unread_count: number;
}

/**
 * Looks up an existing thread by participant email, or creates one.
 * Tries to link to an application by matching email address.
 */
export async function findOrCreateThread(opts: {
  participantEmail: string;
  subject: string;
  lastMessageAt: string;
  applicationId?: number | null;
}): Promise<ThreadRow> {
  const supabase = createAdminClient();
  const email = opts.participantEmail.toLowerCase().trim();
  const mailbox = currentMailboxAddress();

  const { data: existing } = await supabase
    .from("inbox_threads")
    .select("id, application_id, unread_count")
    .eq("participant_email", email)
    .eq("mailbox_address", mailbox)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  // No thread yet — try to link to an application by email.
  let applicationId: number | null = opts.applicationId ?? null;
  if (!applicationId) {
    const { data: app } = await supabase
      .from("applications")
      .select("id")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (app) applicationId = app.id;
  }

  const { data: created, error } = await supabase
    .from("inbox_threads")
    .insert({
      application_id: applicationId,
      participant_email: email,
      subject: opts.subject,
      last_message_at: opts.lastMessageAt,
      unread_count: 0,
      mailbox_address: mailbox,
    })
    .select("id, application_id, unread_count")
    .single();

  if (error || !created) throw new Error(`thread create: ${error?.message}`);
  return created;
}
