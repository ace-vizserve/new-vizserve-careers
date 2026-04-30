import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

    return NextResponse.json({ thread, messages: messages ?? [] });
  } catch (err: any) {
    console.error("[GET /api/inbox/threads/[id]]", err);
    return NextResponse.json(
      { error: "Failed to load thread", details: err.message },
      { status: 500 },
    );
  }
}
