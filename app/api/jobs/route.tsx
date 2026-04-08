import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error("[GET /api/jobs]", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}