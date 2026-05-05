import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("inbox_templates")
      .select("id, name, subject, body, body_html, created_by, updated_at")
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ templates: data ?? [] });
  } catch (err: any) {
    console.error("[GET /api/inbox/templates]", err);
    return NextResponse.json({ error: "Failed to load templates", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, subject, body, body_html } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("inbox_templates")
      .insert({
        name: name.trim(),
        subject: subject ?? "",
        body: body ?? "",
        body_html: body_html ?? null,
        created_by: user.id,
      })
      .select("id, name, subject, body, body_html, created_by, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/inbox/templates]", err);
    return NextResponse.json({ error: "Failed to create template", details: err.message }, { status: 500 });
  }
}
