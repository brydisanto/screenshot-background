"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Upload,
  Download,
  Sparkles,
  Trash2,
  Sliders,
  Layers,
  Maximize,
  Wand2,
  ClipboardPaste,
  Image as ImageIcon,
  Plus,
  Zap,
  Wind,
  Layers3,
  Palette,
  RotateCw,
  ChevronUp,
  ChevronDown,
  MousePointer2,
  Hand,
} from "lucide-react";
import {
  BUILTIN_PRESETS,
  ASPECTS,
  DEFAULT_EFFECTS,
  MAX_SHOTS,
  computeCanvasDims,
  hitTestShot,
  hitTestCorner,
  hitTestHandle,
  paintFrame,
  loadImage,
  fetchStockPresets,
  type Preset,
  type Bg,
  type FrameParams,
  type Effects,
  type Mode,
  type Shot,
  type ShotWithImage,
} from "@/lib/frame";

const GLOW_OPTIONS: Array<{ id: string; label: string; color: string | null; swatch: string }> = [
  { id: "none", label: "None", color: null, swatch: "transparent" },
  { id: "gold", label: "Gold", color: "#FFE048", swatch: "#FFE048" },
  { id: "pink", label: "Pink", color: "#FF6B9D", swatch: "#FF6B9D" },
  { id: "mint", label: "Mint", color: "#2EFF2E", swatch: "#2EFF2E" },
  { id: "cyan", label: "Cyan", color: "#06B6D4", swatch: "#06B6D4" },
  { id: "violet", label: "Violet", color: "#A78BFA", swatch: "#A78BFA" },
];

