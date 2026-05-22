import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

// GET /api/guest/notes?applicationId=123 — the signed-in guest's note. Guest only.
export async function GET(req: Request) {
  const guard = await requireRole("guest");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const applicationId = Number(new URL(req.url).searchParams.get("applicationId"));
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guest_interview_notes")
    .select("id, note, updated_at")
    .eq("application_id", applicationId)
    .eq("guest_user_id", guard.session.userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

// PUT — save the guest's note. Only allowed on applications shared with them.
export async function PUT(req: Request) {
  const guard = await requireRole("guest");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => ({}));
  const applicationId = Number(body.applicationId);
  const note = String(body.note ?? "");
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // The note may only be written if the application is shared with this guest.
  const { data: share } = await admin
    .from("guest_shares")
    .select("id")
    .eq("application_id", applicationId)
    .eq("guest_user_id", guard.session.userId)
    .maybeSingle();
  if (!share) {
    return NextResponse.json(
      { error: "This candidate is not shared with you" },
      { status: 403 },
    );
  }

  const { error } = await admin.from("guest_interview_notes").upsert(
    {
      application_id: applicationId,
      guest_user_id: guard.session.userId,
      note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "application_id,guest_user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
