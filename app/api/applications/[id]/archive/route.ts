import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let archive_reason = "";
    let archive_details = "";
    try {
      const body = await req.json();
      archive_reason = typeof body?.archive_reason === "string" ? body.archive_reason.trim() : "";
      archive_details = typeof body?.archive_details === "string" ? body.archive_details.trim() : "";
    } catch {
      // No JSON body — treat as missing reason
    }

    if (!archive_reason) {
      return NextResponse.json(
        { error: "archive_reason is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("applications")
      .update({
        archived_at: new Date().toISOString(),
        archive_reason,
        archive_details: archive_details || null,
      })
      .eq("id", id)
      .is("archived_at", null)
      .select("id, archived_at, archive_reason, archive_details")
      .single();

    if (error) {
      console.error("[POST /api/applications/[id]/archive]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
