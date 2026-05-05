import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

/**
 * Returns the user's currently active signature (if any).
 * Used by the compose + reply boxes to prefill the editor.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("inbox_signatures")
      .select("id, name, body, body_html")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ signature: data ?? null });
  } catch (err: any) {
    console.error("[GET /api/inbox/signatures/active]", err);
    return NextResponse.json(
      { error: "Failed to load active signature", details: err.message },
      { status: 500 },
    );
  }
}
