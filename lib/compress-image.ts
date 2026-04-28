// Client-side image downscale + recompress.
// Returns a data URL that's safe to ship over Vercel's 4.5MB serverless body limit
// and small enough to live happily in Redis.

const MAX_DIM = 2048;
const WEBP_QUALITY = 0.85;
const JPEG_QUALITY = 0.88;
const TARGET_BYTES = 1.8 * 1024 * 1024;

let webpSupport: boolean | null = null;
function supportsWebpEncoding(): boolean {
  if (webpSupport !== null) return webpSupport;
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  webpSupport = c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  return webpSupport;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
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

interface EncodeResult {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: "webp" | "jpeg" | "png";
}

function encodeFromImage(img: HTMLImageElement, sourceIsPng: boolean): EncodeResult {
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

  const useWebp = supportsWebpEncoding();
  let mime: "image/webp" | "image/jpeg" | "image/png";
  let quality: number;
  if (useWebp) {
    mime = "image/webp";
    quality = WEBP_QUALITY;
  } else if (sourceIsPng) {
    mime = "image/png";
    quality = 1.0;
  } else {
    mime = "image/jpeg";
    quality = JPEG_QUALITY;
  }
  let dataUrl = canvas.toDataURL(mime, quality);

  // Step quality down if still oversized
  if (dataUrl.length > TARGET_BYTES && (mime === "image/webp" || mime === "image/jpeg")) {
    let q = quality;
    while (dataUrl.length > TARGET_BYTES && q > 0.5) {
      q -= 0.08;
      dataUrl = canvas.toDataURL(mime, q);
    }
  }
  // PNG fallback that's still too large: hard switch to JPEG to make it fit
  if (dataUrl.length > TARGET_BYTES && mime === "image/png") {
    mime = "image/jpeg";
    let q = JPEG_QUALITY;
    dataUrl = canvas.toDataURL("image/jpeg", q);
    while (dataUrl.length > TARGET_BYTES && q > 0.5) {
      q -= 0.08;
      dataUrl = canvas.toDataURL("image/jpeg", q);
    }
  }

  return {
    dataUrl,
    width: w,
    height: h,
    bytes: dataUrl.length,
    format: mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpeg",
  };
}

export async function compressForUpload(file: File): Promise<EncodeResult> {
  const original = await readAsDataURL(file);
  const img = await loadImage(original);
  return encodeFromImage(img, file.type === "image/png");
}

// Re-encode an existing data URL (e.g. legacy JPEG) to the current preferred format.
// Returns null if the URL is not a data URL or recompression doesn't help.
export async function recompressDataUrl(
  url: string
): Promise<{ dataUrl: string; bytesBefore: number; bytesAfter: number; format: "webp" | "jpeg" | "png" } | null> {
  if (!url.startsWith("data:image/")) return null;
  const bytesBefore = url.length;
  const img = await loadImage(url);
  const sourceIsPng = url.startsWith("data:image/png");
  const result = encodeFromImage(img, sourceIsPng);
  // Only return if we actually saved bytes
  if (result.bytes >= bytesBefore) return null;
  return {
    dataUrl: result.dataUrl,
    bytesBefore,
    bytesAfter: result.bytes,
    format: result.format,
  };
}

export function isDataUrlImage(url: string | undefined): boolean {
  return !!url && url.startsWith("data:image/");
}

export function isWebpDataUrl(url: string): boolean {
  return url.startsWith("data:image/webp");
}
