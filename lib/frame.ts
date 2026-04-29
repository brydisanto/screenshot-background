import { apiUrl } from "./base-url";

export type Stop = { color: string; pos: number };

export type Bg =
  | { kind: "linear"; angle: number; stops: Stop[] }
  | { kind: "radial"; stops: Stop[] }
  | { kind: "solid"; color: string }
  | { kind: "gridDark" }
  | { kind: "image"; url: string; mode: "cover" | "tile" };

export interface Effects {
  glowColor: string | null;
  glowIntensity: number;
  reflection: boolean;
  reflectionIntensity: number;
  stroke: boolean;
  strokeColor: string;
  tilt: number;
  stack: number;
}

export type Mode = "single" | "multi";

export interface Shot {
  id: string;
  src: string;
  dims: { w: number; h: number };
  // Multi-mode placement (normalized 0-1 of canvas):
  x: number;
  y: number;
  scale: number;     // multiplier on base size (1 = ~36% of canvas width)
  rotation: number;  // degrees
  title?: string;    // per-shot chrome title (multi mode)
}

export interface FrameParams {
  mode: Mode;
  bg: Bg;
  padding: number;
  radius: number;
  shadow: number;
  chromeOn: boolean;
  chromeTitle: string;
  aspect: string;
  effects: Effects;
}

export const MAX_SHOTS = 5;
export const SHOT_BASE_FRACTION = 0.36; // shot.scale = 1 → ~36% of canvas width

