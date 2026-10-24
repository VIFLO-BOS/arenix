import "server-only";
import { connectDb } from "@/server/db/connect";
import { Client, Inquiry, Lead } from "@/server/db/models/crm";
import { makeReference } from "./reference";
import { emailTemplates, enqueueEmail, staffRecipients } from "./email";
import { notifyRoles } from "./notifications";
import { recordAudit } from "./audit";
import { env } from "@/lib/env";
import type { ContactFormInput, ProjectRequestInput } from "@/lib/validation/forms";
import type { StoredFile } from "./storage";
import { SiteSetting } from "@/server/db/models/cms";

type Meta = { ipHash?: string; userAgent?: string };

async function notificationRecipients(kind: "inquiryEmails" | "bookingEmails") {
  try {
    const s = await SiteSetting.findOne({ key: "site" }).lean();
    const list = (s?.notifications?.[kind] ?? []) as string[];
    return staffRecipients(list);
  } catch {
    return staffRecipients();
  }
}

/** Finds or creates a CRM client by email (no duplicates), returns its id. */
async function upsertClient(input: { name: string; email: string; phone?: string; company?: string; preferredContact?: "EMAIL" | "PHONE" | "WHATSAPP" }) {
  const existing = await Client.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    if (!existing.phone && input.phone) existing.phone = input.phone;
    if (input.preferredContact) existing.preferredContact = input.preferredContact;
    await existing.save();
    return existing._id;
  }
  const created = await Client.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone || undefined,
    preferredContact: input.preferredContact ?? "EMAIL",
    source: "website",
    notes: input.company ? `Company: ${input.company}` : undefined,
  });
  return created._id;
}

