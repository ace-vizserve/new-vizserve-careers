/**
 * Renders page 1 of a PDF URL to a PNG Blob in the browser.
 *
 * pdfjs-dist is a browser-first library — running it in Node serverless with
 * Turbopack is a minefield of worker / cmap / path issues. Running it in the
 * browser (where it was designed to run) is trivial: the worker loads from a
 * CDN, the page renders to a <canvas>, and we hand the PNG to our API.
 *
 * The PDF is fetched by the browser directly from the public Supabase bucket.
 */

// Lazy-import pdfjs so it's only pulled into the client bundle when
// actually needed, and only once per session.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Point the worker at a CDN build matching this exact pdfjs version.
      // No bundling involved — the browser loads it like any other script.
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

/**
 * Downloads a PDF from `pdfUrl`, renders its first page at 2x scale, and
 * resolves to a PNG Blob suitable for POSTing as multipart form data.
 *
 * Throws on any failure — the caller is responsible for treating errors as
 * "give up and show initials".
 */
export async function renderResumePageOneToPng(pdfUrl: string): Promise<Blob> {
  const pdfjs = await getPdfjs();

  // Fetch as ArrayBuffer so pdfjs doesn't try its own CORS-sensitive fetch.
  const res = await fetch(pdfUrl);
  if (!res.ok) {
    throw new Error(`resume fetch ${res.status}`);
  }
  const data = await res.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    // 2x scale gives Roboflow enough pixels for small avatar photos.
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("canvas 2d context unavailable");
    }

    await page.render({
      canvasContext: context,
      viewport,
      // pdfjs v5 requires a canvas reference on RenderParameters; pass our
      // own HTMLCanvasElement to keep it happy in strict typing.
      canvas,
    }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (!blob) {
      throw new Error("canvas.toBlob returned null");
    }
    return blob;
  } finally {
    await pdf.cleanup();
    await pdf.destroy();
  }
}
