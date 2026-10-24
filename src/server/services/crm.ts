import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { Booking, Client, Inquiry, Lead, Organization, Proposal, type InquiryStatus, type LeadStatus } from "@/server/db/models/crm";
import { User } from "@/server/db/models/user";
import { recordAudit } from "./audit";
import { notifyUser } from "./notifications";
import { emailTemplates, enqueueEmail } from "./email";
import { env } from "@/lib/env";
import type { CurrentUser } from "@/server/auth/session";

const PAGE = 20;

function paged(page: number) {
  const p = Math.max(1, page || 1);
  return { skip: (p - 1) * PAGE, limit: PAGE, page: p };
}

/* ----------------------------- Inquiries ----------------------------- */

export async function listInquiries(opts: { status?: string; type?: string; q?: string; page?: number }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.type) filter.type = opts.type;
  if (opts.q) filter.$or = [{ name: new RegExp(opts.q, "i") }, { email: new RegExp(opts.q, "i") }, { reference: new RegExp(opts.q, "i") }, { company: new RegExp(opts.q, "i") }];
  const { skip, limit, page } = paged(opts.page ?? 1);
  const [items, total] = await Promise.all([Inquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("assignedTo", "name").lean(), Inquiry.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getInquiry(id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  return Inquiry.findById(id).populate("assignedTo", "name email").populate("leadId", "title status").lean();
}

export async function updateInquiryStatus(actor: CurrentUser, id: string, status: InquiryStatus, note?: string) {
  await connectDb();
  const doc = await Inquiry.findById(id);
  if (!doc) throw new Error("Inquiry not found");
  const from = doc.status;
  doc.status = status;
  doc.statusHistory.push({ from, to: status, actorId: new Types.ObjectId(actor.id), actorLabel: actor.name, note, at: new Date() });
  await doc.save();
  if (status === "QUALIFIED" && doc.leadId) {
    await Lead.updateOne({ _id: doc.leadId, status: { $in: ["NEW", "CONTACTED"] } }, { $set: { status: "QUALIFIED" }, $push: { statusHistory: { to: "QUALIFIED", actorLabel: actor.name, note: "Inquiry qualified", at: new Date() } } });
  }
  if (status === "SPAM" && doc.leadId) {
    await Lead.updateOne({ _id: doc.leadId }, { $set: { status: "ARCHIVED", archivedAt: new Date() }, $push: { statusHistory: { to: "ARCHIVED", actorLabel: actor.name, note: "Inquiry marked spam", at: new Date() } } });
  }
  await recordAudit({ actor, action: "inquiry.status", entityType: "Inquiry", entityId: id, metadata: { from, to: status } });
}

export async function addInquiryNote(actor: CurrentUser, id: string, body: string) {
  await connectDb();
  await Inquiry.updateOne({ _id: id }, { $push: { internalNotes: { body, authorId: actor.id, authorLabel: actor.name, at: new Date() } } });
  await recordAudit({ actor, action: "inquiry.note", entityType: "Inquiry", entityId: id });
}

export async function assignInquiry(actor: CurrentUser, id: string, userId: string | null) {
  await connectDb();
  const doc = await Inquiry.findById(id);
  if (!doc) throw new Error("Inquiry not found");
  doc.assignedTo = userId ? new Types.ObjectId(userId) : undefined;
  await doc.save();
  if (doc.leadId) await Lead.updateOne({ _id: doc.leadId }, { $set: { assignedTo: userId ? new Types.ObjectId(userId) : undefined } });
  if (userId && userId !== actor.id) await notifyUser({ userId, type: "inquiry.assigned", title: `Inquiry ${doc.reference} assigned to you`, link: `/admin/inquiries/${id}` });
  await recordAudit({ actor, action: "inquiry.assign", entityType: "Inquiry", entityId: id, metadata: { userId } });
}

/* ------------------------------- Leads ------------------------------- */

export async function listLeads(opts: { status?: string; q?: string; assignedTo?: string; page?: number; all?: boolean }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  else if (!opts.all) filter.status = { $ne: "ARCHIVED" };
  if (opts.assignedTo) filter.assignedTo = opts.assignedTo;
  if (opts.q) filter.title = new RegExp(opts.q, "i");
  const { skip, limit, page } = paged(opts.page ?? 1);
  const [items, total] = await Promise.all([Lead.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate("clientId", "name email").populate("assignedTo", "name").lean(), Lead.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function leadsByStage() {
  await connectDb();
  const stages: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST", "ON_HOLD"];
  const docs = await Lead.find({ status: { $in: stages } }).sort({ updatedAt: -1 }).limit(300).populate("clientId", "name").populate("assignedTo", "name").lean();
  return stages.map((s) => ({ stage: s, leads: docs.filter((d) => d.status === s) }));
}

export async function getLead(id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  const lead = await Lead.findById(id).populate("clientId").populate("assignedTo", "name email").populate("inquiryId", "reference type message goal serviceCategory").lean();
  if (!lead) return null;
  const [bookings, proposals] = await Promise.all([Booking.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean(), Proposal.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean()]);
  return { lead, bookings, proposals };
}

export async function updateLead(
  actor: CurrentUser,
  id: string,
  patch: { title?: string; status?: LeadStatus; priority?: "LOW" | "MEDIUM" | "HIGH"; assignedTo?: string | null; estimatedValue?: number; currency?: string; followUpAt?: Date; followUpNote?: string; lostReason?: string; note?: string },
) {
  await connectDb();
  const lead = await Lead.findById(id);
  if (!lead) throw new Error("Lead not found");
  const changes: string[] = [];
  if (patch.title && patch.title !== lead.title) {
    lead.title = patch.title;
    changes.push("title");
  }
  if (patch.status && patch.status !== lead.status) {
    const from = lead.status;
    lead.status = patch.status;
    lead.statusHistory.push({ from, to: patch.status, actorId: new Types.ObjectId(actor.id), actorLabel: actor.name, note: patch.note, at: new Date() });
    lead.activities.push({ kind: "STATUS", body: `Status ${from} → ${patch.status}${patch.note ? `: ${patch.note}` : ""}`, authorId: new Types.ObjectId(actor.id), authorLabel: actor.name, at: new Date() });
    if (patch.status === "CONTACTED" && !lead.firstResponseAt) lead.firstResponseAt = new Date();
    if (patch.status === "WON") lead.wonAt = new Date();
    if (patch.status === "ARCHIVED") lead.archivedAt = new Date();
    changes.push(`status:${from}→${patch.status}`);
  }
  if (patch.priority && patch.priority !== lead.priority) {
    lead.priority = patch.priority;
    changes.push("priority");
  }
  if (patch.assignedTo !== undefined) {
    const next = patch.assignedTo ? new Types.ObjectId(patch.assignedTo) : undefined;
    if (String(next ?? "") !== String(lead.assignedTo ?? "")) {
      lead.assignedTo = next;
      lead.activities.push({ kind: "ASSIGNMENT", body: next ? "Reassigned" : "Unassigned", authorId: new Types.ObjectId(actor.id), authorLabel: actor.name, at: new Date() });
      if (patch.assignedTo && patch.assignedTo !== actor.id) await notifyUser({ userId: patch.assignedTo, type: "lead.assigned", title: `Lead assigned to you: ${lead.title}`, link: `/admin/leads/${id}` });
      changes.push("assignment");
    }
  }
  if (patch.estimatedValue !== undefined) lead.estimatedValue = patch.estimatedValue;
  if (patch.currency) lead.currency = patch.currency.toUpperCase();
  if (patch.followUpAt !== undefined) lead.followUpAt = patch.followUpAt;
  if (patch.followUpNote !== undefined) lead.followUpNote = patch.followUpNote || undefined;
  if (patch.lostReason !== undefined) lead.lostReason = patch.lostReason || undefined;
  await lead.save();
  await recordAudit({ actor, action: "lead.update", entityType: "Lead", entityId: id, metadata: { changes } });
  return lead;
}

export async function addLeadActivity(actor: CurrentUser, id: string, kind: "NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP", body: string) {
  await connectDb();
  const lead = await Lead.findById(id);
  if (!lead) throw new Error("Lead not found");
  lead.activities.push({ kind, body, authorId: new Types.ObjectId(actor.id), authorLabel: actor.name, at: new Date() });
  if (!lead.firstResponseAt && kind !== "NOTE") lead.firstResponseAt = new Date();
  if (lead.status === "NEW" && kind !== "NOTE") {
    lead.statusHistory.push({ from: "NEW", to: "CONTACTED", actorLabel: actor.name, note: `Auto: ${kind.toLowerCase()} logged`, at: new Date() });
    lead.status = "CONTACTED";
  }
  await lead.save();
  await recordAudit({ actor, action: "lead.activity", entityType: "Lead", entityId: id, metadata: { kind } });
}

/** Sends due follow-up reminders (called from the notifications page "run reminders" action). */
export async function dispatchDueFollowUps(actor: CurrentUser) {
  await connectDb();
  const due = await Lead.find({ followUpAt: { $lte: new Date() }, status: { $nin: ["WON", "LOST", "ARCHIVED"] }, assignedTo: { $exists: true } }).populate("assignedTo", "name email").lean();
  let sent = 0;
  for (const l of due) {
    const assignee = l.assignedTo as unknown as { _id: Types.ObjectId; name: string; email: string } | null;
    if (!assignee?.email) continue;
    const t = emailTemplates.followUpDue({ assigneeName: assignee.name, leadTitle: l.title, adminUrl: `${env.siteUrl}/admin/leads/${l._id.toString()}` });
    await enqueueEmail({ to: assignee.email, subject: t.subject, html: t.html, text: t.text, template: "follow-up-due", entityType: "Lead", entityId: l._id.toString() });
    await notifyUser({ userId: assignee._id.toString(), type: "lead.followup_due", title: `Follow-up due: ${l.title}`, link: `/admin/leads/${l._id.toString()}` });
    sent++;
  }
  await recordAudit({ actor, action: "lead.followups_dispatched", metadata: { sent } });
  return sent;
}

/* ------------------------------ Clients ------------------------------ */

export async function listClients(opts: { q?: string; page?: number }) {
  await connectDb();
  const filter: Record<string, unknown> = { archivedAt: { $exists: false } };
  if (opts.q) filter.$or = [{ name: new RegExp(opts.q, "i") }, { email: new RegExp(opts.q, "i") }];
  const { skip, limit, page } = paged(opts.page ?? 1);
  const [items, total] = await Promise.all([Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("organizationId", "name").lean(), Client.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getClient(id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  const client = await Client.findById(id).populate("organizationId").lean();
  if (!client) return null;
  const [leads, bookings, inquiries] = await Promise.all([Lead.find({ clientId: client._id }).sort({ updatedAt: -1 }).lean(), Booking.find({ clientId: client._id }).sort({ createdAt: -1 }).lean(), Inquiry.find({ email: client.email }).sort({ createdAt: -1 }).lean()]);
  return { client, leads, bookings, inquiries };
}

export async function upsertClient(actor: CurrentUser, input: { id?: string; name: string; email?: string; phone?: string; whatsapp?: string; jobTitle?: string; organizationName?: string; preferredContact: "EMAIL" | "PHONE" | "WHATSAPP"; tags?: string; notes?: string; marketingConsent?: boolean }) {
  await connectDb();
  let organizationId: Types.ObjectId | undefined;
  if (input.organizationName) {
    const org = (await Organization.findOne({ name: new RegExp(`^${input.organizationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) ?? (await Organization.create({ name: input.organizationName }));
    organizationId = org._id;
  }
  const data = {
    name: input.name,
    email: input.email?.toLowerCase() || undefined,
    phone: input.phone || undefined,
    whatsapp: input.whatsapp || undefined,
    jobTitle: input.jobTitle || undefined,
    organizationId,
    preferredContact: input.preferredContact,
    tags: (input.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    notes: input.notes || undefined,
    marketingConsent: !!input.marketingConsent,
  };
  const doc = input.id ? await Client.findByIdAndUpdate(input.id, { $set: data }, { new: true }) : await Client.create({ ...data, source: "manual" });
  if (!doc) throw new Error("Client not found");
  await recordAudit({ actor, action: input.id ? "client.update" : "client.create", entityType: "Client", entityId: doc._id.toString() });
  return doc;
}

/* ------------------------------ Bookings ----------------------------- */

export async function listBookings(opts: { status?: string; page?: number; upcoming?: boolean }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.upcoming) filter.startsAt = { $gte: new Date() };
  const { skip, limit, page } = paged(opts.page ?? 1);
  const [items, total] = await Promise.all([Booking.find(filter).sort(opts.upcoming ? { startsAt: 1 } : { createdAt: -1 }).skip(skip).limit(limit).lean(), Booking.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getBooking(id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  return Booking.findById(id).populate("clientId", "name email").populate("leadId", "title status").lean();
}

export async function listStaffOptions() {
  await connectDb();
  return User.find({ isActive: true }).select("name role").sort({ name: 1 }).lean();
}