async function uniqueReference(prefix: "INQ" | "BKG") {
  for (let i = 0; i < 5; i++) {
    const ref = makeReference(prefix);
    const exists = await Inquiry.exists({ reference: ref });
    if (!exists) return ref;
  }
  return `${makeReference(prefix)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

export async function createContactInquiry(input: ContactFormInput, meta: Meta) {
  await connectDb();
  if (input.idempotencyKey) {
    const dup = await Inquiry.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (dup) return { reference: dup.reference, id: dup._id.toString(), duplicate: true as const };
  }
  const reference = await uniqueReference("INQ");
  const inquiry = await Inquiry.create({
    reference,
    type: "CONTACT",
    name: input.name,
    email: input.email,
    phone: input.phone || undefined,
    subject: input.subject,
    message: input.message,
    preferredContact: input.preferredContact,
    consent: true,
    sourcePath: input.sourcePath,
    idempotencyKey: input.idempotencyKey || undefined,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
    statusHistory: [{ to: "NEW", actorLabel: "visitor" }],
  });

  const clientId = await upsertClient({ name: input.name, email: input.email, phone: input.phone || undefined, preferredContact: input.preferredContact });
  const lead = await Lead.create({
    title: `${input.subject} — ${input.name}`,
    status: "NEW",
    source: "website:contact",
    clientId,
    inquiryId: inquiry._id,
    statusHistory: [{ to: "NEW", actorLabel: "system" }],
    activities: [{ kind: "SYSTEM", body: `Created from contact inquiry ${reference}`, authorLabel: "system" }],
  });
  inquiry.leadId = lead._id;
  await inquiry.save();

  const adminUrl = `${env.siteUrl}/admin/inquiries/${inquiry._id.toString()}`;
  const ack = emailTemplates.inquiryAcknowledgement({ name: input.name, reference, type: "CONTACT" });
  await enqueueEmail({ to: input.email, subject: ack.subject, html: ack.html, text: ack.text, template: "inquiry-ack", entityType: "Inquiry", entityId: inquiry._id.toString() });
  const alert = emailTemplates.inquiryStaffAlert({ reference, type: "CONTACT", name: input.name, email: input.email, message: `${input.subject}\n\n${input.message}`, adminUrl });
  const recipients = await notificationRecipients("inquiryEmails");
  if (recipients.length) await enqueueEmail({ to: recipients, subject: alert.subject, html: alert.html, text: alert.text, template: "inquiry-staff", entityType: "Inquiry", entityId: inquiry._id.toString() });
  await notifyRoles({ roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT"], type: "inquiry.new", title: `New inquiry ${reference}`, body: `${input.name}: ${input.subject}`, link: `/admin/inquiries/${inquiry._id.toString()}`, entityType: "Inquiry", entityId: inquiry._id.toString() });
  await recordAudit({ action: "inquiry.created", entityType: "Inquiry", entityId: inquiry._id.toString(), metadata: { reference, type: "CONTACT" }, ipHash: meta.ipHash });
  return { reference, id: inquiry._id.toString(), duplicate: false as const };
}

export async function createProjectInquiry(input: ProjectRequestInput, files: StoredFile[], meta: Meta) {
  await connectDb();
  if (input.idempotencyKey) {
    const dup = await Inquiry.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (dup) return { reference: dup.reference, id: dup._id.toString(), duplicate: true as const };
  }
  const reference = await uniqueReference("INQ");
  const inquiry = await Inquiry.create({
    reference,
    type: "PROJECT",
    name: input.name,
    email: input.email,
    company: input.company || undefined,
    phone: input.phone || undefined,
    serviceCategory: input.serviceCategory,
    solutionContext: input.solutionContext || undefined,
    projectContext: input.projectContext || undefined,
    goal: input.goal,
    message: input.message,
    features: input.features || undefined,
    budgetRange: input.budgetRange || undefined,
    timeline: input.timeline || undefined,
    preferredContact: input.preferredContact,
    consent: true,
    attachments: files.map((f) => ({ filename: f.filename, mime: f.mime, size: f.size, storageKey: f.storageKey, url: f.url })),
    sourcePath: input.sourcePath,
    idempotencyKey: input.idempotencyKey || undefined,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
    statusHistory: [{ to: "NEW", actorLabel: "visitor" }],
  });

  const clientId = await upsertClient({ name: input.name, email: input.email, phone: input.phone || undefined, company: input.company || undefined, preferredContact: input.preferredContact });
  const lead = await Lead.create({
    title: `${input.serviceCategory} — ${input.company || input.name}`,
    status: "NEW",
    source: "website:start-project",
    serviceCategory: input.serviceCategory,
    clientId,
    inquiryId: inquiry._id,
    statusHistory: [{ to: "NEW", actorLabel: "system" }],
    activities: [{ kind: "SYSTEM", body: `Created from project request ${reference}`, authorLabel: "system" }],
  });
  inquiry.leadId = lead._id;
  await inquiry.save();

  const adminUrl = `${env.siteUrl}/admin/inquiries/${inquiry._id.toString()}`;
  const ack = emailTemplates.inquiryAcknowledgement({ name: input.name, reference, type: "PROJECT" });
  await enqueueEmail({ to: input.email, subject: ack.subject, html: ack.html, text: ack.text, template: "inquiry-ack", entityType: "Inquiry", entityId: inquiry._id.toString() });
  const alert = emailTemplates.inquiryStaffAlert({ reference, type: "PROJECT", name: input.name, email: input.email, company: input.company || undefined, service: input.serviceCategory, message: `${input.goal}\n\n${input.message}`, adminUrl });
  const recipients = await notificationRecipients("inquiryEmails");
  if (recipients.length) await enqueueEmail({ to: recipients, subject: alert.subject, html: alert.html, text: alert.text, template: "inquiry-staff", entityType: "Inquiry", entityId: inquiry._id.toString() });
  await notifyRoles({ roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT"], type: "inquiry.new", title: `New project request ${reference}`, body: `${input.name} · ${input.serviceCategory}`, link: `/admin/inquiries/${inquiry._id.toString()}`, entityType: "Inquiry", entityId: inquiry._id.toString() });
  await recordAudit({ action: "inquiry.created", entityType: "Inquiry", entityId: inquiry._id.toString(), metadata: { reference, type: "PROJECT", attachments: files.length }, ipHash: meta.ipHash });
  return { reference, id: inquiry._id.toString(), duplicate: false as const };
}
