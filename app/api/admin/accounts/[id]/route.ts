import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/server-admin";
import { NextResponse } from "next/server";

const ROLES = ["superadmin", "hr", "guest"];

// PATCH — edit an account (name, mailbox, role, active state, password).
// Every field is optional; only the ones present are changed. Superadmin only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("superadmin");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const admin = createAdminClient();
  const { data: profile, error: lookupErr } = await admin
    .from("profiles")
    .select("user_id, role")
    .eq("id", id)
    .maybeSingle();
  if (lookupErr || !profile) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const isSelf = profile.user_id === guard.session.userId;
  const profileUpdate: Record<string, unknown> = {};

  if (typeof body.displayName === "string") {
    profileUpdate.display_name = body.displayName.trim() || null;
  }
  if (typeof body.mailboxUpn === "string") {
    profileUpdate.mailbox_upn = body.mailboxUpn.trim().toLowerCase() || null;
  }
  if (typeof body.role === "string") {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (isSelf && body.role !== profile.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }
    profileUpdate.role = body.role;
  }
  if (typeof body.isActive === "boolean") {
    if (isSelf && !body.isActive) {
      return NextResponse.json(
        { error: "You cannot disable your own account" },
        { status: 400 },
      );
    }
    profileUpdate.is_active = body.isActive;
  }

  // Optional password reset.
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    const { error: pwErr } = await admin.auth.admin.updateUserById(profile.user_id, {
      password: body.password,
    });
    if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 400 });
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error: updErr } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  // Keep the auth-level ban in sync with is_active — a disabled profile
  // alone wouldn't stop an existing session.
  if (typeof body.isActive === "boolean") {
    await admin.auth.admin.updateUserById(profile.user_id, {
      ban_duration: body.isActive ? "none" : "876000h",
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE — permanently remove an account. Superadmin only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("superadmin");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile, error: lookupErr } = await admin
    .from("profiles")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (lookupErr || !profile) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (profile.user_id === guard.session.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  // Deleting the auth user cascades to the profile row (FK on delete cascade).
  const { error: delErr } = await admin.auth.admin.deleteUser(profile.user_id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
