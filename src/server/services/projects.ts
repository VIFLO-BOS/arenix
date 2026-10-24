import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { InternalProject, type InternalProjectStatus } from "@/server/db/models/crm";
import { recordAudit } from "./audit";
import { notifyUser } from "./notifications";
import type { CurrentUser } from "@/server/auth/session";

/**
 * Internal delivery register. PROJECT_MANAGER users only see projects they own or are a
 * member of (object-level authorization); admins see everything.
 */
function scopeFor(actor: CurrentUser): Record<string, unknown> {
  if (actor.role === "PROJECT_MANAGER") {
    const id = new Types.ObjectId(actor.id);
    return { $or: [{ ownerId: id }, { memberIds: id }] };
  }
  return {};
}

export async function listInternalProjects(actor: CurrentUser, opts: { status?: string; page?: number }) {
  await connectDb();
  const filter: Record<string, unknown> = { ...scopeFor(actor), archivedAt: { $exists: false } };
  if (opts.status) filter.status = opts.status;
  const limit = 20;
  const page = Math.max(1, opts.page ?? 1);
  const [items, total] = await Promise.all([InternalProject.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate("clientId", "name").populate("ownerId", "name").lean(), InternalProject.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getInternalProject(actor: CurrentUser, id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  const doc = await InternalProject.findOne({ _id: id, ...scopeFor(actor) }).populate("clientId", "name email").populate("ownerId", "name email").populate("memberIds", "name").populate("proposalId", "reference title status").populate("leadId", "title status").lean();
  if (!doc && (await InternalProject.exists({ _id: id }))) {
    await recordAudit({ actor, action: "project.access_denied", entityType: "InternalProject", entityId: id, severity: "SECURITY" });
  }
  return doc;
}

export async function upsertInternalProject(
  actor: CurrentUser,
  input: { id?: string; name: string; status: InternalProjectStatus; clientId?: string; leadId?: string; proposalId?: string; ownerId?: string; memberIds?: string[]; summary?: string; startDate?: Date; deadline?: Date; progressPercent?: number; confidential?: boolean },
) {
  await connectDb();
  const oid = (v?: string) => (v ? new Types.ObjectId(v) : undefined);
  const data = {
    name: input.name,
    status: input.status,
    clientId: oid(input.clientId),
    leadId: oid(input.leadId),
    proposalId: oid(input.proposalId),
    ownerId: oid(input.ownerId) ?? (input.id ? undefined : new Types.ObjectId(actor.id)),
    memberIds: (input.memberIds ?? []).map((m) => new Types.ObjectId(m)),
    summary: input.summary || undefined,
    startDate: input.startDate,
    deadline: input.deadline,
    progressPercent: input.progressPercent ?? 0,
    confidential: input.confidential ?? true,
  };
  let doc;
  if (input.id) {
    doc = await InternalProject.findOneAndUpdate({ _id: input.id, ...scopeFor(actor) }, { $set: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) }, { new: true });
    if (!doc) throw new Error("Project not found or not accessible.");
  } else {
    doc = await InternalProject.create(data);
  }
  if (data.ownerId && data.ownerId.toString() !== actor.id) await notifyUser({ userId: data.ownerId.toString(), type: "project.assigned", title: `You own project: ${doc.name}`, link: `/admin/projects/${doc._id.toString()}` });
  await recordAudit({ actor, action: input.id ? "project.update" : "project.create", entityType: "InternalProject", entityId: doc._id.toString() });
  return doc;
}

export async function addMilestone(actor: CurrentUser, id: string, title: string, dueAt?: Date) {
  await connectDb();
  const res = await InternalProject.updateOne({ _id: id, ...scopeFor(actor) }, { $push: { milestones: { title, dueAt, status: "PENDING" } } });
  if (!res.matchedCount) throw new Error("Project not found or not accessible.");
  await recordAudit({ actor, action: "project.milestone_add", entityType: "InternalProject", entityId: id });
}

export async function updateMilestoneStatus(actor: CurrentUser, id: string, milestoneId: string, status: "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED") {
  await connectDb();
  const doc = await InternalProject.findOne({ _id: id, ...scopeFor(actor) });
  if (!doc) throw new Error("Project not found or not accessible.");
  const m = doc.milestones.find((x) => x._id?.toString() === milestoneId);
  if (!m) throw new Error("Milestone not found.");
  m.status = status;
  m.completedAt = status === "DONE" ? new Date() : undefined;
  const done = doc.milestones.filter((x) => x.status === "DONE").length;
  doc.progressPercent = doc.milestones.length ? Math.round((done / doc.milestones.length) * 100) : doc.progressPercent;
  await doc.save();
  await recordAudit({ actor, action: "project.milestone_status", entityType: "InternalProject", entityId: id, metadata: { milestoneId, status } });
}

export async function addProjectNote(actor: CurrentUser, id: string, body: string) {
  await connectDb();
  const res = await InternalProject.updateOne({ _id: id, ...scopeFor(actor) }, { $push: { notes: { body, authorId: actor.id, authorLabel: actor.name, at: new Date() } } });
  if (!res.matchedCount) throw new Error("Project not found or not accessible.");
}
