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
  const result: SyncResult = { fetched: 0, inserted: 0, skipped: 0, errors: [] };

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
        const inserted = await persistInboundMessage(parsed);
        if (inserted) result.inserted++;
        else result.skipped++;
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

/**
 * Inserts an inbound message and its containing thread.
 * Returns true if a new message row was inserted, false if the
 * Message-ID already exists in the DB.
 */
async function persistInboundMessage(parsed: ParsedMail): Promise<boolean> {
  const supabase = createAdminClient();
  const mailbox = currentMailboxAddress();

  const fromAddress =
    parsed.from?.value[0]?.address?.toLowerCase().trim() ?? "";
  const toAddress =
    Array.isArray(parsed.to)
      ? parsed.to[0]?.value[0]?.address?.toLowerCase().trim() ?? ""
      : parsed.to?.value[0]?.address?.toLowerCase().trim() ?? "";

  if (!fromAddress) return false;

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
    if (existing) return false;
  }

  // Find/create the thread for this participant (by email address).
  const thread = await findOrCreateThread({
    participantEmail: fromAddress,
    subject,
    lastMessageAt: receivedAt,
  });

  const { error } = await supabase.from("inbox_messages").insert({
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
  });
  if (error) throw new Error(`message insert: ${error.message}`);

  // Bump thread metadata.
  await supabase
    .from("inbox_threads")
    .update({
      last_message_at: receivedAt,
      unread_count: thread.unread_count + 1,
    })
    .eq("id", thread.id);

  return true;
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
