import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[GET /api/jobs/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}