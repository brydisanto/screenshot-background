import { NextResponse } from "next/server";
import { readStock, writeStock, deleteStock } from "@/lib/stock-store-server";
import { isOperator } from "@/lib/operator-auth";
import { BUILTIN_PRESETS, type Preset } from "@/lib/frame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await readStock();
  return NextResponse.json(stored ?? BUILTIN_PRESETS);
}

export async function PUT(req: Request) {
  if (!isOperator()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array of presets" }, { status: 400 });
  }
  // Light validation: each item should have id, name, swatch, bg
  const presets = body as Preset[];
  for (const p of presets) {
    if (!p?.id || !p?.name || !p?.swatch || !p?.bg) {
      return NextResponse.json({ error: "Invalid preset shape" }, { status: 400 });
    }
  }
  try {
    await writeStock(presets);
  } catch (e) {
    return NextResponse.json({ error: "Save failed", detail: String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: presets.length });
}

export async function DELETE() {
  if (!isOperator()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await deleteStock();
  return NextResponse.json({ ok: true });
}
