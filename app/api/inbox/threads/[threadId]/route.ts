import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { currentMailboxAddress } from "@/lib/imap";
import { NextResponse } from "next/server";
import { hasAppAccess } from "@/lib/app-access";

interface AttachmentDTO {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

/**
 * Groups attachments by message id.
 *
 * Inline parts already render inside body_html via /api/inbox/attachments,
 * so only real attachments belong in the chip list; rows whose upload failed
 * (empty storage_path) are dropped since there's nothing behind them to open.
 *
 * A failure here is logged and swallowed — before the inbox_attachments
 * migration has been applied there is simply nothing to show, and that must
 * not stop the thread from loading.
 */
async function loadAttachments(
  admin: ReturnType<typeof createAdminClient>,
  messageIds: string[],
): Promise<Map<string, AttachmentDTO[]>> {
  const grouped = new Map<string, AttachmentDTO[]>();
  if (messageIds.length === 0) return grouped;

  const { data, error } = await admin
    .from("inbox_attachments")
    .select("id, message_id, filename, content_type, size_bytes, is_inline, storage_path")
    .in("message_id", messageIds);

  if (error) {
    console.warn("[inbox] attachments unavailable:", error.message);
    return grouped;
  }

  for (const row of data ?? []) {
    if (row.is_inline || !row.storage_path) continue;
    const list = grouped.get(row.message_id) ?? [];
    list.push({
      id: row.id,
      filename: row.filename,
      content_type: row.content_type,
      size_bytes: row.size_bytes,
    });
    grouped.set(row.message_id, list);
  }
  return grouped;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !hasAppAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const admin = createAdminClient();

    const { data: thread, error: tErr } = await admin
      .from("inbox_threads")
      .select(`
        id,
        application_id,
        participant_email,
        subject,
        last_message_at,
        unread_count,
        applications ( id, full_name, email )
      `)
      .eq("id", threadId)
      .eq("mailbox_address", currentMailboxAddress())
      .single();

    if (tErr || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data: messages, error: mErr } = await admin
      .from("inbox_messages")
      .select("id, direction, from_address, to_address, subject, body_text, body_html, created_at, is_read")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;

    // Attachments are fetched separately rather than as an embedded join, so a
    // missing table or a stale PostgREST schema cache costs us the chips —
    // not the whole conversation.
    const attachmentsByMessage = await loadAttachments(
      admin,
      (messages ?? []).map((m) => m.id),
    );

    const shaped = (messages ?? []).map((msg) => ({
      ...msg,
      attachments: attachmentsByMessage.get(msg.id) ?? [],
    }));

    // Mark unread inbound messages as read now that the thread is open.
    if (thread.unread_count > 0) {
      await admin
        .from("inbox_messages")
        .update({ is_read: true })
        .eq("thread_id", threadId)
        .eq("direction", "inbound")
        .eq("is_read", false);

      await admin
        .from("inbox_threads")
        .update({ unread_count: 0 })
        .eq("id", threadId);
    }

    return NextResponse.json({ thread, messages: shaped });
  } catch (err: any) {
    console.error("[GET /api/inbox/threads/[id]]", err);
    return NextResponse.json(
      { error: "Failed to load thread", details: err.message },
      { status: 500 },
    );
  }
}
