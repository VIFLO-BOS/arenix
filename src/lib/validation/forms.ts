import { z } from "zod";
import { CONSULTATION_TYPES } from "@/types/content";

const trimmed = (max: number) => z.string().trim().max(max);

export const contactMethodSchema = z.enum(["EMAIL", "PHONE", "WHATSAPP"]);

export const BUDGET_RANGES = [
  "Not sure yet",
  "Under ₦1m",
  "₦1m to ₦3m",
  "₦3m to ₦10m",
  "₦10m+",
  "Prefer to discuss",
] as const;

export const TIMELINES = ["As soon as possible", "Within 1 month", "1 to 3 months", "3 to 6 months", "Flexible, still exploring"] as const;

const honeypot = z.string().max(0, "Spam check failed").optional().or(z.literal(""));

export const contactFormSchema = z.object({
  name: trimmed(120).min(2, "Please enter your name"),
  email: z.email("Enter a valid email address").max(200),
  subject: trimmed(160).min(3, "Add a short subject"),
  message: trimmed(5000).min(20, "Tell us a little more (at least 20 characters)"),
  phone: trimmed(40).optional().or(z.literal("")),
  preferredContact: contactMethodSchema.default("EMAIL"),
  consent: z.literal(true, { error: "Please agree so we can reply to you" }),
  website: honeypot, // honeypot
  sourcePath: trimmed(300).optional(),
  idempotencyKey: trimmed(80).optional(),
});
export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const projectRequestSchema = z.object({
  name: trimmed(120).min(2, "Please enter your name"),
  email: z.email("Enter a valid email address").max(200),
  company: trimmed(160).optional().or(z.literal("")),
  phone: trimmed(40).optional().or(z.literal("")),
  serviceCategory: trimmed(120).min(1, "Choose the closest service category"),
  solutionContext: trimmed(120).optional().or(z.literal("")),
  projectContext: trimmed(120).optional().or(z.literal("")),
  goal: trimmed(400).min(10, "Describe the business goal in a sentence or two"),
  message: trimmed(6000).min(30, "Describe the project (at least 30 characters)"),
  features: trimmed(3000).optional().or(z.literal("")),
  budgetRange: z.enum(BUDGET_RANGES).optional().or(z.literal("")),
  timeline: z.enum(TIMELINES).optional().or(z.literal("")),
  preferredContact: contactMethodSchema.default("EMAIL"),
  consent: z.literal(true, { error: "Please agree so we can contact you about this request" }),
  website: honeypot,
  sourcePath: trimmed(300).optional(),
  idempotencyKey: trimmed(80).optional(),
});
export type ProjectRequestInput = z.infer<typeof projectRequestSchema>;

const consultationKeys = CONSULTATION_TYPES.map((c) => c.key) as [string, ...string[]];

export const consultationRequestSchema = z.object({
  consultationType: z.enum(consultationKeys),
  serviceContext: trimmed(120).optional().or(z.literal("")),
  name: trimmed(120).min(2, "Please enter your name"),
  email: z.email("Enter a valid email address").max(200),
  phone: trimmed(40).optional().or(z.literal("")),
  company: trimmed(160).optional().or(z.literal("")),
  summary: trimmed(2000).min(10, "Tell us what you would like to discuss"),
  preferredWindows: z.array(trimmed(80)).max(5).default([]),
  visitorTimezone: trimmed(80).optional().or(z.literal("")),
  consent: z.literal(true, { error: "Please agree so we can contact you to schedule" }),
  website: honeypot,
  idempotencyKey: trimmed(80).optional(),
});
export type ConsultationRequestInput = z.infer<typeof consultationRequestSchema>;

export const loginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(8).max(200),
});

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Mix upper case, lower case and numbers");

export const acceptInviteSchema = z
  .object({
    token: z.string().min(10),
    name: trimmed(120).min(2),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const resetPasswordSchema = z
  .object({ token: z.string().min(10), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 3;

export const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Flattens Zod issues into { field: message } for form UIs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
