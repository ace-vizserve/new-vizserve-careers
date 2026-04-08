import { createClient } from "@/lib/server";
import JobsClient from "./jobs-client";

export const revalidate = 300;

export default async function Page() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return <JobsClient initialJobs={jobs ?? []} />;
}
