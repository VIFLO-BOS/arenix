import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { Client, Lead, Proposal, type ProposalStatus } from "@/server/db/models/crm";
import { makeReference } from "./reference";
import { recordAudit } from "./audit";
import { emailTemplates, enqueueEmail } from "./email";
import { roleHas } from "@/server/auth/permissions";
import type { CurrentUser } from "@/server/auth/session";
import { formatDate } from "@/lib/utils";

export type ProposalVersionInput = {
  summary?: string;
  scope?: string;
  deliverables: string[];
  lineItems: { label: string; quantity: number; unitAmount: number; description?: string }[];
  currency: string;
  taxRatePercent?: number;
  validUntil?: Date;
  notes?: string;
};

const TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "APPROVED"],
  APPROVED: ["DRAFT", "SENT"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "DRAFT"],
  ACCEPTED: [],
  REJECTED: ["DRAFT"],
  EXPIRED: ["DRAFT"],
};

export async function listProposals(opts: { status?: string; page?: number }) {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  const limit = 20;
  const page = Math.max(1, opts.page ?? 1);
  const [items, total] = await Promise.all([Proposal.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate("clientId", "name email").populate("leadId", "title").lean(), Proposal.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getProposal(id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  return Proposal.findById(id).populate("clientId", "name email").populate("leadId", "title status").populate("ownerId", "name").populate("approvedBy", "name").lean();
}

export async function createProposal(actor: CurrentUser, input: { title: string; leadId?: string; clientId?: string } & ProposalVersionInput) {
  await connectDb();
  let clientId = input.clientId ? new Types.ObjectId(input.clientId) : undefined;
  if (!clientId && input.leadId) {
    const lead = await Lead.findById(input.leadId).lean();
    clientId = lead?.clientId ?? undefined;
  }
  let reference = makeReference("PRP");
  while (await Proposal.exists({ reference })) reference = makeReference("PRP");
  const doc = await Proposal.create({
    reference,
    title: input.title,
    status: "DRAFT",
    leadId: input.leadId ? new Types.ObjectId(input.leadId) : undefined,
    clientId,
    ownerId: new Types.ObjectId(actor.id),
    currentVersion: 1,
    versions: [{ version: 1, ...versionBody(input), createdBy: new Types.ObjectId(actor.id), createdAt: new Date() }],
    statusHistory: [{ to: "DRAFT", actorId: new Types.ObjectId(actor.id), actorLabel: actor.name, at: new Date() }],
  });
  if (input.leadId) await Lead.updateOne({ _id: input.leadId }, { $addToSet: { proposalIds: doc._id } });
  await recordAudit({ actor, action: "proposal.create", entityType: "Proposal", entityId: doc._id.toString(), metadata: { reference } });
  return doc;
}

function versionBody(v: ProposalVersionInput) {
  return {
    summary: v.summary || undefined,
    scope: v.scope || undefined,
    deliverables: v.deliverables,
    lineItems: v.lineItems,
    currency: v.currency.toUpperCase(),
    taxRatePercent: v.taxRatePercent ?? 0,
    validUntil: v.validUntil,
    notes: v.notes || undefined,
  };
}

export async function addProposalVersion(actor: CurrentUser, id: string, input: ProposalVersionInput) {
  await connectDb();
  const doc = await Proposal.findById(id);
  if (!doc) throw new Error("Proposal not found");
  if (!["DRAFT", "IN_REVIEW"].includes(doc.status)) {
    // Editing after approval/sending creates a new version and returns to DRAFT.
    doc.statusHistory.push({ from: doc.status, to: "DRAFT", actorId: new Types.ObjectId(actor.id), actorLabel: actor.name, note: "New version created", at: new Date() });
    doc.status = "DRAFT";
    doc.approvedAt = undefined;
    doc.approvedBy = undefined;
  }
  const version = doc.currentVersion + 1;
  doc.versions.push({ version, ...versionBody(input), createdBy: new Types.ObjectId(actor.id), createdAt: new Date() });
  doc.currentVersion = version;
  await doc.save();
  await recordAudit({ actor, action: "proposal.version", entityType: "Proposal", entityId: id, metadata: { version } });
  return doc;
}

export async function transitionProposal(actor: CurrentUser, id: string, to: ProposalStatus, opts?: { note?: string; sentTo?: string }) {
  await connectDb();
  const doc = await Proposal.findById(id);
  if (!doc) throw new Error("Proposal not found");
  const from = doc.status;
  if (!TRANSITIONS[from].includes(to)) throw new Error(`Cannot move a proposal from ${from} to ${to}.`);
  if (to === "APPROVED" && !roleHas(actor.role, "proposals:approve")) throw new Error("Your role cannot approve proposals.");
  if (to === "SENT" && !roleHas(actor.role, "proposals:send")) throw new Error("Your role cannot send proposals.");
  if (to === "SENT" && from !== "APPROVED") throw new Error("Only approved proposals can be sent.");

  if (to === "APPROVED") {
    doc.approvedBy = new Types.ObjectId(actor.id);
    doc.approvedAt = new Date();
  }
  if (to === "SENT") {
    const client = doc.clientId ? await Client.findById(doc.clientId).lean() : null;
    const email = opts?.sentTo || client?.email;
    if (!email) throw new Error("No recipient email. Add a client email or enter one.");
    const current = doc.versions.find((v) => v.version === doc.currentVersion);
    const t = emailTemplates.proposalSent({ clientName: client?.name ?? "there", title: doc.title, reference: doc.reference, version: doc.currentVersion, summary: current?.summary ?? undefined, validUntil: current?.validUntil ? formatDate(current.validUntil) : undefined });
    await enqueueEmail({ to: email, subject: t.subject, html: t.html, text: t.text, template: "proposal-sent", entityType: "Proposal", entityId: id });
    doc.sentAt = new Date();
    doc.sentTo = email;
    if (doc.leadId) await Lead.updateOne({ _id: doc.leadId, status: { $in: ["NEW", "CONTACTED", "QUALIFIED"] } }, { $set: { status: "PROPOSAL_SENT" }, $push: { statusHistory: { to: "PROPOSAL_SENT", actorLabel: actor.name, note: `Proposal ${doc.reference} sent`, at: new Date() } } });
  }
  if (to === "ACCEPTED" || to === "REJECTED") {
    doc.decisionAt = new Date();
    doc.decisionNote = opts?.note;
    // A recorded acceptance moves the lead to WON explicitly (staff action, not automatic on open).
    if (doc.leadId) {
      const leadStatus = to === "ACCEPTED" ? "WON" : "LOST";
      await Lead.updateOne({ _id: doc.leadId }, { $set: { status: leadStatus, ...(to === "ACCEPTED" ? { wonAt: new Date() } : { lostReason: opts?.note || "Proposal rejected" }) }, $push: { statusHistory: { to: leadStatus, actorLabel: actor.name, note: `Proposal ${doc.reference} ${to.toLowerCase()}`, at: new Date() } } });
    }
  }
  doc.status = to;
  doc.statusHistory.push({ from, to, actorId: new Types.ObjectId(actor.id), actorLabel: actor.name, note: opts?.note, at: new Date() });
  await doc.save();
  await recordAudit({ actor, action: "proposal.status", entityType: "Proposal", entityId: id, metadata: { from, to } });
  return doc;
}

export function proposalTotals(v: { lineItems: { quantity: number; unitAmount: number }[]; taxRatePercent?: number }) {
  const subtotal = v.lineItems.reduce((s, li) => s + li.quantity * li.unitAmount, 0);
  const tax = subtotal * ((v.taxRatePercent ?? 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}