export interface Preset {
  id: string;
  name: string;
  swatch: string;
  bg: Bg;
  custom?: boolean;
}

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: "vibetown",
    name: "Vibetown",
    swatch: "linear-gradient(135deg,#FFE048,#FF5F1F)",
    bg: { kind: "linear", angle: 135, stops: [{ color: "#FFE048", pos: 0 }, { color: "#FF5F1F", pos: 1 }] },
  },
  {
    id: "midnight",
    name: "Midnight",
    swatch: "radial-gradient(circle,#1F1F1F,#050505)",
    bg: { kind: "radial", stops: [{ color: "#1F1F1F", pos: 0 }, { color: "#050505", pos: 1 }] },
  },
  {
    id: "sunset",
    name: "Sunset",
    swatch: "linear-gradient(135deg,#FF6B9D,#FF5F1F)",
    bg: { kind: "linear", angle: 135, stops: [{ color: "#FF6B9D", pos: 0 }, { color: "#FF5F1F", pos: 1 }] },
  },
  {
    id: "mint",
    name: "Mint Vibe",
    swatch: "linear-gradient(135deg,#2EFF2E,#FFE048)",
    bg: { kind: "linear", angle: 135, stops: [{ color: "#2EFF2E", pos: 0 }, { color: "#FFE048", pos: 1 }] },
  },
  {
    id: "pinkpop",
    name: "Pink Pop",
    swatch: "linear-gradient(135deg,#FF6B9D,#FFE048)",
    bg: { kind: "linear", angle: 135, stops: [{ color: "#FF6B9D", pos: 0 }, { color: "#FFE048", pos: 1 }] },
  },
  {
    id: "deepsea",
    name: "Deep Sea",
    swatch: "linear-gradient(135deg,#0E1F33,#FF6B9D)",
    bg: { kind: "linear", angle: 135, stops: [{ color: "#0E1F33", pos: 0 }, { color: "#FF6B9D", pos: 1 }] },
  },
  {
    id: "aurora",
    name: "Aurora",
    swatch: "linear-gradient(135deg,#7C3AED 0%,#3B82F6 35%,#06B6D4 70%,#A78BFA 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#7C3AED", pos: 0 },
        { color: "#3B82F6", pos: 0.35 },
        { color: "#06B6D4", pos: 0.7 },
        { color: "#A78BFA", pos: 1 },
      ],
    },
  },
  {
    id: "lava",
    name: "Lava",
    swatch: "linear-gradient(135deg,#3A0A0A 0%,#B91C1C 50%,#FBBF24 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#3A0A0A", pos: 0 },
        { color: "#B91C1C", pos: 0.5 },
        { color: "#FBBF24", pos: 1 },
      ],
    },
  },
  {
    id: "forest",
    name: "Forest",
    swatch: "linear-gradient(135deg,#052e16,#16a34a 60%,#FFE048)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#052e16", pos: 0 },
        { color: "#16a34a", pos: 0.6 },
        { color: "#FFE048", pos: 1 },
      ],
    },
  },
  {
    id: "vapor",
    name: "Vapor",
    swatch: "linear-gradient(135deg,#FF71CE 0%,#01CDFE 50%,#05FFA1 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#FF71CE", pos: 0 },
        { color: "#01CDFE", pos: 0.5 },
        { color: "#05FFA1", pos: 1 },
      ],
    },
  },
  {
    id: "plasma",
    name: "Plasma",
    swatch: "linear-gradient(135deg,#FF0080 0%,#7928CA 50%,#FF4D00 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#FF0080", pos: 0 },
        { color: "#7928CA", pos: 0.5 },
        { color: "#FF4D00", pos: 1 },
      ],
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    swatch: "linear-gradient(135deg,#0F2027 0%,#203A43 50%,#2C5364 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#0F2027", pos: 0 },
        { color: "#203A43", pos: 0.5 },
        { color: "#2C5364", pos: 1 },
      ],
    },
  },
  {
    id: "royal",
    name: "Royal",
    swatch: "linear-gradient(135deg,#2D1B69 0%,#6B21A8 55%,#FFE048 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#2D1B69", pos: 0 },
        { color: "#6B21A8", pos: 0.55 },
        { color: "#FFE048", pos: 1 },
      ],
    },
  },
  {
    id: "citrus",
    name: "Citrus",
    swatch: "linear-gradient(135deg,#FFE048 0%,#FB923C 50%,#EF4444 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#FFE048", pos: 0 },
        { color: "#FB923C", pos: 0.5 },
        { color: "#EF4444", pos: 1 },
      ],
    },
  },
  {
    id: "frost",
    name: "Frost",
    swatch: "linear-gradient(135deg,#E0F2FE 0%,#BAE6FD 50%,#7DD3FC 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#E0F2FE", pos: 0 },
        { color: "#BAE6FD", pos: 0.5 },
        { color: "#7DD3FC", pos: 1 },
      ],
    },
  },
  {
    id: "twilight",
    name: "Twilight",
    swatch: "linear-gradient(135deg,#0F172A 0%,#4C1D95 50%,#DB2777 100%)",
    bg: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#0F172A", pos: 0 },
        { color: "#4C1D95", pos: 0.5 },
        { color: "#DB2777", pos: 1 },
      ],
    },
  },
  {
    id: "carbon",
    name: "Carbon CLI",
    swatch: "#050505",
    bg: { kind: "gridDark" },
  },
  {
    id: "gold",
    name: "Solid Gold",
    swatch: "#FFE048",
    bg: { kind: "solid", color: "#FFE048" },
  },
  {
    id: "black",
    name: "Solid Black",
    swatch: "#050505",
    bg: { kind: "solid", color: "#050505" },
  },
  {
    id: "white",
    name: "Pure White",
    swatch: "#ffffff",
    bg: { kind: "solid", color: "#ffffff" },
  },
];

export const ASPECTS = [
  { id: "auto", label: "Auto", w: 0, h: 0 },
  { id: "16:9", label: "16:9", w: 16, h: 9 },
  { id: "4:3", label: "4:3", w: 4, h: 3 },
  { id: "1:1", label: "1:1", w: 1, h: 1 },
  { id: "9:16", label: "9:16", w: 9, h: 16 },
] as const;

export const DEFAULT_EFFECTS: Effects = {
  glowColor: null,
  glowIntensity: 50,
  reflection: false,
  reflectionIntensity: 30,
  stroke: false,
  strokeColor: "#FFE048",
  tilt: 0,
  stack: 0,
};

