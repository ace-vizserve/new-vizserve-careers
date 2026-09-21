import { createClient } from "@/lib/server";
import { createAdminClient } from "@/lib/server-admin";
import { ATTACHMENT_BUCKET, currentMailboxAddress } from "@/lib/imap";
import { NextResponse } from "next/server";
import { hasAppAccess } from "@/lib/app-access";

/**
 * Streams one attachment back to the browser.
 *
 * The bucket is private, so bytes are proxied through here rather than
 * handed out as a public URL. Inline images in message bodies point at
 * this route too — a same-origin <img> sends the session cookie, so the
 * auth check below covers both the download chip and the inline render.
 *
 * `?download=1` forces a save dialog; without it the browser renders
 * inline where it can (images, PDFs).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !hasAppAccess(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attachmentId } = await params;
    const admin = createAdminClient();

    const { data: attachment, error } = await admin
      .from("inbox_attachments")
      .select("filename, content_type, storage_path, message_id")
      .eq("id", attachmentId)
      .maybeSingle();

    if (error) throw error;
    if (!attachment || !attachment.storage_path) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Check the owning message separately rather than as an embedded join, so
    // this doesn't depend on PostgREST having the relationship cached. An
    // attachment must never be served from a mailbox this server isn't
    // currently configured for.
    const { data: owner } = await admin
      .from("inbox_messages")
      .select("id")
      .eq("id", attachment.message_id)
      .eq("mailbox_address", currentMailboxAddress())
      .maybeSingle();

    if (!owner) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const { data: file, error: dlErr } = await admin.storage
      .from(ATTACHMENT_BUCKET)
      .download(attachment.storage_path);
    if (dlErr || !file) {
      return NextResponse.json({ error: "Attachment file missing" }, { status: 404 });
    }

    const forceDownload = new URL(req.url).searchParams.get("download") === "1";
    const disposition = forceDownload ? "attachment" : "inline";

    return new NextResponse(file.stream(), {
      headers: {
        "Content-Type": attachment.content_type || "application/octet-stream",
        "Content-Disposition":
          `${disposition}; filename="${attachment.filename.replace(/"/g, "")}"; ` +
          `filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        // Private cache only — this is candidate data behind auth.
        "Cache-Control": "private, max-age=3600",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/inbox/attachments/[id]]", err);
    return NextResponse.json(
      { error: "Failed to load attachment", details: err.message },
      { status: 500 },
    );
  }
}
