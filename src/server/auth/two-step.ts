import "server-only";
import { randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connectDb } from "@/server/db/connect";
import { LoginChallenge, User, type LoginChallengeDoc, type UserDoc } from "@/server/db/models/user";
import { generateToken, hashIp, hashToken, hmacSha256Hex, safeEqual } from "./crypto";
import { completeLogin, requestIp } from "./session";
import { rateLimitDb } from "./rate-limit-db";
import { assertAuthSecret, env, integrations } from "@/lib/env";
import { recordAudit } from "@/server/services/audit";
import { emailBrand, enqueueEmail, sendSensitiveEmail } from "@/server/services/email";
import { codeLockoutEmail, describeDevice, formatWhen, loginCodeEmail, newSignInEmail } from "@/lib/email-design";
import { siteConfig } from "@/config/site";

/**
 * Two step sign in. After a correct password the user gets a six digit code by email and
 * must enter it in the same browser before a session is created.
 *
 * Protections
 * 1. The code is random, stored only as an HMAC bound to its challenge, and expires in 10 minutes.
 * 2. The challenge is tied to the browser by a separate random token in an httpOnly cookie.
 * 3. Five wrong codes end the challenge and email the account owner.
 * 4. New codes are limited to one a minute and four per sign in.
 * 5. Code checks are rate limited per connection in the database, across all server instances.
 * 6. Every successful sign in emails the account owner.
 */

export const CHALLENGE_COOKIE = "arenix_signin";
export const CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const MAX_SENDS = 4;
const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * "email" sends real codes. "console" is local development without email set up, where the
 * code is printed in the terminal running the dev server. "off" means password only. Production
 * falls back to "off" only while email sending is not configured, and the dashboard says so.
 * ADMIN_TWO_STEP=off is honoured outside production only, for local QA scripts.
 */
export type TwoStepMode = "email" | "console" | "off";

export function twoStepMode(): TwoStepMode {
  const setting = (process.env.ADMIN_TWO_STEP ?? "").trim().toLowerCase();
  if (!env.isProduction && setting === "off") return "off";
  if (integrations.email.configured) return "email";
  return env.isProduction ? "off" : "console";
}

function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function codeHash(challengeId: string, code: string) {
  return hmacSha256Hex(assertAuthSecret(), `signin:${challengeId}:${code}`);
}