function newShotId() {
  return `shot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomeClient({ initialStock }: { initialStock: Preset[] }) {
  const [mode, setMode] = useState<Mode>("single");
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const imageMapRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [presetId, setPresetId] = useState(initialStock[0]?.id ?? "vibetown");
  const [stockPresets, setStockPresets] = useState<Preset[]>(initialStock);

  // One-off custom backgrounds (session only, not persisted)
  const [customGradient, setCustomGradient] = useState<{ a: string; b: string; angle: number }>({
    a: "#FFE048",
    b: "#FF5F1F",
    angle: 135,
  });
  const [customMode, setCustomMode] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const customBgFileInputRef = useRef<HTMLInputElement>(null);

  const [padding, setPadding] = useState(64);
  const [radius, setRadius] = useState(16);
  const [shadow, setShadow] = useState(64);
  const [chromeOn, setChromeOn] = useState(true);
  const [chromeTitle, setChromeTitle] = useState("good-vibes.tsx");
  const [aspect, setAspect] = useState("auto");

  const [effects, setEffects] = useState<Effects>(DEFAULT_EFFECTS);

  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Pointer drag state for multi mode (move)
  const dragRef = useRef<{
    shotId: string;
    startNX: number;
    startNY: number;
    shotStartX: number;
    shotStartY: number;
    moved: boolean;
  } | null>(null);

  // Pointer drag state for corner resize
  const resizeRef = useRef<{
    shotId: string;
    initialScale: number;
    initialDist: number; // pointer distance from shot center at click time, in canvas pixels
  } | null>(null);

  // Pointer drag state for rotation
  const rotateRef = useRef<{
    shotId: string;
    initialRotation: number;
    initialAngle: number; // pointer angle from shot center at click time, in degrees
  } | null>(null);

  // Hover state for cursor styling
  const [hoverCursor, setHoverCursor] = useState<"grab" | "grabbing" | "nwse" | "nesw" | "rotate" | "default">(
    "default"
  );

  // Load stock from server; refresh on focus & on stock-change events
  useEffect(() => {
    let alive = true;
    const refreshStock = () => {
      fetchStockPresets().then((p) => {
        if (alive) setStockPresets(p);
      });
    };

    refreshStock();

    const onFocus = () => refreshStock();
    window.addEventListener("focus", onFocus);
    window.addEventListener("gvc-stock-changed", refreshStock);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("gvc-stock-changed", refreshStock);
    };
  }, []);

  const activeBg: Bg = useMemo(() => {
    if (customImageUrl) {
      return { kind: "image", url: customImageUrl, mode: "cover" };
    }
    if (customMode) {
      return {
        kind: "linear",
        angle: customGradient.angle,
        stops: [
          { color: customGradient.a, pos: 0 },
          { color: customGradient.b, pos: 1 },
        ],
      };
    }
    return stockPresets.find((p) => p.id === presetId)?.bg ?? BUILTIN_PRESETS[0].bg;
  }, [customImageUrl, customMode, customGradient, presetId, stockPresets]);

  const activePresetName = useMemo(() => {
    if (customImageUrl) return "Custom Image";
    if (customMode) return "Custom Gradient";
    return stockPresets.find((p) => p.id === presetId)?.name ?? "";
  }, [customImageUrl, customMode, presetId, stockPresets]);

  const params: FrameParams = useMemo(
    () => ({ mode, bg: activeBg, padding, radius, shadow, chromeOn, chromeTitle, aspect, effects }),
    [mode, activeBg, padding, radius, shadow, chromeOn, chromeTitle, aspect, effects]
  );

  // Load bg image when bg is image-kind
  useEffect(() => {
    if (activeBg.kind !== "image") {
      setBgImage(null);
      return;
    }
    let cancelled = false;
    loadImage(activeBg.url)
      .then((img) => {
        if (!cancelled) setBgImage(img);
      })
      .catch(() => {
        if (!cancelled) setBgImage(null);
        toast.error("Couldn't load that background image");
      });
    return () => {
      cancelled = true;
    };
  }, [activeBg]);

  // Add shots from sources. Replaces in single mode, appends in multi.
  const addShotsFromSources = useCallback(
    (srcs: string[]) => {
      if (srcs.length === 0) return;
      Promise.all(
        srcs.map(
          (src) =>
            new Promise<{ src: string; img: HTMLImageElement }>((resolve, reject) => {
              const img = new window.Image();
              img.onload = () => resolve({ src, img });
              img.onerror = reject;
              img.src = src;
            })
        )
      )
        .then((loaded) => {
          setShots((prev) => {
            if (mode === "single") {
              // Replace shots with first item only
              const first = loaded[0];
              const id = newShotId();
              imageMapRef.current.clear();
              imageMapRef.current.set(id, first.img);
              const next: Shot[] = [
                {
                  id,
                  src: first.src,
                  dims: { w: first.img.naturalWidth, h: first.img.naturalHeight },
                  x: 0.5,
                  y: 0.5,
                  scale: 1,
                  rotation: 0,
                },
              ];
              setSelectedShotId(id);
              return next;
            }
            // Multi mode: append up to MAX_SHOTS
            const room = MAX_SHOTS - prev.length;
            const accepted = loaded.slice(0, Math.max(0, room));
            const skipped = loaded.length - accepted.length;
            if (skipped > 0)
              toast.error(`Hit the ${MAX_SHOTS}-shot limit. Skipped ${skipped}.`);
            const next: Shot[] = [...prev];
            accepted.forEach((it, i) => {
              const id = newShotId();
              imageMapRef.current.set(id, it.img);
              const idx = prev.length + i;
              // Stagger placements so new shots don't perfectly overlap
              const cx = 0.5 + ((idx % 5) - 2) * 0.08;
              const cy = 0.5 + (idx % 2 === 0 ? -1 : 1) * 0.06;
              next.push({
                id,
                src: it.src,
                dims: { w: it.img.naturalWidth, h: it.img.naturalHeight },
                x: cx,
                y: cy,
                scale: 1,
                rotation: (idx % 2 === 0 ? -1 : 1) * (idx * 1.5),
              });
              if (i === accepted.length - 1) setSelectedShotId(id);
            });
            return next;
          });
          toast.success(loaded.length === 1 ? "Loaded" : `Loaded ${loaded.length}`);
        })
        .catch(() => toast.error("Couldn't load those"));
    },
    [mode]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (valid.length === 0) {
        toast.error("Pick image files");
        return;
      }
      Promise.all(
        valid.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      ).then(addShotsFromSources);
    },
    [addShotsFromSources]
  );

  // Keyboard shortcuts: Delete/Backspace removes the selected shot in multi mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== "multi" || !selectedShotId) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeShot(selectedShotId);
        toast.success("Removed");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedShotId]);

  // Paste image
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) handleFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  // Build shots-with-images array for rendering
  const shotsWithImages: ShotWithImage[] = useMemo(
    () =>
      shots
        .map((s) => {
          const img = imageMapRef.current.get(s.id);
          return img ? ({ ...s, img } as ShotWithImage) : null;
        })
        .filter(Boolean) as ShotWithImage[],
    // recompute on shots change; image map updates synchronously when we add
    [shots]
  );

  // Repaint preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const wrap = previewWrapRef.current;
    if (!canvas || !wrap) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    if (wrapW === 0 || wrapH === 0) return;
    const refDims = mode === "single" && shots[0] ? shots[0].dims : { w: 1920, h: 1080 };
    const full = computeCanvasDims(refDims.w, refDims.h, params);
    const fitScale = Math.min(wrapW / full.w, wrapH / full.h, 1);
    const targetW = Math.max(2, Math.floor(full.w * fitScale * (window.devicePixelRatio || 1)));
    paintFrame(canvas, shotsWithImages, params, bgImage, targetW, mode === "multi" ? selectedShotId : null);
    canvas.style.width = `${full.w * fitScale}px`;
    canvas.style.height = `${full.h * fitScale}px`;
  }, [shots, shotsWithImages, params, mode, bgImage, selectedShotId]);

  // Resize observer
  useEffect(() => {
    const wrap = previewWrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const wrapW = wrap.clientWidth;
      const wrapH = wrap.clientHeight;
      if (wrapW === 0 || wrapH === 0) return;
      const refDims = mode === "single" && shots[0] ? shots[0].dims : { w: 1920, h: 1080 };
      const full = computeCanvasDims(refDims.w, refDims.h, params);
      const fitScale = Math.min(wrapW / full.w, wrapH / full.h, 1);
      const targetW = Math.max(2, Math.floor(full.w * fitScale * (window.devicePixelRatio || 1)));
      paintFrame(canvas, shotsWithImages, params, bgImage, targetW, mode === "multi" ? selectedShotId : null);
      canvas.style.width = `${full.w * fitScale}px`;
      canvas.style.height = `${full.h * fitScale}px`;
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [shots, shotsWithImages, params, mode, bgImage, selectedShotId]);

  const exportDims = useMemo(() => {
    const refDims = mode === "single" && shots[0] ? shots[0].dims : { w: 1920, h: 1080 };
    return computeCanvasDims(refDims.w, refDims.h, params);
  }, [shots, params, mode]);

  // Pointer events for multi-mode drag
  function getNormalizedFromEvent(e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    return { nx, ny };
  }

  function onCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "multi" || shots.length === 0) return;
    const pos = getNormalizedFromEvent(e);
    if (!pos) return;
    const refDims = { w: 1920, h: 1080 };
    const full = computeCanvasDims(refDims.w, refDims.h, params);
    const chromeH = chromeOn ? 64 : 0;

    // 1. If a shot is already selected, check rotation handle first, then corner handles
    if (selectedShotId) {
      const sel = shots.find((s) => s.id === selectedShotId);
      if (sel) {
        if (hitTestHandle(sel, pos.nx, pos.ny, full.w, full.h, chromeH)) {
          const cxP = sel.x * full.w;
          const cyP = sel.y * full.h;
          const mxP = pos.nx * full.w;
          const myP = pos.ny * full.h;
          const initialAngle = (Math.atan2(myP - cyP, mxP - cxP) * 180) / Math.PI;
          rotateRef.current = {
            shotId: sel.id,
            initialRotation: sel.rotation,
            initialAngle,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          setHoverCursor("rotate");
          bringShotToFront(sel.id);
          return;
        }
        const corner = hitTestCorner(sel, pos.nx, pos.ny, full.w, full.h, chromeH);
        if (corner) {
          const cxP = sel.x * full.w;
          const cyP = sel.y * full.h;
          const mxP = pos.nx * full.w;
          const myP = pos.ny * full.h;
          const initialDist = Math.max(1, Math.hypot(mxP - cxP, myP - cyP));
          resizeRef.current = {
            shotId: sel.id,
            initialScale: sel.scale,
            initialDist,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          setHoverCursor(corner === "tl" || corner === "br" ? "nwse" : "nesw");
          bringShotToFront(sel.id);
          return;
        }
      }
    }

    // 2. Otherwise hit-test shot bodies
    const idx = hitTestShot(shots, pos.nx, pos.ny, full.w, full.h, chromeH);
    if (idx === -1) {
      setSelectedShotId(null);
      return;
    }
    const shot = shots[idx];
    setSelectedShotId(shot.id);
    dragRef.current = {
      shotId: shot.id,
      startNX: pos.nx,
      startNY: pos.ny,
      shotStartX: shot.x,
      shotStartY: shot.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setHoverCursor("grabbing");
    bringShotToFront(shot.id);
  }

  function onCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "multi") return;

    // Active rotation?
    const rotate = rotateRef.current;
    if (rotate) {
      const pos = getNormalizedFromEvent(e);
      if (!pos) return;
      const refDims = { w: 1920, h: 1080 };
      const full = computeCanvasDims(refDims.w, refDims.h, params);
      const sel = shots.find((s) => s.id === rotate.shotId);
      if (!sel) return;
      const cxP = sel.x * full.w;
      const cyP = sel.y * full.h;
      const mxP = pos.nx * full.w;
      const myP = pos.ny * full.h;
      const angle = (Math.atan2(myP - cyP, mxP - cxP) * 180) / Math.PI;
      let newRotation = rotate.initialRotation + (angle - rotate.initialAngle);
      // Wrap to -180..180
      while (newRotation > 180) newRotation -= 360;
      while (newRotation < -180) newRotation += 360;
      setShots((prev) => prev.map((s) => (s.id === rotate.shotId ? { ...s, rotation: newRotation } : s)));
      return;
    }

    // Active resize?
    const resize = resizeRef.current;
    if (resize) {
      const pos = getNormalizedFromEvent(e);
      if (!pos) return;
      const refDims = { w: 1920, h: 1080 };
      const full = computeCanvasDims(refDims.w, refDims.h, params);
      const sel = shots.find((s) => s.id === resize.shotId);
      if (!sel) return;
      const cxP = sel.x * full.w;
      const cyP = sel.y * full.h;
      const mxP = pos.nx * full.w;
      const myP = pos.ny * full.h;
      const dist = Math.hypot(mxP - cxP, myP - cyP);
      const newScale = Math.max(0.2, Math.min(2.5, resize.initialScale * (dist / resize.initialDist)));
      setShots((prev) => prev.map((s) => (s.id === resize.shotId ? { ...s, scale: newScale } : s)));
      return;
    }

    // Active move?
    const drag = dragRef.current;
    if (drag) {
      const pos = getNormalizedFromEvent(e);
      if (!pos) return;
      const dx = pos.nx - drag.startNX;
      const dy = pos.ny - drag.startNY;
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) drag.moved = true;
      setShots((prev) =>
        prev.map((s) =>
          s.id === drag.shotId
            ? { ...s, x: clamp01(drag.shotStartX + dx), y: clamp01(drag.shotStartY + dy) }
            : s
        )
      );
      return;
    }

    // Idle hover — update cursor based on what's under the pointer
    if (shots.length === 0 || !selectedShotId) {
      if (hoverCursor !== "default") setHoverCursor("default");
      return;
    }
    const pos = getNormalizedFromEvent(e);
    if (!pos) return;
    const refDims = { w: 1920, h: 1080 };
    const full = computeCanvasDims(refDims.w, refDims.h, params);
    const chromeH = chromeOn ? 64 : 0;
    const sel = shots.find((s) => s.id === selectedShotId);
    if (sel) {
      if (hitTestHandle(sel, pos.nx, pos.ny, full.w, full.h, chromeH)) {
        if (hoverCursor !== "rotate") setHoverCursor("rotate");
        return;
      }
      const corner = hitTestCorner(sel, pos.nx, pos.ny, full.w, full.h, chromeH);
      if (corner) {
        const next = corner === "tl" || corner === "br" ? "nwse" : "nesw";
        if (hoverCursor !== next) setHoverCursor(next);
        return;
      }
    }
    const idx = hitTestShot(shots, pos.nx, pos.ny, full.w, full.h, chromeH);
    if (idx >= 0) {
      if (hoverCursor !== "grab") setHoverCursor("grab");
    } else {
      if (hoverCursor !== "default") setHoverCursor("default");
    }
  }

  function onCanvasPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (resizeRef.current || dragRef.current || rotateRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resizeRef.current = null;
    dragRef.current = null;
    rotateRef.current = null;
    setHoverCursor("default");
  }

  function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
  }

  // Layer ops (multi mode)
  function updateShot(id: string, patch: Partial<Shot>) {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeShot(id: string) {
    setShots((prev) => prev.filter((s) => s.id !== id));
    imageMapRef.current.delete(id);
    if (selectedShotId === id) setSelectedShotId(null);
  }
  function bringShotToFront(id: string) {
    setShots((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0 || i === prev.length - 1) return prev;
      const next = [...prev];
      const [moved] = next.splice(i, 1);
      next.push(moved);
      return next;
    });
  }
  function moveShot(id: string, dir: -1 | 1) {
    setShots((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function duplicateShot(id: string) {
    setShots((prev) => {
      if (prev.length >= MAX_SHOTS) {
        toast.error(`Hit the ${MAX_SHOTS}-shot limit`);
        return prev;
      }
      const src = prev.find((s) => s.id === id);
      if (!src) return prev;
      const newId = newShotId();
      const srcImg = imageMapRef.current.get(id);
      if (srcImg) imageMapRef.current.set(newId, srcImg);
      const copy: Shot = {
        ...src,
        id: newId,
        x: clamp01(src.x + 0.05),
        y: clamp01(src.y + 0.05),
      };
      setSelectedShotId(newId);
      return [...prev, copy];
    });
  }

  function changeMode(next: Mode) {
    if (next === mode) return;
    if (next === "single" && shots.length > 1) {
      if (
        !confirm(
          `Switching to Single mode keeps only the first shot and removes the other ${shots.length - 1}. Continue?`
        )
      )
        return;
      const keep = shots[0];
      const drop = shots.slice(1);
      drop.forEach((s) => imageMapRef.current.delete(s.id));
      setShots([{ ...keep, x: 0.5, y: 0.5, scale: 1, rotation: 0 }]);
      setSelectedShotId(keep.id);
    }
    setMode(next);
  }

  function clearAll() {
    setShots([]);
    imageMapRef.current.clear();
    setSelectedShotId(null);
    toast.success("Cleared");
  }

  const loadSample = useCallback(() => {
    const c = document.createElement("canvas");
    c.width = 1280;
    c.height = 800;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0B0B0B";
    ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, 240, 800);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(240, 0, 1, 800);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 14px ui-sans-serif, system-ui";
    ["Dashboard", "Frames", "Library", "Export queue", "Settings"].forEach((t, i) => {
      ctx.fillText(t, 24, 80 + i * 36);
    });
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(240, 0, 1040, 56);
    ctx.fillStyle = "#FFE048";
    drawRound(ctx, 280, 96, 960, 220, 18);
    ctx.fill();
    ctx.fillStyle = "#050505";
    ctx.font = "900 56px ui-sans-serif, system-ui";
    ctx.fillText("GOOD VIBES, COMPOUNDED", 312, 196);
    ctx.font = "500 18px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(5,5,5,0.7)";
    ctx.fillText("Your weekly motion report → up and to the right.", 312, 240);
    [0, 1, 2].forEach((i) => {
      ctx.fillStyle = "#121212";
      drawRound(ctx, 280 + i * 320, 340, 300, 180, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      drawRound(ctx, 280 + i * 320, 340, 300, 180, 14);
      ctx.stroke();
      ctx.fillStyle = "#FFE048";
      ctx.font = "900 36px ui-sans-serif, system-ui";
      ctx.fillText(["+128%", "1,510", "0.649"][i], 300 + i * 320, 410);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "500 14px ui-sans-serif, system-ui";
      ctx.fillText(["Engagement", "Holders", "Floor (ETH)"][i], 300 + i * 320, 440);
    });
    ctx.fillStyle = "#121212";
    drawRound(ctx, 280, 552, 960, 200, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    drawRound(ctx, 280, 552, 960, 200, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(310, 700);
    for (let x = 0; x <= 900; x += 30) {
      const y = 700 - 30 - Math.sin(x / 80) * 30 - x / 12;
      ctx.lineTo(310 + x, y);
    }
    ctx.strokeStyle = "#FFE048";
    ctx.lineWidth = 3;
    ctx.stroke();
    addShotsFromSources([c.toDataURL("image/png")]);
  }, [addShotsFromSources]);

  async function exportPng() {
    if (shotsWithImages.length === 0) {
      toast.error("Drop a screenshot first");
      return;
    }
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 30));
    const canvas = document.createElement("canvas");
    paintFrame(canvas, shotsWithImages, params, bgImage); // no max width = full size, no selection highlight
    canvas.toBlob((blob) => {
      if (!blob) {
        setIsExporting(false);
        toast.error("Export failed");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gvc-frame-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      toast.success("Saved to Downloads");
    }, "image/png");
  }

  function pickPreset(id: string) {
    setPresetId(id);
    setCustomMode(false);
    setCustomImageUrl(null);
  }

  function handleCustomBgFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image too big. Max 15MB.");
      return;
    }
    import("@/lib/compress-image").then(({ compressForUpload }) => {
      compressForUpload(file)
        .then(({ dataUrl, width, height }) => {
          setCustomImageUrl(dataUrl);
          setCustomMode(false);
          toast.success(`Custom background loaded (${width}×${height})`);
        })
        .catch(() => toast.error("Couldn't process that image"));
    });
  }

  const hasShots = shotsWithImages.length > 0;
  const activeGlow = GLOW_OPTIONS.find((g) => g.color === effects.glowColor) ?? GLOW_OPTIONS[0];
  const selectedShot = shots.find((s) => s.id === selectedShotId) ?? null;

  return (
    <main className="min-h-screen relative pb-24">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating embers — varied sizes and tempo */}
        {[...Array(32)].map((_, i) => {
          const variant = i % 7 === 0 ? "ember-orb" : i % 3 === 0 ? "ember-lg" : "";
          const twinkle = i % 5 === 2 ? " ember-twinkle" : "";
          return (
            <div
              key={`e-${i}`}
              className={`ember ${variant}${twinkle}`}
              style={{
                left: `${(i * 7.3 + 4) % 100}%`,
                top: `${(i * 13.7 + 8) % 100}%`,
                animationDelay: `${(i * 0.4) % 7}s`,
                animationDuration: variant === "ember-orb" ? `${9 + (i % 4)}s` : `${5 + (i % 5)}s`,
              }}
            />
          );
        })}
        {/* Rising particles — sweep up the full viewport */}
        {[...Array(10)].map((_, i) => (
          <div
            key={`r-${i}`}
            className="rising-particle"
            style={{
              left: `${(i * 11 + 3) % 100}%`,
              animationDelay: `${i * 1.6}s`,
              animationDuration: `${10 + (i % 4) * 2.5}s`,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 px-6 sm:px-10 pt-12 sm:pt-16 pb-10 text-center max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="flex justify-center mb-5"
        >
          <Image
            src="/shaka.png"
            alt="GVC shaka"
            width={64}
            height={64}
            className="shaka-idle drop-shadow-[0_0_20px_rgba(255,224,72,0.4)]"
            priority
            unoptimized
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gvc-gold/10 border border-gvc-gold/20 mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-gvc-gold" />
          <span className="text-xs font-body text-gvc-gold uppercase tracking-widest">
            Share beautiful screenshots
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display font-black text-gvc-gold uppercase leading-[0.9] tracking-tight text-5xl sm:text-6xl lg:text-7xl"
        >
          The Framery
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mt-8 text-white/65 font-body text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Turn ordinary images into beautiful sharable moments. Drop in any image (or up to {MAX_SHOTS}) and
          customize it to fit your vibe. Share a screen that stops the scroll.
        </motion.p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8"
      >
        <div className="rounded-3xl border border-white/10 bg-gvc-dark/80 backdrop-blur-xl overflow-hidden card-glow">
          <div className="grid lg:grid-cols-[1fr_400px]">
            {/* Preview */}
            <div className="relative p-4 sm:p-8 min-h-[460px] sm:min-h-[640px] flex items-center justify-center bg-black/40 border-b lg:border-b-0 lg:border-r border-white/5">
              {!hasShots ? (
                <DropZone
                  mode={mode}
                  isDragging={isDragging}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
                  }}
                  onPickFile={() => fileInputRef.current?.click()}
                  onLoadSample={loadSample}
                />
              ) : (
                <div ref={previewWrapRef} className="w-full h-full min-h-[400px] flex items-center justify-center">
                  <canvas
                    ref={previewCanvasRef}
                    onPointerDown={onCanvasPointerDown}
                    onPointerMove={onCanvasPointerMove}
                    onPointerUp={onCanvasPointerUp}
                    onPointerCancel={onCanvasPointerUp}
                    className={"max-w-full max-h-full block rounded-md " + (mode === "multi" ? "touch-none" : "")}
                    style={{
                      cursor:
                        mode !== "multi"
                          ? "default"
                          : hoverCursor === "nwse"
                          ? "nwse-resize"
                          : hoverCursor === "nesw"
                          ? "nesw-resize"
                          : hoverCursor === "rotate"
                          ? "crosshair"
                          : hoverCursor === "grabbing"
                          ? "grabbing"
                          : hoverCursor === "grab"
                          ? "grab"
                          : "default",
                    }}
                  />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={mode === "multi"}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                  if (e.target) e.target.value = "";
                }}
              />
              {hasShots && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={mode === "multi" && shots.length >= MAX_SHOTS}
                    className="px-3 py-1.5 rounded-lg text-xs font-body text-white/70 bg-black/60 hover:bg-black/80 hover:text-white border border-white/10 backdrop-blur transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={mode === "multi" ? "Add another shot" : "Replace screenshot"}
                  >
                    {mode === "multi" ? <Plus className="w-3 h-3" /> : null}
                    {mode === "multi" ? "Add" : "Replace"}
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-3 py-1.5 rounded-lg text-xs font-body text-white/70 bg-black/60 hover:bg-black/80 hover:text-white border border-white/10 backdrop-blur transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              )}
              {hasShots && mode === "multi" && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur text-[11px] font-body text-white/55">
                  <Hand className="w-3 h-3 text-gvc-gold" />
                  Drag body to move, corners to resize, top dot to rotate. Delete to remove.
                </div>
              )}
              {hasShots && mode === "multi" && selectedShot && (
                <button
                  onClick={() => {
                    removeShot(selectedShot.id);
                    toast.success("Removed");
                  }}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-red-500/20 hover:border-red-500/60 hover:bg-red-500/15 backdrop-blur text-[11px] font-body text-white/70 hover:text-red-200 transition"
                  title="Delete selected image (Delete / Backspace)"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete image
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 sm:p-7 space-y-7 max-h-[800px] overflow-y-auto">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.08]">
                <ModeBtn active={mode === "single"} onClick={() => changeMode("single")}>
                  <ImageIcon className="w-3.5 h-3.5" />
                  Single
                </ModeBtn>
                <ModeBtn active={mode === "multi"} onClick={() => changeMode("multi")}>
                  <Layers3 className="w-3.5 h-3.5" />
                  Multi
                  <span className="text-[9px] font-mono text-gvc-gold/80 ml-1">×{MAX_SHOTS}</span>
                </ModeBtn>
              </div>

              {/* Layers panel — multi only */}
              <AnimatePresence initial={false}>
                {mode === "multi" && hasShots && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <SectionHeader
                      icon={<Layers3 className="w-3.5 h-3.5" />}
                      title="Layers"
                      subtitle={`${shots.length} of ${MAX_SHOTS}`}
                    />
                    <div className="space-y-1.5 mt-2">
                      {shots.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedShotId(s.id)}
                          className={
                            "w-full group flex items-center gap-2 p-2 rounded-lg border transition text-left " +
                            (selectedShotId === s.id
                              ? "border-gvc-gold/40 bg-gvc-gold/5"
                              : "border-white/[0.06] hover:border-white/15 bg-white/[0.02]")
                          }
                        >
                          <span className="text-[10px] font-mono text-white/40 w-4">{i + 1}</span>
                          <span
                            className="w-9 h-9 rounded-md ring-1 ring-white/10 shrink-0 bg-black/40 bg-cover bg-center"
                            style={{ backgroundImage: `url(${s.src})` }}
                          />
                          <span className="flex-1 text-[11px] font-mono text-white/60 truncate">
                            {s.dims.w}×{s.dims.h}
                          </span>
                          <span className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveShot(s.id, -1);
                              }}
                              className={
                                "p-1 rounded text-white/50 hover:text-gvc-gold hover:bg-white/[0.06] " +
                                (i === 0 ? "opacity-30 pointer-events-none" : "")
                              }
                              title="Send back"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveShot(s.id, 1);
                              }}
                              className={
                                "p-1 rounded text-white/50 hover:text-gvc-gold hover:bg-white/[0.06] " +
                                (i === shots.length - 1 ? "opacity-30 pointer-events-none" : "")
                              }
                              title="Bring forward"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateShot(s.id);
                              }}
                              className={
                                "p-1 rounded text-white/50 hover:text-gvc-gold hover:bg-white/[0.06] " +
                                (shots.length >= MAX_SHOTS ? "opacity-30 pointer-events-none" : "")
                              }
                              title="Duplicate"
                            >
                              <Plus className="w-3 h-3" />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeShot(s.id);
                              }}
                              className="p-1 rounded text-white/50 hover:text-red-400 hover:bg-red-500/10"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </span>
                          </span>
                        </button>
                      ))}
                      {shots.length < MAX_SHOTS && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-2 rounded-lg border border-dashed border-white/10 hover:border-gvc-gold/30 hover:bg-gvc-gold/5 text-[11px] uppercase tracking-wider text-white/50 hover:text-gvc-gold transition flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Add shot
                        </button>
                      )}
                    </div>

                    {/* Selected layer controls */}
                    <AnimatePresence initial={false}>
                      {selectedShot && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-xl border border-gvc-gold/20 bg-black/30 p-3 space-y-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-body uppercase tracking-[0.18em] text-gvc-gold/70">
                              <MousePointer2 className="w-3 h-3" />
                              Selected layer
                            </div>
                            <ControlGroup label="Scale" value={selectedShot.scale.toFixed(2) + "×"}>
                              <Slider
                                value={Math.round(selectedShot.scale * 100)}
                                min={20}
                                max={250}
                                onChange={(v) =>
                                  updateShot(selectedShot.id, { scale: v / 100 })
                                }
                              />
                            </ControlGroup>
                            <ControlGroup label="Rotation" value={`${Math.round(selectedShot.rotation)}°`}>
                              <Slider
                                value={selectedShot.rotation}
                                min={-180}
                                max={180}
                                onChange={(v) => updateShot(selectedShot.id, { rotation: v })}
                              />
                            </ControlGroup>
                            <button
                              onClick={() => removeShot(selectedShot.id)}
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5 text-[11px] uppercase tracking-wider text-white/55 hover:text-red-300 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove this image
                            </button>
                            <button
                              onClick={() =>
                                updateShot(selectedShot.id, {
                                  x: 0.5,
                                  y: 0.5,
                                  scale: 1,
                                  rotation: 0,
                                })
                              }
                              className="w-full text-[10px] uppercase tracking-wider text-white/40 hover:text-gvc-gold transition flex items-center justify-center gap-1"
                            >
                              <RotateCw className="w-3 h-3" />
                              Reset position
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Divider />
                  </motion.div>
                )}
              </AnimatePresence>

              <SectionHeader icon={<Layers className="w-3.5 h-3.5" />} title="Background" subtitle={activePresetName} />
              <div className="grid grid-cols-5 gap-2">
                {stockPresets.map((p) => (
                  <SwatchButton
                    key={p.id}
                    preset={p}
                    active={!customMode && !customImageUrl && presetId === p.id}
                    onClick={() => pickPreset(p.id)}
                  />
                ))}
                <button
                  onClick={() => {
                    setCustomMode((v) => !v);
                    setCustomImageUrl(null);
                  }}
                  title="Custom gradient"
                  className={
                    "aspect-square rounded-lg flex items-center justify-center transition-all " +
                    (customMode
                      ? "ring-2 ring-gvc-gold ring-offset-2 ring-offset-gvc-dark scale-95 bg-gvc-gold text-gvc-black"
                      : "ring-1 ring-dashed ring-white/15 hover:ring-gvc-gold/50 text-white/50 hover:text-gvc-gold bg-white/[0.02]")
                  }
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => customBgFileInputRef.current?.click()}
                  title="Upload your own background"
                  className={
                    "aspect-square rounded-lg flex items-center justify-center transition-all relative overflow-hidden " +
                    (customImageUrl
                      ? "ring-2 ring-gvc-gold ring-offset-2 ring-offset-gvc-dark scale-95"
                      : "ring-1 ring-dashed ring-white/15 hover:ring-gvc-gold/50 text-white/50 hover:text-gvc-gold bg-white/[0.02]")
                  }
                  style={
                    customImageUrl
                      ? { background: `url(${customImageUrl}) center/cover` }
                      : undefined
                  }
                >
                  {!customImageUrl && <Upload className="w-4 h-4" />}
                </button>
                <input
                  ref={customBgFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCustomBgFile(f);
                    if (e.target) e.target.value = "";
                  }}
                />
              </div>
              {customImageUrl && (
                <div className="flex items-center gap-2 text-[10px] font-body text-white/45 -mt-3">
                  <span className="flex-1 truncate">Using uploaded background</span>
                  <button
                    onClick={() => setCustomImageUrl(null)}
                    className="text-white/40 hover:text-red-300 uppercase tracking-wider"
                  >
                    clear
                  </button>
                </div>
              )}

              <AnimatePresence initial={false}>
                {customMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-gvc-gold/20 bg-black/30 p-3 space-y-3 -mt-2">
                      <div className="text-[10px] font-body uppercase tracking-[0.18em] text-gvc-gold/70 flex items-center gap-1.5">
                        <Palette className="w-3 h-3" />
                        Custom gradient
                      </div>
                      <div className="flex items-center gap-3">
                        <ColorChip
                          label="A"
                          color={customGradient.a}
                          onChange={(v) => setCustomGradient((g) => ({ ...g, a: v }))}
                        />
                        <ColorChip
                          label="B"
                          color={customGradient.b}
                          onChange={(v) => setCustomGradient((g) => ({ ...g, b: v }))}
                        />
                        <button
                          onClick={() => setCustomGradient((g) => ({ ...g, a: g.b, b: g.a }))}
                          className="ml-auto text-[10px] uppercase tracking-wider text-white/50 hover:text-gvc-gold px-2 py-1 rounded"
                        >
                          Swap
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">Angle</span>
                          <span className="text-[11px] font-mono text-white/40">{customGradient.angle}°</span>
                        </div>
                        <Slider
                          value={customGradient.angle}
                          min={0}
                          max={360}
                          onChange={(v) => setCustomGradient((g) => ({ ...g, angle: v }))}
                        />
                      </div>
                      <p className="text-[10px] text-white/35 leading-relaxed">
                        One-off gradient for this session. Pick a stock preset to switch back.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Divider />

              <SectionHeader icon={<Sliders className="w-3.5 h-3.5" />} title="Frame" />
              {mode === "single" && (
                <ControlGroup label="Padding" value={`${padding}`}>
                  <Slider value={padding} min={16} max={200} onChange={setPadding} />
                </ControlGroup>
              )}
              <ControlGroup label="Corner radius" value={`${radius}`}>
                <Slider value={radius} min={0} max={40} onChange={setRadius} />
              </ControlGroup>
              <ControlGroup label="Shadow" value={`${shadow}`}>
                <Slider value={shadow} min={0} max={120} onChange={setShadow} />
              </ControlGroup>
              <ControlGroup label="Aspect">
                <div className="grid grid-cols-5 gap-1.5">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAspect(a.id)}
                      className={
                        "py-2 rounded-md text-[11px] font-body transition " +
                        (aspect === a.id
                          ? "bg-gvc-gold text-gvc-black font-semibold"
                          : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80")
                      }
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </ControlGroup>
              <ControlGroup label="Window chrome">
                <button
                  onClick={() => setChromeOn((v) => !v)}
                  className={
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition " +
                    (chromeOn
                      ? "bg-gvc-gold/10 border-gvc-gold/30"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20")
                  }
                >
                  <span className="flex gap-1.5">
                    <span className={"w-2.5 h-2.5 rounded-full " + (chromeOn ? "bg-[#FF5F57]" : "bg-white/15")} />
                    <span className={"w-2.5 h-2.5 rounded-full " + (chromeOn ? "bg-[#FEBC2E]" : "bg-white/15")} />
                    <span className={"w-2.5 h-2.5 rounded-full " + (chromeOn ? "bg-[#28C840]" : "bg-white/15")} />
                  </span>
                  <span className={"text-xs font-body " + (chromeOn ? "text-white" : "text-white/50")}>
                    {chromeOn ? "Mac chrome on" : "Mac chrome off"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {chromeOn && mode === "single" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <input
                        type="text"
                        value={chromeTitle}
                        onChange={(e) => setChromeTitle(e.target.value)}
                        placeholder="window title"
                        className="w-full mt-2 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white/80 font-mono focus:outline-none focus:border-gvc-gold/40"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </ControlGroup>

              <Divider />

              <SectionHeader icon={<Wand2 className="w-3.5 h-3.5" />} title="Effects" />

              <ControlGroup label="Glow" value={activeGlow.label}>
                <div className="flex gap-1.5">
                  {GLOW_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setEffects((e) => ({ ...e, glowColor: g.color }))}
                      title={g.label}
                      className={
                        "w-7 h-7 rounded-full border transition " +
                        (effects.glowColor === g.color
                          ? "ring-2 ring-gvc-gold ring-offset-2 ring-offset-gvc-dark scale-95 border-transparent"
                          : "border-white/15 hover:border-white/30 hover:scale-110")
                      }
                      style={{
                        background:
                          g.color === null
                            ? "repeating-linear-gradient(45deg,#fff2 0 4px,#0000 4px 8px)"
                            : g.swatch,
                      }}
                    />
                  ))}
                </div>
                <AnimatePresence initial={false}>
                  {effects.glowColor && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                            Glow intensity
                          </span>
                          <span className="text-[11px] font-mono text-white/40">{effects.glowIntensity}</span>
                        </div>
                        <Slider
                          value={effects.glowIntensity}
                          min={10}
                          max={100}
                          onChange={(v) => setEffects((e) => ({ ...e, glowIntensity: v }))}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ControlGroup>

              <ControlGroup label="Reflection">
                <button
                  onClick={() => setEffects((e) => ({ ...e, reflection: !e.reflection }))}
                  className={
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition " +
                    (effects.reflection
                      ? "bg-gvc-gold/10 border-gvc-gold/30"
                      : "bg-white/[0.03] border-white/10 hover:border-white/20")
                  }
                >
                  <Wind className={"w-3.5 h-3.5 " + (effects.reflection ? "text-gvc-gold" : "text-white/40")} />
                  <span className={"text-xs font-body " + (effects.reflection ? "text-white" : "text-white/50")}>
                    {effects.reflection ? "Mirror on" : "Mirror off"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {effects.reflection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                            Reflection intensity
                          </span>
                          <span className="text-[11px] font-mono text-white/40">{effects.reflectionIntensity}</span>
                        </div>
                        <Slider
                          value={effects.reflectionIntensity}
                          min={10}
                          max={100}
                          onChange={(v) => setEffects((e) => ({ ...e, reflectionIntensity: v }))}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ControlGroup>

              <ControlGroup label="Stroke">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEffects((e) => ({ ...e, stroke: !e.stroke }))}
                    className={
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition " +
                      (effects.stroke
                        ? "bg-gvc-gold/10 border-gvc-gold/30"
                        : "bg-white/[0.03] border-white/10 hover:border-white/20")
                    }
                  >
                    <Zap className={"w-3.5 h-3.5 " + (effects.stroke ? "text-gvc-gold" : "text-white/40")} />
                    <span className={"text-xs font-body " + (effects.stroke ? "text-white" : "text-white/50")}>
                      {effects.stroke ? "Border on" : "Border off"}
                    </span>
                  </button>
                  {effects.stroke && (
                    <ColorChip
                      compact
                      label=""
                      color={effects.strokeColor}
                      onChange={(v) => setEffects((e) => ({ ...e, strokeColor: v }))}
                    />
                  )}
                </div>
              </ControlGroup>

              <ControlGroup label={mode === "multi" ? "Scene tilt" : "Tilt"} value={`${effects.tilt}°`}>
                <Slider
                  value={effects.tilt}
                  min={-15}
                  max={15}
                  onChange={(v) => setEffects((e) => ({ ...e, tilt: v }))}
                />
              </ControlGroup>

              <ControlGroup label="Stack depth" value={`${effects.stack}`}>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEffects((e) => ({ ...e, stack: n }))}
                      className={
                        "flex-1 py-2 rounded-md text-[11px] font-body transition flex items-center justify-center gap-1 " +
                        (effects.stack === n
                          ? "bg-gvc-gold text-gvc-black font-semibold"
                          : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80")
                      }
                    >
                      <Layers3 className="w-3 h-3" />
                      {n}
                    </button>
                  ))}
                </div>
              </ControlGroup>

              <button
                onClick={() => setEffects(DEFAULT_EFFECTS)}
                className="w-full flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider text-white/40 hover:text-gvc-gold transition py-1"
              >
                <RotateCw className="w-3 h-3" />
                Reset effects
              </button>

              <Divider />

              <button
                onClick={exportPng}
                disabled={!hasShots || isExporting}
                className={
                  "w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-display font-bold text-sm uppercase tracking-wider transition-all " +
                  (hasShots && !isExporting
                    ? "bg-gvc-gold text-gvc-black hover:shadow-[0_0_30px_rgba(255,224,72,0.4)] active:scale-95"
                    : "bg-white/[0.05] text-white/30 cursor-not-allowed")
                }
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Download PNG"}
              </button>
              {hasShots && exportDims && (
                <p className="text-[11px] text-white/30 font-body text-center -mt-3">
                  Exports at {exportDims.w} × {exportDims.h}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 mt-24">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              title: "Drop It",
              body: `Drop a screenshot in and go. Single mode for hero shots, Multi for arranging up to ${MAX_SHOTS} images in 1 frame.`,
              icon: <ClipboardPaste className="w-5 h-5" />,
            },
            {
              title: "Style It",
              body: "Pick a background, add glow & shadows, set aspect ratio, and so much more.",
              icon: <Sliders className="w-5 h-5" />,
            },
            {
              title: "Ship It",
              body: "Export your masterpiece as a PNG. Your screenshots, framed and arranged, straight into your downloads folder.",
              icon: <Download className="w-5 h-5" />,
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-6 bg-gvc-dark border border-white/[0.08] hover:border-gvc-gold/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gvc-gold/10 text-gvc-gold flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-white text-xl mb-2 uppercase tracking-tight">{f.title}</h3>
              <p className="text-sm text-white/50 font-body leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mt-24 px-6 sm:px-10 pb-10">
        <div className="relative max-w-6xl mx-auto pt-8 border-t border-white/[0.06] flex items-center justify-center">
          <a
            href="https://goodvibesclub.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition"
            title="Good Vibes Club"
          >
            <Image
              src="/gvc-logotype.svg"
              alt="Good Vibes Club"
              width={100}
              height={20}
              className="h-4 w-auto"
              unoptimized
            />
          </a>
          <Link
            href="/admin"
            className="absolute right-0 top-1/2 -translate-y-1/2 mt-3 text-white/20 hover:text-white/60 transition"
            title="Operator panel"
          >
            <span className="text-[10px] uppercase tracking-wider">Operator</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between -mb-2">
      <div className="flex items-center gap-2">
        <span className="text-gvc-gold/80">{icon}</span>
        <span className="font-display font-bold text-sm uppercase tracking-[0.22em] text-white/85">{title}</span>
      </div>
      {subtitle && (
        <span className="text-[11px] font-body text-white/35 truncate max-w-[180px]">{subtitle}</span>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "py-2 rounded-lg flex items-center justify-center gap-2 text-[11px] font-body uppercase tracking-[0.18em] transition " +
        (active
          ? "bg-gvc-gold text-gvc-black font-semibold"
          : "text-white/55 hover:text-white hover:bg-white/[0.04]")
      }
    >
      {children}
    </button>
  );
}

function ControlGroup({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-body uppercase tracking-[0.18em] text-white/50">{label}</span>
        {value !== undefined && (
          <span className="text-[11px] font-mono text-white/40 tabular-nums truncate max-w-[140px]">{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/[0.06]" />;
}

function Slider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full cursor-pointer appearance-none gvc-slider"
      style={{
        background: `linear-gradient(to right, #FFE048 0%, #FFE048 ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
        height: "4px",
        borderRadius: "2px",
      }}
    />
  );
}

