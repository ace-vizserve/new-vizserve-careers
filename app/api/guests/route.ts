import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

// GET — active guest accounts, for the "Share to guest" picker. HR only.
export async function GET() {
  const guard = await requireRole("hr");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, display_name, email")
    .eq("role", "guest")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guests: data ?? [] });
}
