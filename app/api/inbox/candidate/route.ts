import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

// GET /api/inbox/candidate?applicationId=123
// Email threads with one candidate — matched by application link or email. HR only.
export async function GET(req: Request) {
  const guard = await requireRole("hr");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const applicationId = Number(new URL(req.url).searchParams.get("applicationId"));
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: app } = await admin
    .from("applications")
    .select("email")
    .eq("id", applicationId)
    .maybeSingle();
  const email = app?.email?.toLowerCase().trim();

  let query = admin
    .from("inbox_threads")
    .select("id, subject, participant_email, last_message_at, unread_count")
    .order("last_message_at", { ascending: false });

  // A thread counts if it's linked to this application, or if its
  // participant is the candidate's email address.
  query = email
    ? query.or(`application_id.eq.${applicationId},participant_email.eq.${email}`)
    : query.eq("application_id", applicationId);

  const { data: threads, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ threads: threads ?? [] });
}
