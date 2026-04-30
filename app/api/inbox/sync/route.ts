import { createClient } from "@/lib/server";
import { syncInbox } from "@/lib/imap";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncInbox(50);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/inbox/sync]", err);
    return NextResponse.json(
      { error: "Sync failed", details: err.message },
      { status: 500 },
    );
  }
}
