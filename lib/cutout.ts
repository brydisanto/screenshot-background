// Background removal for flat-color NFT images (GVC and friends).
// Samples the four corners to determine the background color, then knocks
// it out across the whole image with a small feather threshold so edges
// don't look harsh.

const CORE_TOLERANCE = 28;   // distance below which pixel is fully transparent
const FEATHER_TOLERANCE = 56; // distance above which pixel is fully opaque

function loadCrossOriginImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function cutOutBackground(imageUrl: string): Promise<string> {
  const img = await loadCrossOriginImage(imageUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unsupported");
  ctx.drawImage(img, 0, 0);

  // Sample the four corners for the bg color, take median to dodge stray AA pixels
  const cornerData = [
    ctx.getImageData(0, 0, 1, 1).data,
    ctx.getImageData(w - 1, 0, 1, 1).data,
    ctx.getImageData(0, h - 1, 1, 1).data,
    ctx.getImageData(w - 1, h - 1, 1, 1).data,
  ];
  const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[2];
  const bgR = median([cornerData[0][0], cornerData[1][0], cornerData[2][0], cornerData[3][0]]);
  const bgG = median([cornerData[0][1], cornerData[1][1], cornerData[2][1], cornerData[3][1]]);
  const bgB = median([cornerData[0][2], cornerData[1][2], cornerData[2][2], cornerData[3][2]]);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < CORE_TOLERANCE) {
      data[i + 3] = 0;
    } else if (dist < FEATHER_TOLERANCE) {
      const t = (dist - CORE_TOLERANCE) / (FEATHER_TOLERANCE - CORE_TOLERANCE);
      data[i + 3] = Math.round(data[i + 3] * t);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}
