import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";

/**
 * Temporary diagnostic — verifies the configured mailbox UPN is
 * actually resolvable via Microsoft Graph, and lists a few real
 * users from the tenant so we can compare against what's expected.
 *
 * Hit it at: GET /api/inbox/diagnose  (admin only)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q")?.trim();

  const tenantId = process.env.MS_GRAPH_TENANT_ID!;
  const clientId = process.env.MS_GRAPH_CLIENT_ID!;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET!;
  const mailbox = process.env.MS_GRAPH_MAILBOX_UPN!;

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      },
    );
    if (!tokenRes.ok) {
      return NextResponse.json(
        { step: "token", ok: false, error: await tokenRes.text() },
        { status: 500 },
      );
    }
    const { access_token } = await tokenRes.json();

    const lookupRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    const lookupBody = await lookupRes.json().catch(() => ({}));

    // If ?q= is provided, search for users matching it (in UPN, displayName, or mail).
    // Otherwise return the first 25 users alphabetically.
    const listUrl = search
      ? `https://graph.microsoft.com/v1.0/users?$select=userPrincipalName,displayName,mail&$top=25&$filter=${encodeURIComponent(
          `startswith(userPrincipalName,'${search}') or startswith(displayName,'${search}') or startswith(mail,'${search}')`,
        )}`
      : "https://graph.microsoft.com/v1.0/users?$select=userPrincipalName,displayName,mail&$top=25";

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const listBody = await listRes.json().catch(() => ({}));

    return NextResponse.json({
      configured_mailbox_upn: mailbox,
      direct_user_lookup: {
        status: lookupRes.status,
        ok: lookupRes.ok,
        body: lookupBody,
      },
      tenant_users_sample: {
        status: listRes.status,
        users: listBody.value ?? listBody,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
