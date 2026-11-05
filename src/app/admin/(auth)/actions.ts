"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import type { FormState } from "@/lib/validation/form-state";
import { acceptInviteSchema, fieldErrors, loginSchema, resetPasswordSchema } from "@/lib/validation/forms";
import { completeLogin, createSession, logout, requestIp, verifyPasswordLogin } from "@/server/auth/session";
import { cancelChallenge, resendChallengeCode, startChallenge, twoStepMode, verifyChallengeCode } from "@/server/auth/two-step";
import { rateLimitDb } from "@/server/auth/rate-limit-db";
import { hashIp } from "@/server/auth/crypto";
import { acceptInvitation, requestPasswordReset, resetPassword } from "@/server/services/team";

function safeNext(value: FormDataEntryValue | string | null | undefined) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") && !v.startsWith("//") && !v.startsWith("/admin/login") ? v : "/admin";
}

/** Step one. A correct password leads to the code step, or straight in when two step is off. */
export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const check = await verifyPasswordLogin(parsed.data.email, parsed.data.password);
  if (!check.ok) return { ok: false, message: check.error };
  const next = safeNext(fd.get("next"));
  if (twoStepMode() === "off") {
    await completeLogin(check.user, check.ip, "password");
    redirect(next);
  }
  const started = await startChallenge(check.user, check.ip, next);
  if (!started.ok) return { ok: false, message: started.error };
  redirect("/admin/login/verify");
}

/** Step two. The six digit code from the email. */
export async function verifyCodeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = String(fd.get("code") ?? "");
  if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) return { ok: false, message: "Enter the six digit code from the email." };
  const result = await verifyChallengeCode(code);
  if (!result.ok) {
    if (result.restart) redirect(`/admin/login?notice=${result.restart}`);
    return { ok: false, message: result.error };
  }
  redirect(safeNext(result.next));
}

export async function resendCodeAction(): Promise<FormState> {
  const result = await resendChallengeCode();
  if (result.restart) redirect(`/admin/login?notice=${result.restart}`);
  return { ok: result.ok, message: result.message };
}

export async function cancelSignInAction() {
  await cancelChallenge();
  redirect("/admin/login");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function acceptInviteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = acceptInviteSchema.safeParse({ token: fd.get("token"), name: fd.get("name"), password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  try {
    const user = await acceptInvitation(parsed.data);
    await createSession(user, await requestIp());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not accept the invitation." };
  }
  redirect("/admin");
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.email() }).safeParse({ email: fd.get("email") });
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await rateLimitDb(`forgot:${hashIp(ip) ?? "unknown"}`, 5, 15 * 60 * 1000)).ok) return { ok: false, message: "Too many attempts. Please wait before trying again." };
  await requestPasswordReset(parsed.data.email);
  return { ok: true, message: "If an active account exists for that email, a reset link has been sent (or logged in demo mode)." };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({ token: fd.get("token"), password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  try {
    const user = await resetPassword(parsed.data);
    await createSession(user, await requestIp());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reset the password." };
  }
  redirect("/admin");
}
