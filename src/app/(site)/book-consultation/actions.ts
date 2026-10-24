"use server";

import { headers } from "next/headers";
import { consultationRequestSchema, fieldErrors } from "@/lib/validation/forms";
import { formValues, type FormState } from "@/lib/validation/form-state";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/server/auth/crypto";
import { createConsultationRequest } from "@/server/services/bookings";

const KEYS = ["consultationType", "serviceContext", "name", "email", "phone", "company", "summary", "visitorTimezone"];

export async function submitConsultationRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, KEYS);
  const raw = {
    ...values,
    preferredWindows: fd.getAll("preferredWindows").map(String).filter(Boolean),
    consent: fd.get("consent") === "on",
    website: String(fd.get("website") ?? ""),
    idempotencyKey: String(fd.get("idempotencyKey") ?? ""),
  };
  const parsed = consultationRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields.", values };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`booking:${ip}`, 4, 10 * 60 * 1000).ok) return { ok: false, message: "Too many requests from this network. Please try again in a few minutes.", values };

  try {
    const result = await createConsultationRequest(parsed.data, { ipHash: hashIp(ip) });
    return { ok: true, reference: result.reference, message: "Request saved." };
  } catch (err) {
    console.error("[book-consultation] submit failed", err);
    return { ok: false, message: "We could not save your request right now. Please try again shortly.", values };
  }
}
