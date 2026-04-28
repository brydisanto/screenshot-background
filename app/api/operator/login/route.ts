import { NextResponse } from "next/server";
import { checkPassword, setOperatorCookie, isPasswordConfigured } from "@/lib/operator-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isPasswordConfigured()) {
    return NextResponse.json(
      { error: "OPERATOR_PASSWORD env var is not set on the server" },
      { status: 503 }
    );
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (typeof body.password !== "string" || !checkPassword(body.password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  setOperatorCookie();
  return NextResponse.json({ ok: true });
}