function SwatchButton({
  preset,
  active,
  onClick,
}: {
  preset: Preset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={preset.name}
      className={
        "aspect-square rounded-lg transition-all relative overflow-hidden " +
        (active
          ? "ring-2 ring-gvc-gold ring-offset-2 ring-offset-gvc-dark scale-95"
          : "ring-1 ring-white/10 hover:ring-white/30 hover:scale-105")
      }
      style={{ background: preset.swatch }}
    >
      {preset.bg.kind === "gridDark" && (
        <span
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
      )}
      {preset.custom && (
        <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gvc-gold ring-1 ring-black/40" />
      )}
    </button>
  );
}

function ColorChip({
  label,
  color,
  onChange,
  compact,
}: {
  label: string;
  color: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={
        "relative flex items-center gap-2 cursor-pointer rounded-lg " +
        (compact ? "" : "px-2 py-1.5 bg-white/[0.04] border border-white/10 hover:border-white/20")
      }
      title={`Color ${label}`}
    >
      <span
        className={"rounded-md ring-1 ring-white/15 " + (compact ? "w-9 h-9" : "w-7 h-7")}
        style={{ background: color }}
      />
      {label && <span className="text-[10px] uppercase text-white/50 tracking-widest">{label}</span>}
      <input
        type="color"
        value={normalizeHex(color)}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  );
}

