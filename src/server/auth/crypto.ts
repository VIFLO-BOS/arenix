import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { assertAuthSecret } from "@/lib/env";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Opaque random token (returned to the user); only its HMAC is stored. */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHmac("sha256", assertAuthSecret()).update(token).digest("hex");
}

export function hashIp(ip: string | null | undefined) {
  if (!ip) return undefined;
  return createHash("sha256").update(`${ip}|${assertAuthSecret()}`).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function hmacSha256Hex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
