import { createClient } from "@/lib/server";
import { sendMail } from "@/lib/mailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, body } = await req.json();

    if (!to?.trim() || !subject?.trim() || !body?.trim()) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 },
      );
    }

    await sendMail({ to, subject, body });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/inbox/send]", err);
    return NextResponse.json(
      { error: "Failed to send email", details: err.message },
      { status: 500 },
    );
  }
}