function normalizeHex(c: string): string {
  if (c.startsWith("#")) {
    if (c.length === 4) {
      return "#" + c.slice(1).split("").map((x) => x + x).join("");
    }
    return c;
  }
  return "#FFE048";
}

function DropZone({
  mode,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPickFile,
  onLoadSample,
}: {
  mode: Mode;
  isDragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onPickFile: () => void;
  onLoadSample: () => void;
}) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onPickFile}
      className={
        "w-full max-w-2xl rounded-2xl border-2 border-dashed transition-all cursor-pointer p-12 sm:p-16 text-center " +
        (isDragging
          ? "border-gvc-gold bg-gvc-gold/5 scale-[1.01]"
          : "border-white/10 hover:border-gvc-gold/30 hover:bg-white/[0.02]")
      }
    >
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gvc-gold/10 text-gvc-gold flex items-center justify-center">
        <Upload className="w-7 h-7" />
      </div>
      <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight mb-2">
        {mode === "multi" ? `Drop up to ${MAX_SHOTS} screenshots` : "Drop a screenshot"}
      </h2>
      <p className="text-white/50 font-body text-sm mb-6 max-w-md mx-auto">
        Drag in {mode === "multi" ? "files" : "a file"}, paste from clipboard{" "}
        <span className="font-mono text-white/70">⌘V</span>, or click to choose.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gvc-gold text-gvc-black font-display font-bold text-xs uppercase tracking-wider">
          <Upload className="w-3.5 h-3.5" />
          Choose {mode === "multi" ? "files" : "file"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLoadSample();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/70 font-body text-xs uppercase tracking-wider transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Try a sample
        </button>
      </div>
    </div>
  );
}

function drawRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
