import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { currentMailboxAddress } from "@/lib/imap";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? 25)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const admin = createAdminClient();
    const { data, error, count } = await admin
      .from("inbox_threads")
      .select("id, application_id, participant_email, subject, last_message_at, unread_count", { count: "exact" })
      .eq("mailbox_address", currentMailboxAddress())
      .order("last_message_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      threads: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error("[GET /api/inbox/threads]", err);
    return NextResponse.json(
      { error: "Failed to load threads", details: err.message },
      { status: 500 },
    );
  }
}
