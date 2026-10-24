import "server-only";
import { connectDb } from "@/server/db/connect";
import { AuditLog } from "@/server/db/models/system";

type Actor = { id: string; name?: string; email?: string } | null | undefined;

export async function recordAudit(input: {
  actor?: Actor;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
  severity?: "INFO" | "WARN" | "SECURITY";
}) {
  try {
    await connectDb();
    await AuditLog.create({
      actorId: input.actor?.id,
      actorLabel: input.actor ? `${input.actor.name ?? ""} <${input.actor.email ?? ""}>`.trim() : "system",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipHash: input.ipHash,
      severity: input.severity ?? "INFO",
    });
  } catch (err) {
    console.error("[audit] failed to record", input.action, err);
  }
}
