// Client-side image downscale + recompress.
// Returns a data URL that's safe to ship over Vercel's 4.5MB serverless body limit
// and small enough to live happily in Redis.

const MAX_DIM = 2048;
const JPEG_QUALITY = 0.88;
const TARGET_BYTES = 1.8 * 1024 * 1024; // ~1.8MB cap on the data URL

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target?.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function compressForUpload(
  file: File
): Promise<{ dataUrl: string; width: number; height: number; bytes: number }> {
  const original = await readAsDataURL(file);
  const img = await loadImage(original);

  let { width: w, height: h } = img;
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = MAX_DIM / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unsupported");
  ctx.drawImage(img, 0, 0, w, h);

  // PNG keeps transparency, JPEG for photographic content.
  const isPng = file.type === "image/png";
  let mime: "image/png" | "image/jpeg" = isPng ? "image/png" : "image/jpeg";
  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL(mime, quality);

  // If still too big (huge PNG with no transparency benefits), fall back to JPEG and step down quality.
  if (dataUrl.length > TARGET_BYTES) {
    mime = "image/jpeg";
    while (dataUrl.length > TARGET_BYTES && quality > 0.5) {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
      quality -= 0.08;
    }
  }

  return { dataUrl, width: w, height: h, bytes: dataUrl.length };
}
