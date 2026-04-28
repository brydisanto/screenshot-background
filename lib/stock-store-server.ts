import fs from "fs";
import path from "path";
import type { Preset } from "./frame";

const DATA_FILE = path.join(process.cwd(), ".data", "stock.json");
const KV_KEY = "gvc-frame:stock-presets";

function hasKv(): boolean {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

let kvCached: { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<unknown>; del: (k: string) => Promise<unknown> } | null = null;
async function getKv() {
  if (!hasKv()) return null;
  if (!kvCached) {
    const mod = await import("@vercel/kv");
    kvCached = mod.kv as unknown as typeof kvCached;
  }
  return kvCached;
}

export async function readStock(): Promise<Preset[] | null> {
  const k = await getKv();
  if (k) {
    const data = (await k.get(KV_KEY)) as Preset[] | null;
    return data ?? null;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Preset[];
  } catch {
    return null;
  }
}

export async function writeStock(presets: Preset[]): Promise<void> {
  const k = await getKv();
  if (k) {
    await k.set(KV_KEY, presets);
    return;
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(presets, null, 2));
}

export async function deleteStock(): Promise<void> {
  const k = await getKv();
  if (k) {
    await k.del(KV_KEY);
    return;
  }
  try {
    fs.unlinkSync(DATA_FILE);
  } catch {
    /* ignore */
  }
}

export function storageKind(): "kv" | "file" {
  return hasKv() ? "kv" : "file";
}
