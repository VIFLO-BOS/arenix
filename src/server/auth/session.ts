import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDb } from "@/server/db/connect";
import { Session, User, type Role, type UserDoc } from "@/server/db/models/user";
import { generateToken, hashIp, hashToken, verifyPassword } from "./crypto";
import { roleHas, type Permission } from "./permissions";
import { env } from "@/lib/env";
import { recordAudit } from "@/server/services/audit";
import { rateLimit } from "@/lib/rate-limit";

export const SESSION_COOKIE = "arenix_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const LOCK_AFTER_FAILURES = 6;
const LOCK_MINUTES = 15;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function toCurrentUser(u: UserDoc): CurrentUser {
  return { id: u._id.toString(), email: u.email, name: u.name, role: u.role as Role };
}

export async function requestIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0]?.trim() : h.get("x-real-ip")) ?? null;
}

/** Cached per request so layouts and pages share one DB lookup. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    await connectDb();
    const session = await Session.findOne({ tokenHash: hashToken(token), revokedAt: { $exists: false } }).lean();
    if (!session || session.expiresAt.getTime() < Date.now()) return null;
    const user = await User.findById(session.userId).lean();
    if (!user || !user.isActive) return null;
    return toCurrentUser(user as UserDoc);
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roleHas(user.role, permission)) {
    await recordAudit({
      actor: user,
      action: "auth.denied",
      entityType: "permission",
      entityId: permission,
      severity: "SECURITY",
    });
    throw new AuthorizationError();
  }
  return user;
}

export function userCan(user: CurrentUser | null, permission: Permission) {
  return !!user && roleHas(user.role, permission);
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const ip = await requestIp();
  const limiter = rateLimit(`login:${ip ?? "unknown"}`, 10, 15 * 60 * 1000);
  if (!limiter.ok) return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };

  await connectDb();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  const generic = "Invalid email or password.";
  if (!user || !user.isActive) {
    await recordAudit({ action: "auth.login_failed", entityType: "user", entityId: email, severity: "SECURITY", ipHash: hashIp(ip) });
    return { ok: false, error: generic };
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { ok: false, error: "This account is temporarily locked after repeated failed attempts. Try again later." };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= LOCK_AFTER_FAILURES) {
      user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
    }
    await user.save();
    await recordAudit({ action: "auth.login_failed", entityType: "user", entityId: user._id.toString(), severity: "SECURITY", ipHash: hashIp(ip) });
    return { ok: false, error: generic };
  }

  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  await createSession(user as UserDoc, ip);
  await recordAudit({ actor: toCurrentUser(user as UserDoc), action: "auth.login", entityType: "user", entityId: user._id.toString(), ipHash: hashIp(ip) });
  return { ok: true };
}

export async function createSession(user: UserDoc, ip: string | null) {
  const token = generateToken(32);
  const h = await headers();
  await Session.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: h.get("user-agent")?.slice(0, 300),
    ipHash: hashIp(ip),
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await connectDb();
      await Session.updateOne({ tokenHash: hashToken(token) }, { $set: { revokedAt: new Date() } });
    } catch {
      /* ignore */
    }
  }
  store.delete(SESSION_COOKIE);
}

export async function revokeAllSessionsForUser(userId: string) {
  await connectDb();
  await Session.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}
