/**
 * Thin Microsoft Graph helper for the recruiting inbox.
 *
 * Uses app-only auth (client credentials flow) so we send mail
 * as the shared mailbox without any user being signed in.
 *
 * Env vars required:
 *   MS_GRAPH_TENANT_ID
 *   MS_GRAPH_CLIENT_ID
 *   MS_GRAPH_CLIENT_SECRET
 *   MS_GRAPH_MAILBOX_UPN  (e.g. careers@vizserve.com)
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Re-use the cached token if it's still valid for at least 60 more seconds.
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.value;
  }

  const tenantId = process.env.MS_GRAPH_TENANT_ID!;
  const clientId = process.env.MS_GRAPH_CLIENT_ID!;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET!;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph token request failed (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
  /** Defaults to plain text. Set to "HTML" for rich content. */
  contentType?: "Text" | "HTML";
}

export async function sendMail({ to, subject, body, contentType = "Text" }: SendMailInput) {
  const token = await getAccessToken();
  const mailbox = process.env.MS_GRAPH_MAILBOX_UPN!;

  const res = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(mailbox)}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType, content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph sendMail failed (${res.status}): ${errText}`);
  }
}
