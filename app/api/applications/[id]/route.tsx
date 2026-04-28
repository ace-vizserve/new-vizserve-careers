import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
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

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const allowed = [
      "status",
      "drop_reason",
      "drop_details",
      "archive_reason",
      "archive_details",
      "is_pooled",
    ];
    const update = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );

    const { data, error } = await supabase
      .from("applications")
      .update(update)
      .eq("id", id)
      .select("id, status, drop_reason, drop_details, archive_reason, archive_details, is_pooled")
      .single();

    if (error) {
      console.error("[PATCH /api/applications]", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Hard-delete is intentionally not exposed via HTTP. Archived rows are
// retained indefinitely; use /archive (requires a reason) and /unarchive
// to move applications in and out of the archive.