import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

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
    const { name, subject, body, body_html } = await req.json();

    const admin = createAdminClient();
    const { error } = await admin
      .from("inbox_templates")
      .update({
        name: name?.trim(),
        subject: typeof subject === "string" ? subject : undefined,
        body: typeof body === "string" ? body : undefined,
        body_html: typeof body_html === "string" ? body_html : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/inbox/templates/[id]]", err);
    return NextResponse.json({ error: "Failed to update template", details: err.message }, { status: 500 });
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
      .from("inbox_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/inbox/templates/[id]]", err);
    return NextResponse.json({ error: "Failed to delete template", details: err.message }, { status: 500 });
  }
}
