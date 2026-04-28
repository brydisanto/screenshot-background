"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Copy,
  Image as ImageIcon,
  Palette,
  Square,
  Upload,
  Link as LinkIcon,
  X,
  Sparkles,
  Eraser,
} from "lucide-react";
import {
  bgToCss,
  loadCustomPresets,
  saveCustomPresets,
  emitPresetChange,
  type Preset,
  type Bg,
  type Stop,
} from "@/lib/frame";

type Mode = "gradient" | "image" | "solid";

interface Draft {
  name: string;
  mode: Mode;
  // gradient
  angle: number;
  stops: Stop[];
  // image
  imageUrl: string;
  imageMode: "cover" | "tile";
  // solid
  solidColor: string;
}

const DEFAULT_DRAFT: Draft = {
  name: "",
  mode: "gradient",
  angle: 135,
  stops: [
    { color: "#FFE048", pos: 0 },
    { color: "#FF5F1F", pos: 1 },
  ],
  imageUrl: "",
  imageMode: "cover",
  solidColor: "#FFE048",
};

export default function StudioPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPresets(loadCustomPresets());
  }, []);

  function persist(next: Preset[]) {
    setPresets(next);
    saveCustomPresets(next);
    emitPresetChange();
  }

  function buildPreset(d: Draft, id: string): Preset | null {
    if (!d.name.trim()) {
      toast.error("Give it a name");
      return null;
    }
    let bg: Bg;
    let swatch: string;
    if (d.mode === "gradient") {
      if (d.stops.length < 2) {
        toast.error("Add at least 2 color stops");
        return null;
      }
      const sorted = [...d.stops].sort((a, b) => a.pos - b.pos);
      bg = { kind: "linear", angle: d.angle, stops: sorted };
      swatch = `linear-gradient(${d.angle}deg, ${sorted
        .map((s) => `${s.color} ${s.pos * 100}%`)
        .join(", ")})`;
    } else if (d.mode === "image") {
      if (!d.imageUrl) {
        toast.error("Upload or paste an image URL");
        return null;
      }
      bg = { kind: "image", url: d.imageUrl, mode: d.imageMode };
      swatch = `url(${d.imageUrl}) center/cover`;
    } else {
      bg = { kind: "solid", color: d.solidColor };
      swatch = d.solidColor;
    }
    return { id, name: d.name.trim(), swatch, bg, custom: true };
  }

  function handleSave() {
    const id = editingId ?? `custom-${Date.now()}`;
    const built = buildPreset(draft, id);
    if (!built) return;

    let next: Preset[];
    if (editingId) {
      next = presets.map((p) => (p.id === editingId ? built : p));
      toast.success("Updated");
    } else {
      next = [...presets, built];
      toast.success("Saved");
    }
    try {
      persist(next);
    } catch (err) {
      console.error(err);
      toast.error("localStorage full. Try a smaller image or fewer presets.");
      return;
    }
    setDraft(DEFAULT_DRAFT);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    const target = presets.find((p) => p.id === id);
    if (!target) return;
    if (!confirm(`Delete "${target.name}"?`)) return;
    persist(presets.filter((p) => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(DEFAULT_DRAFT);
    }
    toast.success("Deleted");
  }

  function handleEdit(p: Preset) {
    setEditingId(p.id);
    if (p.bg.kind === "linear") {
      setDraft({
        name: p.name,
        mode: "gradient",
        angle: p.bg.angle,
        stops: p.bg.stops,
        imageUrl: "",
        imageMode: "cover",
        solidColor: "#FFE048",
      });
    } else if (p.bg.kind === "image") {
      setDraft({
        name: p.name,
        mode: "image",
        angle: 135,
        stops: DEFAULT_DRAFT.stops,
        imageUrl: p.bg.url,
        imageMode: p.bg.mode,
        solidColor: "#FFE048",
      });
    } else if (p.bg.kind === "solid") {
      setDraft({
        name: p.name,
        mode: "solid",
        angle: 135,
        stops: DEFAULT_DRAFT.stops,
        imageUrl: "",
        imageMode: "cover",
        solidColor: p.bg.color,
      });
    }
    window.scrollTo({ top: 200, behavior: "smooth" });
  }

  function handleClearAll() {
    if (presets.length === 0) return;
    const sizeKb = Math.round(
      (typeof window !== "undefined" ? localStorage.getItem("gvc-frame-custom-presets")?.length ?? 0 : 0) / 1024
    );
    if (
      !confirm(
        `Wipe all ${presets.length} saved preset${presets.length === 1 ? "" : "s"}? This frees roughly ${sizeKb}KB of browser storage and can't be undone.`
      )
    )
      return;
    persist([]);
    setEditingId(null);
    setDraft(DEFAULT_DRAFT);
    toast.success("Cleared. Storage freed.");
  }

  function handleDuplicate(p: Preset) {
    const copy: Preset = {
      ...p,
      id: `custom-${Date.now()}`,
      name: `${p.name} copy`,
      custom: true,
    };
    persist([...presets, copy]);
    toast.success("Duplicated");
  }

  function onImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too big. Max 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setDraft((d) => ({ ...d, imageUrl: dataUrl }));
      toast.success("Image attached");
    };
    reader.readAsDataURL(file);
  }

  // Live preview of the in-progress draft
  const draftBg: Bg = useMemo(() => {
    if (draft.mode === "gradient") {
      return {
        kind: "linear",
        angle: draft.angle,
        stops: [...draft.stops].sort((a, b) => a.pos - b.pos),
      };
    }
    if (draft.mode === "image") {
      return { kind: "image", url: draft.imageUrl || "", mode: draft.imageMode };
    }
    return { kind: "solid", color: draft.solidColor };
  }, [draft]);

  return (
    <main className="min-h-screen relative pb-24">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: `${(i * 9.7 + 4) % 100}%`,
              top: `${(i * 11.3 + 8) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${5 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-white/60 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          <Image
            src="/shaka.png"
            alt="GVC"
            width={32}
            height={32}
            className="hover:animate-wiggle drop-shadow-[0_0_15px_rgba(255,224,72,0.4)]"
          />
          <span className="font-display font-bold text-sm tracking-[0.25em] text-white/70 uppercase">
            GVC // Frame
          </span>
        </Link>
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gvc-gold/15 border border-gvc-gold/30 text-[10px] font-display font-bold uppercase tracking-[0.22em] text-gvc-gold">
          <Sparkles className="w-3 h-3" />
          Pro
        </span>
      </header>

      <section className="relative z-10 px-6 sm:px-10 pt-8 pb-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gvc-gold/10 border border-gvc-gold/25 mb-5"
        >
          <Sparkles className="w-3.5 h-3.5 text-gvc-gold" />
          <span className="text-[11px] font-body text-gvc-gold uppercase tracking-[0.22em]">
            Studio Pass · Pro
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display font-black text-shimmer text-4xl sm:text-6xl leading-[0.9] tracking-tight uppercase"
        >
          The<br />Studio.
        </motion.h1>
        <p className="mt-5 text-white/55 font-body text-sm sm:text-base max-w-2xl leading-relaxed">
          Where the brand lives. Build unlimited backgrounds with multi-stop gradients, hosted images, and signature
          solids. Every preset you save shows up live across the tool the moment it ships.
        </p>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 grid lg:grid-cols-[360px_1fr] gap-6">
        {/* Existing presets */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-gvc-dark/80 backdrop-blur-xl p-5 h-fit"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-[0.22em]">Library</h2>
            <span className="text-[11px] font-mono text-white/40">{presets.length}</span>
          </div>

          {presets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-white/40 text-xs font-body leading-relaxed">
                Nothing saved yet. Build your first one on the right.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className={
                    "group flex items-center gap-3 p-2 rounded-xl border transition " +
                    (editingId === p.id
                      ? "border-gvc-gold/40 bg-gvc-gold/5"
                      : "border-white/[0.06] hover:border-white/15 bg-white/[0.02]")
                  }
                >
                  <span
                    className="w-12 h-12 rounded-lg ring-1 ring-white/15 shrink-0"
                    style={{ background: p.swatch }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-body text-white truncate">{p.name}</div>
                    <div className="text-[10px] font-mono text-white/35 uppercase tracking-wider">
                      {p.bg.kind}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition">
                    <IconBtn title="Edit" onClick={() => handleEdit(p)}>
                      <Palette className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => handleDuplicate(p)}>
                      <Copy className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title="Delete" danger onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconBtn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {presets.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5 text-[11px] uppercase tracking-wider text-white/55 hover:text-red-300 transition"
            >
              <Eraser className="w-3 h-3" />
              Clear all & free storage
            </button>
          )}
        </motion.div>

        {/* Editor */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/10 bg-gvc-dark/80 backdrop-blur-xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-[0.22em]">
              {editingId ? "Edit preset" : "New preset"}
            </h2>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setDraft(DEFAULT_DRAFT);
                }}
                className="text-[11px] uppercase tracking-wider text-white/40 hover:text-gvc-gold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel edit
              </button>
            )}
          </div>

          {/* Live preview */}
          <div
            className="aspect-[16/9] rounded-xl ring-1 ring-white/10 overflow-hidden flex items-center justify-center"
            style={{ background: bgToCss(draftBg) }}
          >
            <span className="font-display font-black uppercase tracking-tight text-3xl sm:text-5xl text-white/90 mix-blend-difference">
              Preview
            </span>
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] font-body uppercase tracking-[0.18em] text-white/50">Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Aurora Pro, Studio Magenta, etc."
              className="mt-2 w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white font-body focus:outline-none focus:border-gvc-gold/40 placeholder:text-white/25"
            />
          </div>

          {/* Mode tabs */}
          <div>
            <label className="text-[10px] font-body uppercase tracking-[0.18em] text-white/50">Type</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <ModeTab
                active={draft.mode === "gradient"}
                onClick={() => setDraft((d) => ({ ...d, mode: "gradient" }))}
                icon={<Palette className="w-3.5 h-3.5" />}
                label="Gradient"
              />
              <ModeTab
                active={draft.mode === "image"}
                onClick={() => setDraft((d) => ({ ...d, mode: "image" }))}
                icon={<ImageIcon className="w-3.5 h-3.5" />}
                label="Image"
              />
              <ModeTab
                active={draft.mode === "solid"}
                onClick={() => setDraft((d) => ({ ...d, mode: "solid" }))}
                icon={<Square className="w-3.5 h-3.5" />}
                label="Solid"
              />
            </div>
          </div>

          {/* Mode-specific */}
          <AnimatePresence mode="wait">
            {draft.mode === "gradient" && (
              <motion.div
                key="gradient"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">Color stops</span>
                    <button
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          stops: [...d.stops, { color: "#FFFFFF", pos: 0.5 }],
                        }))
                      }
                      disabled={draft.stops.length >= 6}
                      className="text-[10px] uppercase tracking-wider text-gvc-gold hover:underline flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:no-underline"
                    >
                      <Plus className="w-3 h-3" /> Add stop
                    </button>
                  </div>
                  <div className="space-y-2">
                    {draft.stops.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                        <input
                          type="color"
                          value={s.color}
                          onChange={(e) => {
                            const stops = [...draft.stops];
                            stops[i] = { ...stops[i], color: e.target.value };
                            setDraft((d) => ({ ...d, stops }));
                          }}
                          className="w-9 h-9 rounded-md cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={s.color}
                          onChange={(e) => {
                            const stops = [...draft.stops];
                            stops[i] = { ...stops[i], color: e.target.value };
                            setDraft((d) => ({ ...d, stops }));
                          }}
                          className="w-24 px-2 py-1.5 rounded bg-black/40 border border-white/10 text-xs font-mono text-white/80 focus:outline-none focus:border-gvc-gold/40"
                        />
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(s.pos * 100)}
                            onChange={(e) => {
                              const stops = [...draft.stops];
                              stops[i] = { ...stops[i], pos: Number(e.target.value) / 100 };
                              setDraft((d) => ({ ...d, stops }));
                            }}
                            className="flex-1 gvc-slider"
                            style={{
                              background: `linear-gradient(to right, #FFE048 0%, #FFE048 ${
                                s.pos * 100
                              }%, rgba(255,255,255,0.08) ${s.pos * 100}%, rgba(255,255,255,0.08) 100%)`,
                              height: "4px",
                              borderRadius: "2px",
                            }}
                          />
                          <span className="text-[10px] font-mono text-white/40 w-9 text-right">
                            {Math.round(s.pos * 100)}%
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            setDraft((d) => ({ ...d, stops: d.stops.filter((_, j) => j !== i) }))
                          }
                          disabled={draft.stops.length <= 2}
                          className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/40"
                          title="Remove stop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">Angle</span>
                    <span className="text-[11px] font-mono text-white/40">{draft.angle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={draft.angle}
                    onChange={(e) => setDraft((d) => ({ ...d, angle: Number(e.target.value) }))}
                    className="w-full gvc-slider"
                    style={{
                      background: `linear-gradient(to right, #FFE048 0%, #FFE048 ${
                        (draft.angle / 360) * 100
                      }%, rgba(255,255,255,0.08) ${(draft.angle / 360) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      height: "4px",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </motion.div>
            )}

            {draft.mode === "image" && (
              <motion.div
                key="image"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 block mb-2">
                    Image source
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-gvc-gold/30 hover:bg-gvc-gold/5 transition text-xs text-white/70 font-body"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload file
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImageFile(f);
                        if (e.target) e.target.value = "";
                      }}
                    />
                    <div className="relative">
                      <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="url"
                        placeholder="…or paste an image URL"
                        value={draft.imageUrl.startsWith("data:") ? "" : draft.imageUrl}
                        onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white/80 font-body focus:outline-none focus:border-gvc-gold/40 placeholder:text-white/25"
                      />
                    </div>
                  </div>
                  {draft.imageUrl && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-white/40">
                      <span className="truncate flex-1">
                        {draft.imageUrl.startsWith("data:")
                          ? `data: image (${Math.round(draft.imageUrl.length / 1024)} KB)`
                          : draft.imageUrl}
                      </span>
                      <button
                        onClick={() => setDraft((d) => ({ ...d, imageUrl: "" }))}
                        className="text-white/40 hover:text-red-400"
                      >
                        clear
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 block mb-2">
                    Display mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cover", "tile"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setDraft((d) => ({ ...d, imageMode: m }))}
                        className={
                          "py-2 rounded-lg text-xs font-body transition uppercase tracking-wider " +
                          (draft.imageMode === m
                            ? "bg-gvc-gold text-gvc-black font-semibold"
                            : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80")
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/35 leading-relaxed mt-2">
                    Cover fills the canvas. Tile repeats the image at its natural size.
                  </p>
                </div>
                <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3 text-[11px] text-yellow-200/70 font-body leading-relaxed">
                  Uploaded files store as data URLs in your browser. Big files may hit the ~5MB localStorage cap.
                  Pasting a URL keeps things lean.
                </div>
              </motion.div>
            )}

            {draft.mode === "solid" && (
              <motion.div
                key="solid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 block">Color</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.solidColor}
                    onChange={(e) => setDraft((d) => ({ ...d, solidColor: e.target.value }))}
                    className="w-14 h-14 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={draft.solidColor}
                    onChange={(e) => setDraft((d) => ({ ...d, solidColor: e.target.value }))}
                    className="flex-1 px-3 py-3 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-gvc-gold/40"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gvc-gold text-gvc-black font-display font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_30px_rgba(255,224,72,0.4)] active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            {editingId ? "Update preset" : "Save preset"}
          </button>
        </motion.div>
      </section>

      <footer className="relative z-10 mt-16 px-6 sm:px-10 pb-10">
        <div className="max-w-5xl mx-auto pt-8 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <Link href="/" className="text-xs font-body text-white/40 hover:text-gvc-gold transition flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" />
            Back to the tool
          </Link>
          <span className="text-[11px] font-body text-white/30">
            Stored locally in this browser
          </span>
        </div>
      </footer>
    </main>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "py-2.5 rounded-lg text-xs font-body transition flex items-center justify-center gap-2 uppercase tracking-wider " +
        (active
          ? "bg-gvc-gold text-gvc-black font-semibold"
          : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  danger,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={
        "p-1.5 rounded-md transition " +
        (danger
          ? "text-white/50 hover:text-red-400 hover:bg-red-500/10"
          : "text-white/50 hover:text-gvc-gold hover:bg-white/[0.06]")
      }
    >
      {children}
    </button>
  );
}
