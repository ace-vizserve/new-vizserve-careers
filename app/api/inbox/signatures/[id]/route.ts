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
    const { name, body, body_html } = await req.json();

    const admin = createAdminClient();
    const { error } = await admin
      .from("inbox_signatures")
      .update({
        name: name?.trim(),
        body: typeof body === "string" ? body : undefined,
        body_html: typeof body_html === "string" ? body_html : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/inbox/signatures/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update signature", details: err.message },
      { status: 500 },
    );
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

    // If we're deleting the active signature, promote another one to active.
    const { data: target } = await admin
      .from("inbox_signatures")
      .select("is_active")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await admin
      .from("inbox_signatures")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    if (target?.is_active) {
      const { data: next } = await admin
        .from("inbox_signatures")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (next) {
        await admin
          .from("inbox_signatures")
          .update({ is_active: true })
          .eq("id", next.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/inbox/signatures/[id]]", err);
    return NextResponse.json(
      { error: "Failed to delete signature", details: err.message },
      { status: 500 },
    );
  }
}
