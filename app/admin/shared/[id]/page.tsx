import { CandidateDetail } from "@/components/CandidateDetail";
import { GuestNotes } from "@/components/GuestNotes";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { notFound, redirect } from "next/navigation";

export default async function GuestCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const guard = await requireRole("guest");
  if (!guard.ok) redirect("/admin/login");

  const admin = createAdminClient();

  // The guest may only open candidates explicitly shared with them.
  const { data: share } = await admin
    .from("guest_shares")
    .select("id")
    .eq("application_id", Number(id))
    .eq("guest_user_id", guard.session.userId)
    .maybeSingle();
  if (!share) notFound();

  const { data: app } = await admin
    .from("applications")
    .select(`
      *,
      jobs ( position_name, org_name ),
      application_family_members ( * ),
      application_educations ( * ),
      application_experiences ( * ),
      application_references ( * )
    `)
    .eq("id", id)
    .single();
  if (!app) notFound();

  return (
    <CandidateDetail
      app={app}
      backHref="/admin/shared"
      notesSlot={<GuestNotes applicationId={app.id} />}
    />
  );
}
