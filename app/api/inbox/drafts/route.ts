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
      .from("inbox_drafts")
      .select("id, application_id, to_address, subject, body, body_html, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ drafts: data ?? [] });
  } catch (err: any) {
    console.error("[GET /api/inbox/drafts]", err);
    return NextResponse.json({ error: "Failed to load drafts", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, body, bodyHtml, applicationId } = await req.json();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("inbox_drafts")
      .insert({
        user_id: user.id,
        application_id: applicationId ? Number(applicationId) : null,
        to_address: to ?? "",
        subject: subject ?? "",
        body: body ?? "",
        body_html: bodyHtml ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/inbox/drafts]", err);
    return NextResponse.json({ error: "Failed to save draft", details: err.message }, { status: 500 });
  }
}
