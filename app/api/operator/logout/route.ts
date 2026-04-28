import { NextResponse } from "next/server";
import { clearOperatorCookie } from "@/lib/operator-auth";

export const runtime = "nodejs";

export async function POST() {
  clearOperatorCookie();
  return NextResponse.json({ ok: true });
}
