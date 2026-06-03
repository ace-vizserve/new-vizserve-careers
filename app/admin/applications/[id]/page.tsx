import { CandidateDetail } from "@/components/CandidateDetail";
import { CandidateEmails } from "@/components/CandidateEmails";
import { NotesThread } from "@/components/NotesThread";
import { ShareToGuestButton } from "@/components/ShareToGuestButton";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/server";
import { notFound } from "next/navigation";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const session = await getSessionProfile();
  const role = session?.role ?? "hr";

  // A guest may only open candidates explicitly shared with them.
  if (role === "guest") {
    const { data: share } = await supabase
      .from("guest_shares")
      .select("id")
      .eq("application_id", Number(id))
      .eq("guest_user_id", user.id)
      .maybeSingle();
    if (!share) notFound();
  }

  const { data: app, error } = await supabase
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

  if (error || !app) notFound();

  const backHref = app.job_id
    ? `/admin/applications/job/${app.job_id}`
    : "/admin/applications";

  return (
    <CandidateDetail
      app={app}
      backHref={backHref}
      actionSlot={
        role === "guest" ? undefined : <ShareToGuestButton applicationId={app.id} />
      }
      emailSlot={
        role === "guest" ? undefined : <CandidateEmails applicationId={app.id} />
      }
      notesSlot={<NotesThread applicationId={app.id} />}
    />
  );
}
