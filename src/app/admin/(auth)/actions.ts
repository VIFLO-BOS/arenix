"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import type { FormState } from "@/lib/validation/form-state";
import { acceptInviteSchema, fieldErrors, loginSchema, resetPasswordSchema } from "@/lib/validation/forms";
import { createSession, loginWithPassword, logout, requestIp } from "@/server/auth/session";
import { acceptInvitation, requestPasswordReset, resetPassword } from "@/server/services/team";
import { rateLimit } from "@/lib/rate-limit";

function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/admin") && !v.startsWith("//") ? v : "/admin";
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const result = await loginWithPassword(parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, message: result.error };
  redirect(safeNext(fd.get("next")));
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
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000).ok) return { ok: false, message: "Too many attempts. Please wait before trying again." };
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
