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
  Lock,
  ChevronUp,
  ChevronDown,
  RefreshCcw,
  AlertTriangle,
  Sparkles,
  GripVertical,
} from "lucide-react";
import {
  BUILTIN_PRESETS,
  bgToCss,
  fetchStockPresets,
  saveStockPresets,
  resetStockPresets,
  emitStockChange,
  type Preset,
  type Bg,
  type Stop,
} from "@/lib/frame";
import { compressForUpload, recompressDataUrl, isDataUrlImage, isOversized } from "@/lib/compress-image";
import { apiUrl } from "@/lib/base-url";

type Mode = "gradient" | "image" | "solid";

interface Draft {
  name: string;
  mode: Mode;
  angle: number;
  stops: Stop[];
  imageUrl: string;
  imageMode: "cover" | "tile";
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

export default function AdminPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [auth, setAuth] = useState<
    | { state: "loading" }
    | { state: "needs-config" }
    | { state: "locked" }
    | { state: "authed"; storage: "kv" | "file" }
  >({ state: "loading" });
  const [pwInput, setPwInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check auth on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/operator/me"), { cache: "no-store" });
        const data = (await res.json()) as {
          authenticated: boolean;
          passwordConfigured: boolean;
          storage: "kv" | "file";
        };
        if (!data.passwordConfigured) {
          setAuth({ state: "needs-config" });
          return;
        }
        if (!data.authenticated) {
          setAuth({ state: "locked" });
          return;
        }
        setAuth({ state: "authed", storage: data.storage });
        const stock = await fetchStockPresets();
        setPresets(stock);
      } catch {
        setAuth({ state: "locked" });
      }
    })();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pwInput) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/operator/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwInput }),
      });
      if (res.ok) {
        const me = await fetch(apiUrl("/api/operator/me"), { cache: "no-store" }).then((r) => r.json());
        setAuth({ state: "authed", storage: me.storage });
        const stock = await fetchStockPresets();
        setPresets(stock);
        setPwInput("");
        toast.success("Unlocked");
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Wrong password");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch(apiUrl("/api/operator/logout"), { method: "POST" });
    setAuth({ state: "locked" });
    toast.success("Locked");
  }

  async function persist(next: Preset[]) {
    setBusy(true);
    const res = await saveStockPresets(next);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error || "Save failed");
      return false;
    }
    setPresets(next);
    emitStockChange();
    return true;
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
    return { id, name: d.name.trim(), swatch, bg };
  }

  async function handleSave() {
    const id = editingId ?? `stock-${Date.now()}`;
    const built = buildPreset(draft, id);
    if (!built) return;

    const next = editingId
      ? presets.map((p) => (p.id === editingId ? built : p))
      : [...presets, built];

    const ok = await persist(next);
    if (!ok) return;
    toast.success(editingId ? "Updated" : "Added to catalog");
    setDraft(DEFAULT_DRAFT);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const target = presets.find((p) => p.id === id);
    if (!target) return;
    if (!confirm(`Remove "${target.name}" from the catalog? Customers will no longer see it.`)) return;
    await persist(presets.filter((p) => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(DEFAULT_DRAFT);
    }
    toast.success("Removed");
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
    } else if (p.bg.kind === "radial") {
      // Treat radial as gradient mode with the same stops, angle 135 (admin can re-author)
      setDraft({
        name: p.name,
        mode: "gradient",
        angle: 135,
        stops: p.bg.stops,
        imageUrl: "",
        imageMode: "cover",
        solidColor: "#FFE048",
      });
      toast("Radial converted to linear for editing", { icon: "ℹ️" });
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
    } else {
      // gridDark: name only, can't edit pattern
      toast.error("Carbon CLI is a system pattern. Rename only by editing the name field.");
      setDraft({
        name: p.name,
        mode: "solid",
        angle: 135,
        stops: DEFAULT_DRAFT.stops,
        imageUrl: "",
        imageMode: "cover",
        solidColor: "#050505",
      });
    }
    window.scrollTo({ top: 200, behavior: "smooth" });
  }

  async function handleDuplicate(p: Preset) {
    const copy: Preset = {
      ...p,
      id: `stock-${Date.now()}`,
      name: `${p.name} copy`,
    };
    const ok = await persist([...presets, copy]);
    if (ok) toast.success("Duplicated");
  }

  // ---- Drag & drop reordering ----
  const dragIdRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, id: string) {
    dragIdRef.current = id;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* Safari */
    }
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dropTargetId) setDropTargetId(id);
  }

  function handleDragLeave(id: string) {
    if (dropTargetId === id) setDropTargetId(null);
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const draggedId = dragIdRef.current;
    setDragId(null);
    setDropTargetId(null);
    dragIdRef.current = null;
    if (!draggedId || draggedId === targetId) return;
    const fromIdx = presets.findIndex((p) => p.id === draggedId);
    const toIdx = presets.findIndex((p) => p.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...presets];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await persist(next);
  }

  function handleDragEnd() {
    dragIdRef.current = null;
    setDragId(null);
    setDropTargetId(null);
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = presets.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const next = [...presets];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    await persist(next);
  }

  async function handleReoptimize() {
    const targets = presets.filter(
      (p) => p.bg.kind === "image" && isOversized(p.bg.url)
    );
    if (targets.length === 0) {
      toast("Every stored image is already at target size.");
      return;
    }
    if (!confirm(`Recompress ${targets.length} oversized image${targets.length === 1 ? "" : "s"}?`)) return;

    setBusy(true);
    let savedBytes = 0;
    let touched = 0;
    const updated = await Promise.all(
      presets.map(async (p) => {
        if (p.bg.kind !== "image" || !isOversized(p.bg.url)) return p;
        try {
          const res = await recompressDataUrl(p.bg.url, { force: true });
          if (!res) return p;
          savedBytes += res.bytesBefore - res.bytesAfter;
          touched += 1;
          return {
            ...p,
            bg: { ...p.bg, url: res.dataUrl },
            swatch: `url(${res.dataUrl}) center/cover`,
          };
        } catch {
          return p;
        }
      })
    );

    const ok = await persist(updated);
    setBusy(false);
    if (!ok) return;
    if (touched === 0) {
      toast("Nothing to optimize.");
    } else {
      toast.success(`Optimized ${touched} preset${touched === 1 ? "" : "s"}, saved ${Math.round(savedBytes / 1024)}KB`);
    }
  }

  async function handleReset() {
    if (
      !confirm(
        "Reset the catalog to the original 14 built-in backgrounds? Any custom additions will be removed."
      )
    )
      return;
    setBusy(true);
    const res = await resetStockPresets();
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error || "Reset failed");
      return;
    }
    setPresets(BUILTIN_PRESETS);
    emitStockChange();
    setEditingId(null);
    setDraft(DEFAULT_DRAFT);
    toast.success("Catalog reset to defaults");
  }

  async function onImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image too big. Max 15MB before compression.");
      return;
    }
    try {
      const { dataUrl, width, height, bytes } = await compressForUpload(file);
      setDraft((d) => ({ ...d, imageUrl: dataUrl }));
      toast.success(`Optimized to ${width}×${height}, ${Math.round(bytes / 1024)}KB`);
    } catch {
      toast.error("Couldn't process that image");
    }
  }

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

  const isDirtyFromDefaults = useMemo(() => {
    if (presets.length !== BUILTIN_PRESETS.length) return true;
    return presets.some((p, i) => {
      const def = BUILTIN_PRESETS[i];
      return !def || def.id !== p.id || def.name !== p.name;
    });
  }, [presets]);

  const missingBuiltins = useMemo(() => {
    const have = new Set(presets.map((p) => p.id));
    return BUILTIN_PRESETS.filter((p) => !have.has(p.id));
  }, [presets]);

  async function handleAddMissingBuiltins() {
    if (missingBuiltins.length === 0) return;
    const ok = await persist([...presets, ...missingBuiltins]);
    if (ok) {
      toast.success(`Added ${missingBuiltins.length} built-in${missingBuiltins.length === 1 ? "" : "s"}`);
    }
  }

  if (auth.state === "loading") {
    return <AuthShell>Checking access…</AuthShell>;
  }
  if (auth.state === "needs-config") {
    return (
      <AuthShell>
        <div className="space-y-3 text-center">
          <Lock className="w-7 h-7 text-yellow-300/80 mx-auto" />
          <h2 className="font-display font-black uppercase tracking-tight text-2xl text-white">
            Operator password not set
          </h2>
          <p className="text-white/55 font-body text-sm leading-relaxed max-w-sm mx-auto">
            Set the <span className="font-mono text-gvc-gold">OPERATOR_PASSWORD</span> environment variable on
            the server (locally in <span className="font-mono">.env.local</span>; in production via your Vercel
            project settings), then reload this page.
          </p>
        </div>
      </AuthShell>
    );
  }
  if (auth.state === "locked") {
    return (
      <AuthShell>
        <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm">
          <div className="text-center space-y-2">
            <Lock className="w-7 h-7 text-white/70 mx-auto" />
            <h2 className="font-display font-black uppercase tracking-tight text-2xl text-white">
              Operator access
            </h2>
            <p className="text-white/45 font-body text-xs leading-relaxed">
              Internal panel. Enter your operator password to manage the team's stock catalog.
            </p>
          </div>
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-3 rounded-lg bg-black/40 border border-white/10 text-sm text-white font-body focus:outline-none focus:border-gvc-gold/40 placeholder:text-white/25"
          />
          <button
            type="submit"
            disabled={submitting || !pwInput}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gvc-gold text-gvc-black font-display font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_30px_rgba(255,224,72,0.4)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Unlocking…" : "Unlock"}
          </button>
          <Link
            href="/"
            className="block text-center text-[11px] uppercase tracking-wider text-white/30 hover:text-white/60 transition"
          >
            ← Back to the tool
          </Link>
        </form>
      </AuthShell>
    );
  }

  return (
    <main className="min-h-screen relative pb-24">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: `${(i * 11.7 + 4) % 100}%`,
              top: `${(i * 13.3 + 8) % 100}%`,
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
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[9px] font-mono uppercase tracking-[0.18em] text-white/40">
            {auth.state === "authed" && auth.storage === "kv" ? "Live · Vercel KV" : "Local file"}
          </span>
          {busy && (
            <span className="text-[10px] font-mono text-gvc-gold/70 uppercase tracking-wider">Saving…</span>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/15 hover:border-white/30 text-[10px] font-display font-bold uppercase tracking-[0.22em] text-white/65 hover:text-white transition"
          >
            <Lock className="w-3 h-3" />
            Lock
          </button>
        </div>
      </header>

      <section className="relative z-10 px-6 sm:px-10 pt-8 pb-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/15 mb-5"
        >
          <Lock className="w-3.5 h-3.5 text-white/70" />
          <span className="text-[11px] font-body text-white/70 uppercase tracking-[0.22em]">
            Site Operator · Internal
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display font-black text-shimmer text-4xl sm:text-6xl leading-[0.9] tracking-tight uppercase"
        >
          Catalog<br />control.
        </motion.h1>
        <p className="mt-5 text-white/55 font-body text-sm sm:text-base max-w-2xl leading-relaxed">
          The stock backgrounds every visitor sees. Reorder them, rename, retire, or push fresh ones. Saves are
          live across the site instantly.
        </p>
        <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-start gap-3 max-w-2xl">
          <AlertTriangle className="w-4 h-4 text-yellow-300/80 shrink-0 mt-0.5" />
          <p className="text-[11px] text-yellow-100/70 font-body leading-relaxed">
            This is your operator panel, not a customer-facing feature. The Studio is the premium add-on shipped
            to end users; this is the catalog behind it.
          </p>
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Catalog list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-gvc-dark/80 backdrop-blur-xl p-5 h-fit"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-[0.22em]">Catalog</h2>
              <p className="text-[11px] font-body text-white/40 mt-0.5">Drag rows to reorder</p>
            </div>
            <span className="text-[11px] font-mono text-white/40">{presets.length}</span>
          </div>

          {presets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-white/40 text-xs font-body">Empty catalog. Hit Reset to restore defaults.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {presets.map((p, i) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragOver={(e) => handleDragOver(e, p.id)}
                  onDragLeave={() => handleDragLeave(p.id)}
                  onDrop={(e) => handleDrop(e, p.id)}
                  onDragEnd={handleDragEnd}
                  className={
                    "group flex items-center gap-2 p-2 rounded-xl border transition " +
                    (dragId === p.id ? "opacity-40 " : "") +
                    (dropTargetId === p.id && dragId !== p.id
                      ? "border-gvc-gold ring-2 ring-gvc-gold/40 bg-gvc-gold/10 "
                      : editingId === p.id
                      ? "border-gvc-gold/40 bg-gvc-gold/5 "
                      : "border-white/[0.06] hover:border-white/15 bg-white/[0.02] ")
                  }
                >
                  <div className="flex items-center gap-0.5">
                    <span
                      className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 transition px-0.5"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(p.id, -1)}
                        disabled={i === 0}
                        className="p-0.5 text-white/40 hover:text-gvc-gold disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => move(p.id, 1)}
                        disabled={i === presets.length - 1}
                        className="p-0.5 text-white/40 hover:text-gvc-gold disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span
                    className="w-12 h-12 rounded-lg ring-1 ring-white/15 shrink-0 relative overflow-hidden"
                    style={{ background: p.swatch }}
                  >
                    {p.bg.kind === "gridDark" && (
                      <span
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
                          backgroundSize: "8px 8px",
                        }}
                      />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-body text-white truncate">{p.name}</div>
                    <div className="text-[10px] font-mono text-white/35 uppercase tracking-wider">
                      {p.bg.kind} · #{i + 1}
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition">
                    <IconBtn title="Edit" onClick={() => handleEdit(p)}>
                      <Palette className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title="Duplicate" onClick={() => handleDuplicate(p)}>
                      <Copy className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title="Remove" danger onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconBtn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {missingBuiltins.length > 0 && (
            <button
              onClick={handleAddMissingBuiltins}
              disabled={busy}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gvc-gold/30 hover:border-gvc-gold/60 hover:bg-gvc-gold/10 text-[11px] uppercase tracking-wider text-gvc-gold/80 hover:text-gvc-gold transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              Add {missingBuiltins.length} new built-in{missingBuiltins.length === 1 ? "" : "s"} ({missingBuiltins.map((p) => p.name).join(", ")})
            </button>
          )}

          {(() => {
            const oversizedCount = presets.filter(
              (p) => p.bg.kind === "image" && isOversized(p.bg.url)
            ).length;
            if (oversizedCount === 0) return null;
            return (
              <button
                onClick={handleReoptimize}
                disabled={busy}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gvc-gold/30 hover:border-gvc-gold/60 hover:bg-gvc-gold/10 text-[11px] uppercase tracking-wider text-gvc-gold/80 hover:text-gvc-gold transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3 h-3" />
                Optimize {oversizedCount} oversized image{oversizedCount === 1 ? "" : "s"}
              </button>
            );
          })()}

          <button
            onClick={handleReset}
            disabled={!isDirtyFromDefaults}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/5 text-[11px] uppercase tracking-wider text-white/55 hover:text-yellow-200 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white/55"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset to defaults
          </button>
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
              {editingId ? "Edit catalog entry" : "Add to catalog"}
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

          <div
            className="aspect-[16/9] rounded-xl ring-1 ring-white/10 overflow-hidden flex items-center justify-center"
            style={{ background: bgToCss(draftBg) }}
          >
            <span className="font-display font-black uppercase tracking-tight text-3xl sm:text-5xl text-white/90 mix-blend-difference">
              Preview
            </span>
          </div>

          <div>
            <label className="text-[10px] font-body uppercase tracking-[0.18em] text-white/50">Display name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Vibetown, Aurora, Studio Magenta"
              className="mt-2 w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white font-body focus:outline-none focus:border-gvc-gold/40 placeholder:text-white/25"
            />
          </div>

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

          <button
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gvc-gold text-gvc-black font-display font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_30px_rgba(255,224,72,0.4)] active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            {editingId ? "Update entry" : "Add to catalog"}
          </button>
        </motion.div>
      </section>

      <footer className="relative z-10 mt-16 px-6 sm:px-10 pb-10">
        <div className="max-w-5xl mx-auto pt-8 border-t border-white/[0.06] flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs font-body text-white/40 hover:text-gvc-gold transition flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to the tool
          </Link>
          <span className="text-[11px] font-body text-white/30">Stock catalog · Internal team</span>
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

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: `${(i * 11.7 + 4) % 100}%`,
              top: `${(i * 13.3 + 8) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${5 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gvc-dark/85 backdrop-blur-xl p-7 sm:p-9 card-glow">
          {children}
        </div>
      </div>
    </main>
  );
}
