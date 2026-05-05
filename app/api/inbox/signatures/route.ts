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
      .from("inbox_signatures")
      .select("id, name, body, body_html, is_active, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ signatures: data ?? [] });
  } catch (err: any) {
    console.error("[GET /api/inbox/signatures]", err);
    return NextResponse.json(
      { error: "Failed to load signatures", details: err.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, body, body_html } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // If this is the user's first signature, mark it active automatically.
    const { count } = await admin
      .from("inbox_signatures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data, error } = await admin
      .from("inbox_signatures")
      .insert({
        user_id: user.id,
        name: name.trim(),
        body: typeof body === "string" ? body : "",
        body_html: typeof body_html === "string" ? body_html : null,
        is_active: (count ?? 0) === 0,
      })
      .select("id, name, body, body_html, is_active, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ signature: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/inbox/signatures]", err);
    return NextResponse.json(
      { error: "Failed to create signature", details: err.message },
      { status: 500 },
    );
  }
}
