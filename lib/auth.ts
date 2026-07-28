import { hasAppAccess } from "@/lib/app-access";
import { createClient } from "@/lib/server";

export type Role = "superadmin" | "hr" | "guest";

export interface SessionProfile {
  userId: string;
  email: string;
  role: Role;
  displayName: string | null;
  mailboxUpn: string | null;
}

/**
 * Resolves the signed-in user together with their profile row.
 * Returns null when there is no session, the account is not tagged for this
 * app, there is no profile row, or the account has been disabled.
 *
 * Reads through the regular (cookie-scoped) server client, so the
 * "read own profile" RLS policy is what makes the lookup work.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasAppAccess(user)) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, display_name, mailbox_upn, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? "",
    role: profile.role as Role,
    displayName: profile.display_name ?? null,
    mailboxUpn: profile.mailbox_upn ?? null,
  };
}

export type RoleCheck =
  | { ok: true; session: SessionProfile }
  | { ok: false; status: 401 | 403; error: string };

/**
 * API-route guard. Use at the top of a route handler:
 *
 *   const guard = await requireRole("superadmin");
 *   if (!guard.ok)
 *     return NextResponse.json({ error: guard.error }, { status: guard.status });
 *
 * 401 = not signed in / no profile; 403 = signed in but wrong role.
 */
export async function requireRole(...roles: Role[]): Promise<RoleCheck> {
  const session = await getSessionProfile();
  if (!session) return { ok: false, status: 401, error: "Unauthorized" };
  if (!roles.includes(session.role)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, session };
}
