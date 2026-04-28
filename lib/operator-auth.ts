import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "gvc-operator";

function expectedToken(): string | null {
  const pw = process.env.OPERATOR_PASSWORD;
  if (!pw) return null;
  return crypto.createHash("sha256").update(pw).digest("hex");
}

export function isOperator(): boolean {
  const expected = expectedToken();
  if (!expected) return false;
  const tok = cookies().get(COOKIE_NAME)?.value;
  return tok === expected;
}

export function setOperatorCookie() {
  const expected = expectedToken();
  if (!expected) return;
  cookies().set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearOperatorCookie() {
  cookies().delete(COOKIE_NAME);
}

export function checkPassword(password: string): boolean {
  const pw = process.env.OPERATOR_PASSWORD;
  if (!pw) return false;
  if (password.length !== pw.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(pw));
  } catch {
    return false;
  }
}

export function isPasswordConfigured(): boolean {
  return !!process.env.OPERATOR_PASSWORD;
}
