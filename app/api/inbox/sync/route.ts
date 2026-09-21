import { createClient } from "@/lib/server";
import { syncInbox } from "@/lib/imap";
import { NextResponse } from "next/server";
import { hasAppAccess } from "@/lib/app-access";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !hasAppAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional deeper sweep — used to reach back far enough to backfill
    // attachments onto messages that synced before they were stored.
    const body = await req.json().catch(() => ({}));
    const requested = Number(body?.limit);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const result = await syncInbox(limit);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/inbox/sync]", err);
    return NextResponse.json(
      { error: "Sync failed", details: err.message },
      { status: 500 },
    );
  }
}
