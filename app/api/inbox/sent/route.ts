import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("inbox_messages")
      .select("id, thread_id, to_address, subject, body_text, created_at")
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ messages: data ?? [] });
  } catch (err: any) {
    console.error("[GET /api/inbox/sent]", err);
    return NextResponse.json(
      { error: "Failed to load sent messages", details: err.message },
      { status: 500 },
    );
  }
}
