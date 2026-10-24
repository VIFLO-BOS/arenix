"use server";

import { headers } from "next/headers";
import { contactFormSchema, fieldErrors } from "@/lib/validation/forms";
import { formValues, type FormState } from "@/lib/validation/form-state";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/server/auth/crypto";
import { createContactInquiry } from "@/server/services/inquiries";

const KEYS = ["name", "email", "subject", "message", "phone", "preferredContact"];

export async function submitContact(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, KEYS);
  const raw = {
    ...values,
    consent: fd.get("consent") === "on",
    website: String(fd.get("website") ?? ""),
    sourcePath: String(fd.get("sourcePath") ?? ""),
    idempotencyKey: String(fd.get("idempotencyKey") ?? ""),
  };
  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields.", values };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000).ok) return { ok: false, message: "Too many submissions from this network. Please try again in a few minutes.", values };

  try {
    const result = await createContactInquiry(parsed.data, { ipHash: hashIp(ip), userAgent: h.get("user-agent")?.slice(0, 300) ?? undefined });
    return { ok: true, reference: result.reference, message: result.duplicate ? "This message was already received." : "Message saved." };
  } catch (err) {
    console.error("[contact] submit failed", err);
    return { ok: false, message: "We could not save your message right now. Nothing was lost on your side. Please try again in a moment or use WhatsApp.", values };
  }
}
