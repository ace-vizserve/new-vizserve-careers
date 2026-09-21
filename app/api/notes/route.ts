import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

const NOTE_FIELDS =
  "id, author_id, author_name, author_role, body, created_at, updated_at";

/** A guest may only touch notes on a candidate shared with them. */
async function guestCanAccess(
  admin: ReturnType<typeof createAdminClient>,
  applicationId: number,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("guest_shares")
    .select("id")
    .eq("application_id", applicationId)
    .eq("guest_user_id", userId)
    .maybeSingle();
  return !!data;
}

// GET /api/notes?applicationId=123 — the full note thread. HR + guest.
export async function GET(req: Request) {
  const guard = await requireRole("hr", "guest");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const applicationId = Number(new URL(req.url).searchParams.get("applicationId"));
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (
    guard.session.role === "guest" &&
    !(await guestCanAccess(admin, applicationId, guard.session.userId))
  ) {
    return NextResponse.json(
      { error: "This candidate is not shared with you" },
      { status: 403 },
    );
  }

  const { data, error } = await admin
    .from("candidate_notes")
    .select(NOTE_FIELDS)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    notes: data ?? [],
    currentUserId: guard.session.userId,
  });
}

// POST — add a note to the thread. HR + guest.
export async function POST(req: Request) {
  const guard = await requireRole("hr", "guest");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => ({}));
  const applicationId = Number(body.applicationId);
  const text = String(body.body ?? "").trim();
  if (!applicationId || !text) {
    return NextResponse.json(
      { error: "applicationId and body are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (
    guard.session.role === "guest" &&
    !(await guestCanAccess(admin, applicationId, guard.session.userId))
  ) {
    return NextResponse.json(
      { error: "This candidate is not shared with you" },
      { status: 403 },
    );
  }

  // Author name + role are snapshotted so the thread reads correctly
  // even if the account is later renamed.
  const { data, error } = await admin
    .from("candidate_notes")
    .insert({
      application_id: applicationId,
      author_id: guard.session.userId,
      author_name: guard.session.displayName || guard.session.email,
      author_role: guard.session.role,
      body: text,
    })
    .select(NOTE_FIELDS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