async function cookieOptions(maxAgeSeconds: number) {
  return { httpOnly: true, sameSite: "strict" as const, secure: env.isProduction, path: "/admin", maxAge: maxAgeSeconds };
}

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}${"•".repeat(Math.max(3, local.length - keep.length))}@${domain}`;
}

async function signInContext(user: Pick<UserDoc, "name">) {
  const h = await headers();
  return {
    name: user.name,
    when: formatWhen(new Date(), siteConfig.teamTimezone),
    device: describeDevice(h.get("user-agent")),
    resetUrl: `${siteConfig.url}/admin/forgot-password`,
  };
}

/** Emails a fresh code for the challenge. The stored copy of the email has the code hidden. */
async function deliverCode(user: UserDoc, challenge: LoginChallengeDoc, code: string) {
  const ctx = await signInContext(user);
  const real = loginCodeEmail(emailBrand, { ...ctx, code, minutes: CODE_MINUTES });
  const stored = loginCodeEmail(emailBrand, { ...ctx, code: "••••••", minutes: CODE_MINUTES });
  if (twoStepMode() === "console") {
    console.info(`\n[auth] Sign in code for ${user.email} is ${code}. Development only, email sending is not configured.\n`);
  }
  const result = await sendSensitiveEmail({
    to: user.email,
    subject: real.subject,
    template: "login_code",
    html: real.html,
    text: real.text,
    storedHtml: stored.html,
    storedText: stored.text,
    entityType: "user",
    entityId: user._id.toString(),
  });
  return result.ok || twoStepMode() === "console";
}

/** Starts the code step after a correct password. Replaces any earlier unfinished sign in. */
export async function startChallenge(user: UserDoc, ip: string | null, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDb();
  await LoginChallenge.deleteMany({ userId: user._id });
  const token = generateToken(32);
  const code = newCode();
  const h = await headers();
  const challenge = new LoginChallenge({
    userId: user._id,
    tokenHash: hashToken(token),
    codeHash: "pending",
    sends: 1,
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    next,
    userAgent: h.get("user-agent")?.slice(0, 300),
    ipHash: hashIp(ip),
  });
  challenge.codeHash = codeHash(challenge._id.toString(), code);
  await challenge.save();

  if (!(await deliverCode(user, challenge, code))) {
    await challenge.deleteOne();
    return { ok: false, error: "We could not send your sign in code. Please try again in a moment." };
  }
  (await cookies()).set(CHALLENGE_COOKIE, token, await cookieOptions(30 * 60));
  await recordAudit({ action: "auth.code_sent", entityType: "user", entityId: user._id.toString(), severity: "SECURITY", ipHash: hashIp(ip) });
  return { ok: true };
}

/** The unfinished sign in that belongs to this browser, if any. */
export async function getPendingChallenge() {
  const token = (await cookies()).get(CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  await connectDb();
  const challenge = await LoginChallenge.findOne({ tokenHash: hashToken(token) });
  if (!challenge || challenge.expiresAt.getTime() < Date.now()) return null;
  const user = await User.findById(challenge.userId);
  if (!user || !user.isActive) return null;
  return { challenge, user: user as UserDoc };
}

async function clearChallengeCookie() {
  (await cookies()).set(CHALLENGE_COOKIE, "", await cookieOptions(0));
}

/** Why a sign in has to start again. The login page maps these to fixed messages. */
export type RestartReason = "expired" | "blocked";
export type VerifyResult = { ok: true; next: string } | { ok: false; error: string; restart?: RestartReason };

export async function verifyChallengeCode(rawCode: string): Promise<VerifyResult> {
  const ip = await requestIp();
  const limit = await rateLimitDb(`signin-code:${hashIp(ip) ?? "unknown"}`, 20, 15 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Too many attempts from this connection. Please wait a few minutes and try again." };

  const pending = await getPendingChallenge();
  if (!pending) {
    await clearChallengeCookie();
    return { ok: false, restart: "expired", error: "This sign in has expired. Please enter your email and password again." };
  }
  const { challenge, user } = pending;
  const code = rawCode.replace(/\D/g, "");

  if (code.length === 6 && safeEqual(codeHash(challenge._id.toString(), code), challenge.codeHash)) {
    await challenge.deleteOne();
    await clearChallengeCookie();
    await completeLogin(user, ip, "password_and_email_code");
    // Tell the owner about every sign in. A failure here must not block the sign in itself.
    try {
      const alert = newSignInEmail(emailBrand, { ...(await signInContext(user)), dashboardUrl: `${siteConfig.url}/admin` });
      await enqueueEmail({ to: user.email, subject: alert.subject, template: "signin_alert", html: alert.html, text: alert.text, entityType: "user", entityId: user._id.toString() });
    } catch (err) {
      console.error("[auth] sign in alert failed", err instanceof Error ? err.message : err);
    }
    return { ok: true, next: challenge.next || "/admin" };
  }

  challenge.attempts += 1;
  await recordAudit({ action: "auth.code_failed", entityType: "user", entityId: user._id.toString(), severity: "SECURITY", ipHash: hashIp(ip) });
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    await challenge.deleteOne();
    await clearChallengeCookie();
    await recordAudit({ action: "auth.code_locked", entityType: "user", entityId: user._id.toString(), severity: "SECURITY", ipHash: hashIp(ip) });
    try {
      const alert = codeLockoutEmail(emailBrand, await signInContext(user));
      await enqueueEmail({ to: user.email, subject: alert.subject, template: "signin_blocked", html: alert.html, text: alert.text, entityType: "user", entityId: user._id.toString() });
    } catch (err) {
      console.error("[auth] lockout alert failed", err instanceof Error ? err.message : err);
    }
    return { ok: false, restart: "blocked", error: "Too many incorrect codes. For your security this sign in was cancelled and the account owner was alerted." };
  }
  await challenge.save();
  const left = MAX_CODE_ATTEMPTS - challenge.attempts;
  return { ok: false, error: `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` };
}

export async function resendChallengeCode(): Promise<{ ok: boolean; message: string; restart?: RestartReason }> {
  const pending = await getPendingChallenge();
  if (!pending) return { ok: false, restart: "expired", message: "This sign in has expired. Please enter your email and password again." };
  const { challenge, user } = pending;
  const wait = challenge.lastSentAt.getTime() + RESEND_COOLDOWN_MS - Date.now();
  if (wait > 0) return { ok: false, message: `Please wait ${Math.ceil(wait / 1000)} seconds before asking for another code.` };
  if (challenge.sends >= MAX_SENDS) return { ok: false, message: "No more codes can be sent for this sign in. Please start again." };

  const code = newCode();
  challenge.codeHash = codeHash(challenge._id.toString(), code);
  challenge.sends += 1;
  challenge.lastSentAt = new Date();
  challenge.expiresAt = new Date(Date.now() + CODE_MINUTES * 60 * 1000);
  await challenge.save();
  if (!(await deliverCode(user, challenge, code))) return { ok: false, message: "We could not send a new code. Please try again in a moment." };
  return { ok: true, message: "A new code is on its way. Earlier codes no longer work." };
}

export async function cancelChallenge() {
  const pending = await getPendingChallenge();
  if (pending) await pending.challenge.deleteOne();
  await clearChallengeCookie();
}

/** Seconds until another code may be requested, for the countdown on the code page. */
export function resendWaitSeconds(challenge: LoginChallengeDoc) {
  return Math.max(0, Math.ceil((challenge.lastSentAt.getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000));
}

export { MAX_SENDS };
