import { NextResponse } from "next/server";

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("MS Graph credentials are not configured");
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ users: [] });
  }

  try {
    const token = await getGraphToken();
    const search = `"displayName:${q}" OR "mail:${q}" OR "userPrincipalName:${q}"`;
    const url =
      `https://graph.microsoft.com/v1.0/users` +
      `?$search=${encodeURIComponent(search)}` +
      `&$select=id,displayName,mail,userPrincipalName` +
      `&$top=10`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ConsistencyLevel: "eventual",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    const users = (data.value ?? [])
      .map((u: { id: string; displayName: string; mail?: string; userPrincipalName?: string }) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.mail || u.userPrincipalName || "",
      }))
      .filter((u: { email: string }) => !!u.email);

    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
