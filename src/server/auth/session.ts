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
import { rateLimitDb } from "./rate-limit-db";

/**
 * In production the cookie carries the __Host- prefix, so browsers only accept it over HTTPS,
 * from this exact host, for the whole site, and never from a subdomain.
 */
export const SESSION_COOKIE = env.isProduction ? "__Host-arenix_session" : "arenix_session";
const LEGACY_COOKIE = "arenix_session";
/** A sign in lasts at most 12 hours, and ends sooner after 2 hours without activity. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const IDLE_TIMEOUT_MS = 1000 * 60 * 60 * 2;
const TOUCH_EVERY_MS = 1000 * 60 * 5;
const LOCK_AFTER_FAILURES = 6;
const LOCK_MINUTES = 15;
// A real bcrypt hash of a random value, compared when the email is unknown so both cases take as long.
const DUMMY_HASH = "$2b$12$9UG5ngooy7D0QS6BZf2fiOWbym/fpeadZRZ0vkrEPcT3uBWz3P9tm";

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
    const now = Date.now();
    const lastSeen = new Date(session.lastSeenAt ?? session.createdAt).getTime();
    if (now - lastSeen > IDLE_TIMEOUT_MS) {
      await Session.updateOne({ _id: session._id }, { $set: { revokedAt: new Date() } });
      return null;
    }
    const user = await User.findById(session.userId).lean();
    if (!user || !user.isActive) return null;
    if (now - lastSeen > TOUCH_EVERY_MS) await Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
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

export type PasswordCheck = { ok: true; user: UserDoc; ip: string | null } | { ok: false; error: string };

/**
 * First sign in step. Checks the email and password without creating a session. The caller
 * then sends a code (two step sign in) or calls completeLogin directly when two step is off.
 * Attempts are limited per connection in the database, so the limit holds across instances.
 */
export async function verifyPasswordLogin(email: string, password: string): Promise<PasswordCheck> {
  const ip = await requestIp();
  const limiter = await rateLimitDb(`login:${hashIp(ip) ?? "unknown"}`, 10, 15 * 60 * 1000);
  if (!limiter.ok) return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };

  await connectDb();
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  const generic = "Invalid email or password.";
  if (!user || !user.isActive) {
    // Same work as a real check, so the response time does not reveal which emails have accounts.
    await verifyPassword(password, DUMMY_HASH);
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
  await user.save();
  return { ok: true, user: user as UserDoc, ip };
}

/** Final sign in step. Creates the session and records how the user proved who they are. */
export async function completeLogin(user: UserDoc, ip: string | null, method: "password" | "password_and_email_code") {
  await connectDb();
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), failedLoginCount: 0 }, $unset: { lockedUntil: 1 } });
  await createSession(user, ip);
  await recordAudit({ actor: toCurrentUser(user), action: "auth.login", entityType: "user", entityId: user._id.toString(), ipHash: hashIp(ip), metadata: { method } });
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
    // Strict: other websites can never make the browser send this cookie, so no cross site request can act as staff.
    sameSite: "strict",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  if (SESSION_COOKIE !== LEGACY_COOKIE) store.delete(LEGACY_COOKIE);
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
  if (SESSION_COOKIE !== LEGACY_COOKIE) store.delete(LEGACY_COOKIE);
}

export async function revokeAllSessionsForUser(userId: string) {
  await connectDb();
  await Session.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
}
