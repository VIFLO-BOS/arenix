import "server-only";
import { connectDb } from "@/server/db/connect";
import { AuditLog, EmailDispatch } from "@/server/db/models/system";
import { literalPattern } from "@/lib/utils";

export async function listAuditLog(opts: { page?: number; action?: string; severity?: string }) {
  await connectDb();
  const limit = 50;
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = {};
  if (opts.action) filter.action = literalPattern(opts.action);
  if (opts.severity) filter.severity = opts.severity;
  const [items, total] = await Promise.all([AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), AuditLog.countDocuments(filter)]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listEmailDispatches(limit = 30) {
  await connectDb();
  return EmailDispatch.find().sort({ createdAt: -1 }).limit(limit).select("-html").lean();
}
