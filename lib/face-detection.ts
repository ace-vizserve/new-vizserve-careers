import sharp from "sharp";

/**
 * Roboflow serverless inference response shape.
 * Roboflow returns detections with center-based (x, y) coordinates.
 */
interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  image: { width: number; height: number };
}

const ROBOFLOW_ENDPOINT =
  "https://serverless.roboflow.com/face-id-recognition-resume/1";

// Skip detections below this confidence — better to show initials than a false positive.
const MIN_CONFIDENCE = 0.4;

// Padding around the detected face (15% on each side) so we don't crop the forehead/chin.
const CROP_PADDING = 0.15;

export interface DetectFaceResult {
  /** The cropped face as a JPEG buffer, or null if no face was found. */
  buffer: Buffer | null;
  /** Reason for null result, for logging. */
  reason?: string;
}

/**
 * Takes a PNG/JPEG page image (rendered in the browser from the resume PDF),
 * runs Roboflow face detection, and returns a cropped 256x256 JPEG of the
 * highest-confidence face.
 *
 * Returns `{ buffer: null }` (never throws) if anything goes wrong or no
 * face is found — callers should treat null as "show initials".
 *
 * This function is deliberately PDF-unaware: the browser handles PDF → PNG
 * rendering (where pdfjs-dist is happy to run) and uploads the image here.
 * That keeps the server path free of pdfjs / canvas / worker issues.
 */
export async function detectFaceFromImage(
  pageImage: Buffer
): Promise<DetectFaceResult> {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    return { buffer: null, reason: "ROBOFLOW_API_KEY not set" };
  }

  try {
    // 1. POST to Roboflow serverless
    const base64 = pageImage.toString("base64");
    const rfRes = await fetch(`${ROBOFLOW_ENDPOINT}?api_key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: base64,
    });
    if (!rfRes.ok) {
      return { buffer: null, reason: `roboflow ${rfRes.status}` };
    }
    const data = (await rfRes.json()) as RoboflowResponse;

    // 2. Pick highest-confidence prediction above threshold
    const best = (data.predictions ?? [])
      .filter((p) => p.confidence >= MIN_CONFIDENCE)
      .sort((a, b) => b.confidence - a.confidence)[0];
    if (!best) {
      return { buffer: null, reason: "no face detected" };
    }

    // 3. Convert center-based coords → top-left, add padding, clamp to image bounds
    const padX = best.width * CROP_PADDING;
    const padY = best.height * CROP_PADDING;
    const left = Math.max(0, Math.round(best.x - best.width / 2 - padX));
    const top = Math.max(0, Math.round(best.y - best.height / 2 - padY));
    const width = Math.min(
      data.image.width - left,
      Math.round(best.width + padX * 2)
    );
    const height = Math.min(
      data.image.height - top,
      Math.round(best.height + padY * 2)
    );

    if (width <= 0 || height <= 0) {
      return { buffer: null, reason: "invalid crop region" };
    }

    // 4. Crop with sharp, resize to 256x256 thumbnail, JPEG
    const cropped = await sharp(pageImage)
      .extract({ left, top, width, height })
      .resize(256, 256, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();

    return { buffer: cropped };
  } catch (err) {
    return {
      buffer: null,
      reason: `exception: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
