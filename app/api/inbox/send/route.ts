import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { findOrCreateThread } from "@/lib/imap";
import { sendMail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, body, applicationId } = await req.json();

    if (!to?.trim() || !subject?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 },
      );
    }

    await sendMail({ to, subject, body });

    // Log the outbound message into the thread for this candidate.
    const sentAt = new Date().toISOString();
    const thread = await findOrCreateThread({
      participantEmail: to,
      subject,
      lastMessageAt: sentAt,
      applicationId: applicationId ? Number(applicationId) : null,
    });

    const admin = createAdminClient();
    await admin.from("inbox_messages").insert({
      thread_id: thread.id,
      direction: "outbound",
      from_address: process.env.SMTP_USER,
      to_address: to,
      subject,
      body_text: body,
      sent_by_user_id: user.id,
      is_read: true,
      created_at: sentAt,
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
