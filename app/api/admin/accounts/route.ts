import { APP_ACCESS } from "@/lib/app-access";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

const ACCOUNT_FIELDS =
  "id, user_id, email, display_name, role, mailbox_upn, is_active, created_at";

// GET — list every account. Superadmin only.
export async function GET() {
  const guard = await requireRole("superadmin");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(ACCOUNT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

// POST — create a new HR account. Superadmin only.
export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim();
  const mailboxUpn = String(body.mailboxUpn ?? "").trim().toLowerCase();
  // The UI creates guest or HR accounts; superadmin stays manual.
  const role = body.role === "hr" ? "hr" : "guest";

  if (!email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Create the Supabase Auth user. The app_access tag is what lets the account
  // through the login / route guards — an account created without it is inert.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, app_access: APP_ACCESS },
  });
  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Failed to create user" },
      { status: 400 },
    );
  }

  // Insert the matching profile row.
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .insert({
      user_id: created.user.id,
      email,
      display_name: displayName || null,
      role,
      mailbox_upn: mailboxUpn || null,
      created_by: guard.session.userId,
    })
    .select(ACCOUNT_FIELDS)
    .single();

  if (profileErr) {
    // Roll back the auth user so we never leave a login with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ account: profile }, { status: 201 });
}
