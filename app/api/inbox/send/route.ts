import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { findOrCreateThread, currentMailboxAddress } from "@/lib/imap";
import { sendMail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accepts either { body } (legacy plain text) or { bodyHtml } (rich text).
    const { to, subject, body, bodyHtml, applicationId } = await req.json();

    const html: string | null = typeof bodyHtml === "string" && bodyHtml.trim() ? bodyHtml : null;
    const text: string = (typeof body === "string" && body) || htmlToPlainText(html ?? "");

    if (!to?.trim() || !subject?.trim() || (!html && !text.trim())) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 },
      );
    }

    // Signature is prefilled into the body by the compose/reply UI,
    // so the user sees + edits before sending. Send body as-is.
    const admin = createAdminClient();
    await sendMail({
      to,
      subject,
      body: html ?? text,
      contentType: html ? "HTML" : "Text",
    });

    // Log the outbound message into the thread for this candidate.
    const sentAt = new Date().toISOString();
    const thread = await findOrCreateThread({
      participantEmail: to,
      subject,
      lastMessageAt: sentAt,
      applicationId: applicationId ? Number(applicationId) : null,
    });

    await admin.from("inbox_messages").insert({
      thread_id: thread.id,
      direction: "outbound",
      from_address: process.env.SMTP_USER,
      to_address: to,
      subject,
      body_text: text,
      body_html: html,
      sent_by_user_id: user.id,
      is_read: true,
      created_at: sentAt,
      mailbox_address: currentMailboxAddress(),
    });

    await admin
      .from("inbox_threads")
      .update({ last_message_at: sentAt })
      .eq("id", thread.id);

    return NextResponse.json({ success: true, threadId: thread.id }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/inbox/send]", err);
    return NextResponse.json(
      { error: "Failed to send email", details: err.message },
      { status: 500 },
    );
  }
}

function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
