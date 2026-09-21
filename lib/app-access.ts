/**
 * One Supabase Auth project backs several VizServe apps, so being able to sign
 * in proves nothing about *which* app you belong to. Every account allowed into
 * this dashboard is tagged in `raw_user_meta_data`:
 *
 *   { "app_access": "vizserve-ats" }          // or ["vizserve-ats", "other-app"]
 *
 * An account with no tag, or a tag for another app, is rejected everywhere —
 * login, the admin shell, and every API route.
 *
 * Kept free of server-only imports so client components can use it too.
 */
export const APP_ACCESS = "vizserve-ats";

type AppAccessCarrier =
  | { user_metadata?: { app_access?: unknown } | null }
  | null
  | undefined;

/** True when the account's metadata grants access to this app. */
export function hasAppAccess(user: AppAccessCarrier): boolean {
  const access = user?.user_metadata?.app_access;
  if (Array.isArray(access)) return access.includes(APP_ACCESS);
  return access === APP_ACCESS;
}

/** Shown wherever we turn an otherwise-valid login away. */
export const NO_APP_ACCESS_MESSAGE =
  "This account does not have access to the VizServe ATS.";
