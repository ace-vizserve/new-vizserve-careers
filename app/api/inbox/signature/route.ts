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
      .select("body")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ body: data?.body ?? "" });
  } catch (err: any) {
    console.error("[GET /api/inbox/signature]", err);
    return NextResponse.json(
      { error: "Failed to load signature", details: err.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { body } = await req.json();
    const admin = createAdminClient();

    const { error } = await admin
      .from("inbox_signatures")
      .upsert({
        user_id: user.id,
        body: typeof body === "string" ? body : "",
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/inbox/signature]", err);
    return NextResponse.json(
      { error: "Failed to save signature", details: err.message },
      { status: 500 },
    );
  }
}
