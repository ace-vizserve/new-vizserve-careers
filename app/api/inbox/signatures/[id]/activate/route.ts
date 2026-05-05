import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    // Demote any currently active sigs, then promote the chosen one.
    await admin
      .from("inbox_signatures")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("id", id);

    const { error } = await admin
      .from("inbox_signatures")
      .update({ is_active: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/inbox/signatures/[id]/activate]", err);
    return NextResponse.json(
      { error: "Failed to activate signature", details: err.message },
      { status: 500 },
    );
  }
}
