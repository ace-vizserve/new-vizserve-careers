import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("inbox_drafts")
      .select("id, application_id, to_address, subject, body, body_html, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ draft: data });
  } catch (err: any) {
    console.error("[GET /api/inbox/drafts/[id]]", err);
    return NextResponse.json({ error: "Failed to load draft", details: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { to, subject, body, bodyHtml, applicationId } = await req.json();

    const admin = createAdminClient();
    const { error } = await admin
      .from("inbox_drafts")
      .update({
        to_address: to ?? "",
        subject: subject ?? "",
        body: body ?? "",
        body_html: bodyHtml ?? null,
        application_id: applicationId ? Number(applicationId) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/inbox/drafts/[id]]", err);
    return NextResponse.json({ error: "Failed to update draft", details: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin
      .from("inbox_drafts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/inbox/drafts/[id]]", err);
    return NextResponse.json({ error: "Failed to delete draft", details: err.message }, { status: 500 });
  }
}
