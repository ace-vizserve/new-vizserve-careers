import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

// GET /api/shares?applicationId=123
// Which guests an application is currently shared with. HR only.
export async function GET(req: Request) {
  const guard = await requireRole("hr");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const applicationId = new URL(req.url).searchParams.get("applicationId");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guest_shares")
    .select("id, application_id, guest_user_id, created_at")
    .eq("application_id", Number(applicationId));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shares: data ?? [] });
}

// POST — share one application with one guest. HR only.
// Idempotent: re-sharing the same pair is a no-op.
export async function POST(req: Request) {
  const guard = await requireRole("hr");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => ({}));
  const applicationId = Number(body.applicationId);
  const guestUserId = String(body.guestUserId ?? "");

  if (!applicationId || !guestUserId) {
    return NextResponse.json(
      { error: "applicationId and guestUserId are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Only an active guest account may be a share target.
  const { data: guestProfile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("user_id", guestUserId)
    .maybeSingle();
  if (!guestProfile || guestProfile.role !== "guest" || !guestProfile.is_active) {
    return NextResponse.json(
      { error: "Target is not an active guest account" },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("guest_shares")
    .upsert(
      {
        application_id: applicationId,
        guest_user_id: guestUserId,
        shared_by: guard.session.userId,
      },
      { onConflict: "application_id,guest_user_id" },
    )
    .select("id, application_id, guest_user_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ share: data }, { status: 201 });
}
