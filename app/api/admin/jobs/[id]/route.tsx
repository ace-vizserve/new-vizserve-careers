import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: true };
  return { supabase, error: false };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error: dbError } = await supabase!.from("jobs").select("*").eq("id", id).single();
  if (dbError || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { id: _id, created_at: _ca, updated_at: _ua, ...body } = await req.json();

  const { data, error: dbError } = await supabase!
    .from("jobs")
    .update(body)
    .eq("id", id)
    .select("id")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error: dbError } = await supabase!.from("jobs").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}