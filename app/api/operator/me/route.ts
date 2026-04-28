import { NextResponse } from "next/server";
import { isOperator, isPasswordConfigured } from "@/lib/operator-auth";
import { storageKind } from "@/lib/stock-store-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    authenticated: isOperator(),
    passwordConfigured: isPasswordConfigured(),
    storage: storageKind(),
  });
}
