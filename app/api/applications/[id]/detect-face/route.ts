import { createClient } from "@/lib/server";
import { NextResponse } from "next/server";
import { detectFaceFromImage } from "@/lib/face-detection";

// Force Node.js runtime — sharp is a native module.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Face thumbnails live inside the existing resume bucket under a `faces/`
// folder, so we don't need a second bucket or separate RLS policies.
const FACE_BUCKET = "candidate-resume";
const FACE_FOLDER = "faces";

/**
 * Runs Roboflow face detection on a PNG rendered **in the browser** from
 * the applicant's resume PDF (client-side rendering avoids all pdfjs-in-Node
 * headaches). Expects multipart/form-data with a `page_image` file field.
 *
 * Uploads the cropped face to the `candidate-faces` bucket and saves the
 * public URL to `applications.face_image_url`. Idempotent: if the face is
 * already set, returns it without re-running detection.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load the application row
    const { data: app, error: fetchError } = await supabase
      .from("applications")
      .select("id, face_image_url")
      .eq("id", id)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Already has a face → return existing URL, don't burn Roboflow credits
    if (app.face_image_url) {
      return NextResponse.json({ face_image_url: app.face_image_url, cached: true });
    }

    // Expect the client to have rendered page 1 of the PDF and uploaded it
    const formData = await req.formData();
    const imageFile = formData.get("page_image");
    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { face_image_url: null, reason: "no page_image in form data" },
        { status: 400 }
      );
    }

    const pageImage = Buffer.from(await imageFile.arrayBuffer());

    const result = await detectFaceFromImage(pageImage);
    if (!result.buffer) {
      console.log(`[detect-face] app ${id}: ${result.reason}`);
      return NextResponse.json({ face_image_url: null, reason: result.reason });
    }

    // Upload the cropped JPEG under `faces/<app_id>-<timestamp>.jpg`
    const filename = `${FACE_FOLDER}/${id}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(FACE_BUCKET)
      .upload(filename, result.buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[detect-face] app ${id} upload error:`, uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload face image", details: uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(FACE_BUCKET).getPublicUrl(filename);

    // Persist to the application row
    const { error: updateError } = await supabase
      .from("applications")
      .update({ face_image_url: publicUrl })
      .eq("id", id);

    if (updateError) {
      console.error(`[detect-face] app ${id} update error:`, updateError.message);
      return NextResponse.json(
        { error: "Failed to save face URL", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ face_image_url: publicUrl, cached: false });
  } catch (err: any) {
    console.error("[detect-face] unexpected error:", err);
    return NextResponse.json(
      { error: "Detection failed", details: err?.message },
      { status: 500 }
    );
  }
}
