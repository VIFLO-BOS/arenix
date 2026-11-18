import "server-only";
import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import type { FormState } from "@/lib/validation/form-state";
import { fieldErrors } from "@/lib/validation/forms";
import { requirePermission, AuthorizationError, type CurrentUser } from "@/server/auth/session";
import type { Permission } from "@/server/auth/permissions";

/** Shared plumbing for the admin server actions: permission check, validation, revalidation. */

export function fdToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (v instanceof File) continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      const existing = out[key] as string[] | undefined;
      if (existing) existing.push(v);
      else out[key] = [v];
    } else out[k] = v;
  }
  return out;
}

export async function run<T>(permission: Permission, schema: ZodType<T>, fd: FormData, fn: (user: CurrentUser, data: T) => Promise<string | void>, revalidate: string[] = ["/admin"]): Promise<FormState> {
  let user: CurrentUser;
  try {
    user = await requirePermission(permission);
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: err.message };
    throw err;
  }
  const parsed = schema.safeParse(fdToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  try {
    const msg = await fn(user, parsed.data);
    for (const p of revalidate) revalidatePath(p, "layout");
    return { ok: true, message: msg || "Saved." };
  } catch (err) {
    return { ok: false, message: safeErrorMessage(err) };
  }
}

/**
 * Only messages the app wrote on purpose (plain Error and AuthorizationError) are shown.
 * Anything else, such as a database error, could reveal internal details, so it is logged
 * on the server and the person sees a general message.
 */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error && (err.constructor === Error || err.name === "AuthorizationError")) return err.message;
  console.error("[admin action] unexpected error", err);
  return "Something went wrong. Please try again, and contact the site administrator if it keeps happening.";
}