export function bgToCss(bg: Bg): string {
  if (bg.kind === "solid") return bg.color;
  if (bg.kind === "linear") {
    const stops = bg.stops.map((s) => `${s.color} ${s.pos * 100}%`).join(", ");
    return `linear-gradient(${bg.angle}deg, ${stops})`;
  }
  if (bg.kind === "radial") {
    const stops = bg.stops.map((s) => `${s.color} ${s.pos * 100}%`).join(", ");
    return `radial-gradient(circle at center, ${stops})`;
  }
  if (bg.kind === "gridDark") return "#050505";
  if (bg.kind === "image") return `url(${bg.url}) center/cover`;
  return "#050505";
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg: Bg,
  scale: number,
  bgImage?: HTMLImageElement | null
) {
  if (bg.kind === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "linear") {
    const rad = (bg.angle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const dx = (Math.cos(rad) * w) / 2;
    const dy = (Math.sin(rad) * h) / 2;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    bg.stops.forEach((s) => grad.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "radial") {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
    bg.stops.forEach((s) => grad.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "gridDark") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = Math.max(1, scale);
    const step = 80 * scale;
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
      ctx.stroke();
    }
    const grad = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.7);
    grad.addColorStop(0, "rgba(255, 224, 72, 0.20)");
    grad.addColorStop(1, "rgba(255, 224, 72, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (bg.kind === "image") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
    if (!bgImage || !bgImage.complete || bgImage.naturalWidth === 0) return;
    if (bg.mode === "tile") {
      const pat = ctx.createPattern(bgImage, "repeat");
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      const ia = bgImage.naturalWidth / bgImage.naturalHeight;
      const ca = w / h;
      let dw: number;
      let dh: number;
      if (ia > ca) {
        dh = h;
        dw = h * ia;
      } else {
        dw = w;
        dh = w / ia;
      }
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(bgImage, dx, dy, dw, dh);
    }
  }
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function computeCanvasDims(imgW: number, imgH: number, p: FrameParams) {
  const opt = ASPECTS.find((a) => a.id === p.aspect)!;
  const padPx = p.padding * 4;
  const chromeH = p.chromeOn ? 64 : 0;
  const TARGET = 1920;
  if (p.mode === "multi") {
    if (opt.id === "auto") return { w: TARGET, h: Math.round(TARGET / (16 / 9)) };
    return { w: TARGET, h: Math.round(TARGET / (opt.w / opt.h)) };
  }
  if (opt.id === "auto") {
    return { w: imgW + padPx * 2, h: imgH + padPx * 2 + chromeH };
  }
  return { w: TARGET, h: Math.round(TARGET / (opt.w / opt.h)) };
}

// Compute a shot's drawn rectangle in canvas pixel coords (no rotation applied)
export function shotRect(
  shot: Shot,
  canvasW: number,
  canvasH: number,
  chromeH: number
): { cx: number; cy: number; w: number; h: number } {
  const baseW = SHOT_BASE_FRACTION * canvasW * shot.scale;
  const aspect = shot.dims.w / shot.dims.h;
  const drawW = baseW;
  const drawH = baseW / aspect;
  const fullH = drawH + chromeH;
  return {
    cx: shot.x * canvasW,
    cy: shot.y * canvasH,
    w: drawW,
    h: fullH,
  };
}

// Hit test: returns the index of the topmost shot under (nx, ny) where nx/ny are normalized 0-1.
// Iterates back-to-front (later shots draw on top).
export function hitTestShot(
  shots: Shot[],
  nx: number,
  ny: number,
  canvasW: number,
  canvasH: number,
  chromeH: number
): number {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    const rect = shotRect(s, canvasW, canvasH, chromeH);
    // Transform point into shot's local coords (rotate by -rotation around center)
    const px = nx * canvasW - rect.cx;
    const py = ny * canvasH - rect.cy;
    const rad = (-s.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lx = px * cos - py * sin;
    const ly = px * sin + py * cos;
    if (Math.abs(lx) <= rect.w / 2 && Math.abs(ly) <= rect.h / 2) {
      return i;
    }
  }
  return -1;
}

export type Corner = "tl" | "tr" | "bl" | "br";

export const ROTATE_HANDLE_OFFSET = 38; // canvas-pixel distance from frame top edge to rotation handle center

// Rotation handle hit test. Returns true if (nx, ny) is within tolerance of the rotation handle
// (a small circle that hovers above the top edge of the selected shot, rotating with it).
export function hitTestHandle(
  shot: Shot,
  nx: number,
  ny: number,
  canvasW: number,
  canvasH: number,
  chromeH: number
): boolean {
  const baseW = SHOT_BASE_FRACTION * canvasW * shot.scale;
  const aspect = shot.dims.w / shot.dims.h;
  const drawH = baseW / aspect;
  const halfH = (drawH + chromeH) / 2;
  const offset = halfH + ROTATE_HANDLE_OFFSET;

  const cxP = shot.x * canvasW;
  const cyP = shot.y * canvasH;
  const theta = (shot.rotation * Math.PI) / 180;
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  // Local point (0, -offset) → world
  const hx = cxP + offset * sin;
  const hy = cyP - offset * cos;

  const mxP = nx * canvasW;
  const myP = ny * canvasH;
  const tol = Math.max(0.025 * canvasW, 18);
  return Math.hypot(mxP - hx, myP - hy) <= tol;
}

// Hit test for the 4 corner resize handles of a single shot.
// Returns the corner id if the point falls within tolerance of any corner, else null.
export function hitTestCorner(
  shot: Shot,
  nx: number,
  ny: number,
  canvasW: number,
  canvasH: number,
  chromeH: number
): Corner | null {
  const baseW = SHOT_BASE_FRACTION * canvasW * shot.scale;
  const aspect = shot.dims.w / shot.dims.h;
  const drawH = baseW / aspect;
  const halfW = baseW / 2;
  const halfH = (drawH + chromeH) / 2;

  const cxP = shot.x * canvasW;
  const cyP = shot.y * canvasH;
  const mxP = nx * canvasW;
  const myP = ny * canvasH;

  const theta = (shot.rotation * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const corners: Array<[Corner, number, number]> = [
    ["tl", -halfW, -halfH],
    ["tr", halfW, -halfH],
    ["bl", -halfW, halfH],
    ["br", halfW, halfH],
  ];

  // Tolerance scales with canvas width but stays clickable on small previews
  const tol = Math.max(0.025 * canvasW, 18);
  for (const [id, lx, ly] of corners) {
    const wx = lx * cos - ly * sin + cxP;
    const wy = lx * sin + ly * cos + cyP;
    if (Math.hypot(mxP - wx, myP - wy) <= tol) return id;
  }
  return null;
}


export type ShotWithImage = Shot & { img: HTMLImageElement };

interface DrawnFrame {
  ctx: CanvasRenderingContext2D;
  scale: number;
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
  drawX: number;       // image x within frame (after chrome)
  drawY: number;
  drawW: number;
  drawH: number;
  chromeH: number;
  radius: number;
  img: HTMLImageElement;
  title: string;
}

function drawSingleFrame(
  d: DrawnFrame,
  p: FrameParams,
  selected: boolean,
  highlightStrokeOverride?: boolean
) {
  const { ctx, frameX, frameY, frameW, frameH, drawX, drawY, drawW, drawH, chromeH, radius: r, img, title, scale } = d;

  // Stack: ghost copies behind the frame
  if (p.effects.stack > 0) {
    const layers = p.effects.stack;
    for (let i = layers; i > 0; i--) {
      const offset = i * 14 * scale;
      ctx.save();
      ctx.globalAlpha = 0.35 - i * 0.06;
      ctx.fillStyle = "#0c0c0c";
      roundedRectPath(ctx, frameX + offset, frameY - offset, frameW, frameH, r);
      ctx.fill();
      ctx.restore();
    }
  }

  // Drop shadow / glow
  if (p.shadow > 0 || p.effects.glowColor) {
    ctx.save();
    if (p.effects.glowColor) {
      const intensity = p.effects.glowIntensity / 100;
      ctx.shadowColor = withAlpha(p.effects.glowColor, 0.55 * intensity + 0.2);
      ctx.shadowBlur = (p.shadow > 0 ? p.shadow : 60) * 1.8 * scale * (0.6 + intensity * 0.6);
    } else {
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = p.shadow * 1.6 * scale;
      ctx.shadowOffsetY = p.shadow * 0.45 * scale;
    }
    ctx.fillStyle = "#0c0c0c";
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, r);
    ctx.fill();
    ctx.restore();
  }

  // Reflection
  if (p.effects.reflection) {
    ctx.save();
    const reflectionH = drawH * 0.5;
    const reflGrad = ctx.createLinearGradient(0, frameY + frameH, 0, frameY + frameH + reflectionH);
    const intensity = p.effects.reflectionIntensity / 100;
    reflGrad.addColorStop(0, `rgba(0,0,0,${0.55 * intensity})`);
    reflGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.translate(drawX, frameY + frameH);
    ctx.scale(1, -1);
    ctx.translate(-drawX, -(frameY + frameH));
    ctx.globalAlpha = 0.45 * intensity;
    ctx.drawImage(img, drawX, frameY + chromeH - drawH, drawW, drawH);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = reflGrad;
    ctx.fillRect(frameX, frameY + frameH, frameW, reflectionH);
    ctx.restore();
  }

  // Frame contents (clip to rounded box)
  ctx.save();
  roundedRectPath(ctx, frameX, frameY, frameW, frameH, r);
  ctx.clip();

  if (chromeH > 0) {
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(frameX, frameY, frameW, chromeH);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(frameX, frameY + chromeH - 1, frameW, 1);
    const dotR = 8 * scale;
    const dotY = frameY + chromeH / 2;
    const dotX0 = frameX + 26 * scale;
    const colors = ["#FF5F57", "#FEBC2E", "#28C840"];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(dotX0 + i * 22 * scale, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
    if (title) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const fontSize = 22 * scale;
      ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, frameX + frameW / 2, dotY);
    }
  }

  ctx.drawImage(img, drawX, frameY + chromeH, drawW, drawH);
  ctx.restore();

  // Inner stroke (after content)
  if (p.effects.stroke) {
    ctx.save();
    ctx.strokeStyle = withAlpha(p.effects.strokeColor, 0.7);
    ctx.lineWidth = 2 * scale;
    roundedRectPath(ctx, frameX + 1, frameY + 1, frameW - 2, frameH - 2, Math.max(0, r - 1));
    ctx.stroke();
    ctx.restore();
  }

  // Selection highlight + corner handles (preview only)
  if (selected || highlightStrokeOverride) {
    ctx.save();
    ctx.strokeStyle = "#FFE048";
    ctx.lineWidth = 3 * scale;
    ctx.setLineDash([8 * scale, 6 * scale]);
    roundedRectPath(ctx, frameX - 4 * scale, frameY - 4 * scale, frameW + 8 * scale, frameH + 8 * scale, r + 4 * scale);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.setLineDash([]);
    const hs = 14 * scale;
    const corners: Array<[number, number]> = [
      [frameX, frameY],
      [frameX + frameW, frameY],
      [frameX, frameY + frameH],
      [frameX + frameW, frameY + frameH],
    ];
    for (const [hx, hy] of corners) {
      ctx.fillStyle = "#FFE048";
      ctx.strokeStyle = "#050505";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
      ctx.fill();
      ctx.stroke();
    }

    // Rotation handle (stem + circle above top edge)
    const stemTopY = frameY - ROTATE_HANDLE_OFFSET * scale;
    const cxStem = frameX + frameW / 2;
    ctx.strokeStyle = "#FFE048";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(cxStem, frameY - 4 * scale);
    ctx.lineTo(cxStem, stemTopY + 8 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cxStem, stemTopY, 8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#FFE048";
    ctx.fill();
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    // Inner dot
    ctx.beginPath();
    ctx.arc(cxStem, stemTopY, 2.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#050505";
    ctx.fill();

    ctx.restore();
  }
}

export function paintFrame(
  canvas: HTMLCanvasElement,
  shots: ShotWithImage[],
  p: FrameParams,
  bgImage?: HTMLImageElement | null,
  maxPreviewWidth?: number,
  selectedId?: string | null
) {
  // Reference image for canvas auto-sizing in single mode
  const refDims =
    p.mode === "single" && shots[0]
      ? shots[0].dims
      : { w: 1920, h: Math.round(1920 / (16 / 9)) };

  const full = computeCanvasDims(refDims.w, refDims.h, p);
  let scale = 1;
  let cw = full.w;
  let ch = full.h;
  if (maxPreviewWidth && cw > maxPreviewWidth) {
    scale = maxPreviewWidth / cw;
    cw = Math.round(cw * scale);
    ch = Math.round(ch * scale);
  }
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, cw, ch);

  paintBackground(ctx, cw, ch, p.bg, scale, bgImage);

  if (shots.length === 0) return;

  const chromeH = (p.chromeOn ? 64 : 0) * scale;
  const r = p.radius * 2.5 * scale;

  if (p.mode === "single") {
    const shot = shots[0];
    const padPx = p.padding * 4 * scale;
    const availW = cw - padPx * 2;
    const availH = ch - padPx * 2 - chromeH;
    if (availW <= 0 || availH <= 0) return;
    const imgAspect = shot.dims.w / shot.dims.h;
    let drawW: number;
    let drawH: number;
    if (imgAspect > availW / availH) {
      drawW = availW;
      drawH = availW / imgAspect;
    } else {
      drawH = availH;
      drawW = availH * imgAspect;
    }
    const frameW = drawW;
    const frameH = drawH + chromeH;
    const frameX = (cw - frameW) / 2;
    const frameY = (ch - frameH) / 2;

    const tiltRad = (p.effects.tilt * Math.PI) / 180;
    if (p.effects.tilt !== 0) {
      ctx.save();
      ctx.translate(frameX + frameW / 2, frameY + frameH / 2);
      ctx.rotate(tiltRad);
      ctx.translate(-(frameX + frameW / 2), -(frameY + frameH / 2));
    }
    {
      drawSingleFrame(
        {
          ctx,
          scale,
          frameX,
          frameY,
          frameW,
          frameH,
          drawX: frameX,
          drawY: frameY + chromeH,
          drawW,
          drawH,
          chromeH,
          radius: r,
          img: shot.img,
          title: p.chromeTitle,
        },
        p,
        false
      );
    }
    if (p.effects.tilt !== 0) ctx.restore();
    return;
  }

  // Multi mode
  for (const shot of shots) {
    const baseW = SHOT_BASE_FRACTION * cw * shot.scale;
    const aspect = shot.dims.w / shot.dims.h;
    const drawW = baseW;
    const drawH = baseW / aspect;
    const frameW = drawW;
    const frameH = drawH + chromeH;
    const cxN = shot.x * cw;
    const cyN = shot.y * ch;
    const frameX = cxN - frameW / 2;
    const frameY = cyN - frameH / 2;

    ctx.save();
    // Per-shot rotation, plus global tilt
    const totalRot = ((shot.rotation + p.effects.tilt) * Math.PI) / 180;
    if (totalRot !== 0) {
      ctx.translate(cxN, cyN);
      ctx.rotate(totalRot);
      ctx.translate(-cxN, -cyN);
    }
    drawSingleFrame(
      {
        ctx,
        scale,
        frameX,
        frameY,
        frameW,
        frameH,
        drawX: frameX,
        drawY: frameY + chromeH,
        drawW,
        drawH,
        chromeH,
        radius: r,
        img: shot.img,
        title: shot.title || "",
      },
      p,
      selectedId === shot.id
    );
    ctx.restore();
  }
}

function withAlpha(hex: string, alpha: number): string {
  // Accept #RGB, #RRGGBB, or rgba/hsla (passthrough)
  if (hex.startsWith("rgb") || hex.startsWith("hsl")) return hex;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// ---------- Stock preset storage (Admin: built-in catalog) ----------
//
// Stock presets live on the server and are shared across all team members.
// Use the /api/stock-presets endpoint to read, save, or reset.
//
// Client helpers below wrap the API for convenience.

export async function fetchStockPresets(): Promise<Preset[]> {
  try {
    const res = await fetch(apiUrl("/api/stock-presets"), { cache: "no-store" });
    if (!res.ok) return BUILTIN_PRESETS;
    const data = (await res.json()) as Preset[];
    return Array.isArray(data) && data.length > 0 ? data : BUILTIN_PRESETS;
  } catch {
    return BUILTIN_PRESETS;
  }
}

export async function saveStockPresets(presets: Preset[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(apiUrl("/api/stock-presets"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presets),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function resetStockPresets(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(apiUrl("/api/stock-presets"), { method: "DELETE" });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: (data as { error?: string }).error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function emitStockChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("gvc-stock-changed"));
}
