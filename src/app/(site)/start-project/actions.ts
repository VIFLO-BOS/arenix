"use server";

import { headers } from "next/headers";
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES, fieldErrors, projectRequestSchema } from "@/lib/validation/forms";
import { formValues, type FormState } from "@/lib/validation/form-state";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/server/auth/crypto";
import { createProjectInquiry } from "@/server/services/inquiries";
import { saveUploadedFile, sniffMime, type StoredFile } from "@/server/services/storage";

const KEYS = ["name", "email", "company", "phone", "serviceCategory", "solutionContext", "projectContext", "goal", "message", "features", "budgetRange", "timeline", "preferredContact"];

export async function submitProjectRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, KEYS);
  const raw = {
    ...values,
    consent: fd.get("consent") === "on",
    website: String(fd.get("website") ?? ""),
    sourcePath: String(fd.get("sourcePath") ?? ""),
    idempotencyKey: String(fd.get("idempotencyKey") ?? ""),
  };
  const parsed = projectRequestSchema.safeParse(raw);
  const errors = parsed.success ? {} : fieldErrors(parsed.error);

  // Attachments are checked server side for allowlist, size, count and magic bytes.
  const files = fd.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_UPLOAD_FILES) errors.attachments = `Attach at most ${MAX_UPLOAD_FILES} files.`;
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) errors.attachments = `${f.name} is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
    else if (!ALLOWED_UPLOAD_MIME.has(f.type)) errors.attachments = `${f.name} has a file type that is not allowed (PDF, images, Word or text only).`;
  }
  if (Object.keys(errors).length) return { ok: false, errors, message: "Please fix the highlighted fields.", values };
  if (!parsed.success) return { ok: false, message: "Validation failed.", values };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`project:${ip}`, 4, 10 * 60 * 1000).ok) return { ok: false, message: "Too many submissions from this network. Please try again in a few minutes.", values };

  const stored: StoredFile[] = [];
  try {
    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer());
      if (!sniffMime(buf, f.type)) return { ok: false, errors: { attachments: `${f.name} does not match its declared type and was rejected.` }, message: "Attachment rejected.", values };
      stored.push(await saveUploadedFile(f, "attachments"));
    }
  } catch (err) {
    console.error("[start-project] upload failed", err);
    return { ok: false, errors: { attachments: "We could not store the attachment. Try again without it or use a smaller file." }, message: "Upload failed.", values };
  }

  try {
    const result = await createProjectInquiry(parsed.data, stored, { ipHash: hashIp(ip), userAgent: h.get("user-agent")?.slice(0, 300) ?? undefined });
    return { ok: true, reference: result.reference, message: result.duplicate ? "This request was already received." : "Request saved." };
  } catch (err) {
    console.error("[start-project] submit failed", err);
    return { ok: false, message: "We could not save your request right now. Please try again in a moment. Nothing you typed has been sent anywhere else.", values };
  }
}
