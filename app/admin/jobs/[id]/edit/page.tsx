import JobForm from "../../_components/JobForm";
import { createClient } from "@/lib/server";
import { notFound } from "next/navigation";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = await params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) notFound();

  return (
    <JobForm
      jobId={job.id}
      initial={{
        ...job,
        salary_min: job.salary_min != null ? String(job.salary_min) : "",
        salary_max: job.salary_max != null ? String(job.salary_max) : "",
      }}
    />
  );
}
