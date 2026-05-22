import { CandidateDetail } from "@/components/CandidateDetail";
import { ShareToGuestButton } from "@/components/ShareToGuestButton";
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
      actionSlot={<ShareToGuestButton applicationId={app.id} />}
    />
  );
}
