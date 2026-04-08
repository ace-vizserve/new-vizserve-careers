import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: true };
  return { supabase, user, error: false };
}

// GET all jobs (admin sees both active + inactive)
export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error: dbError } = await supabase!
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST create new job
export async function POST(req: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error: dbError } = await supabase!
    .from("jobs")
    .insert(sanitizeJob(body))
    .select("id")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

function sanitizeJob(body: any) {
  return {
    position_name:    String(body.position_name    ?? "").trim(),
    description:      String(body.description      ?? "").trim(),
    location:         String(body.location         ?? "").trim(),
    city:             String(body.city             ?? "").trim(),
    state:            String(body.state            ?? "").trim(),
    country:          String(body.country          ?? "").trim(),
    employment_type:  String(body.employment_type  ?? "Full-Time").trim(),
    contract_details: String(body.contract_details ?? "").trim(),
    is_remote:        Boolean(body.is_remote),
    salary_min:       body.salary_min ? Number(body.salary_min) : null,
    salary_max:       body.salary_max ? Number(body.salary_max) : null,
    currency:         String(body.currency         ?? "SGD").trim(),
    frequency:        String(body.frequency        ?? "month").trim(),
    requirements:     Array.isArray(body.requirements) ? body.requirements : [],
    benefits:         Array.isArray(body.benefits)      ? body.benefits      : [],
    urgently_hiring:  Boolean(body.urgently_hiring),
    easily_apply:     body.easily_apply !== false,
    org_name:         String(body.org_name         ?? "VizServe").trim(),
    org_logo:         String(body.org_logo         ?? "/assets/VizServeWhite.png").trim(),
    org_website:      String(body.org_website      ?? "https://vizserve.com").trim(),
    is_active:        body.is_active !== false,
  };
}