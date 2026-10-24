import "server-only";
import { connectDb } from "@/server/db/connect";
import { Notification } from "@/server/db/models/system";
import type { Role } from "@/server/db/models/user";

export async function notifyRoles(input: {
  roles: Role[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}) {
  try {
    await connectDb();
    await Notification.create({
      roles: input.roles,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  } catch (err) {
    console.error("[notifications] failed", err);
  }
}

export async function notifyUser(input: { userId: string; type: string; title: string; body?: string; link?: string }) {
  try {
    await connectDb();
    await Notification.create({ ...input });
  } catch (err) {
    console.error("[notifications] failed", err);
  }
}

export async function listNotificationsFor(user: { id: string; role: Role }, limit = 50) {
  await connectDb();
  return Notification.find({ $or: [{ userId: user.id }, { roles: user.role }] })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function countUnreadFor(user: { id: string; role: Role }) {
  await connectDb();
  return Notification.countDocuments({ $or: [{ userId: user.id }, { roles: user.role }], readBy: { $ne: user.id } });
}

export async function markAllRead(user: { id: string; role: Role }) {
  await connectDb();
  await Notification.updateMany(
    { $or: [{ userId: user.id }, { roles: user.role }], readBy: { $ne: user.id } },
    { $addToSet: { readBy: user.id } },
  );
}
