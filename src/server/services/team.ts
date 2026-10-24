import "server-only";
import { connectDb } from "@/server/db/connect";
import { AuthToken, Session, User, type Role, type UserDoc } from "@/server/db/models/user";
import { generateToken, hashPassword, hashToken } from "@/server/auth/crypto";
import { emailTemplates, enqueueEmail } from "./email";
import { recordAudit } from "./audit";
import { env } from "@/lib/env";
import type { CurrentUser } from "@/server/auth/session";
import { ROLE_LABEL } from "@/server/auth/permissions";

const INVITE_HOURS = 72;
const RESET_MINUTES = 60;

export async function inviteUser(input: { email: string; name: string; role: Role; actor: CurrentUser }) {
  await connectDb();
  const email = input.email.toLowerCase().trim();
  if (input.role === "SUPER_ADMIN" && input.actor.role !== "SUPER_ADMIN") throw new Error("Only a super admin can invite another super admin.");
  if (await User.exists({ email })) throw new Error("A user with this email already exists.");

  await AuthToken.updateMany({ type: "INVITATION", email, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });
  const token = generateToken(32);
  await AuthToken.create({
    type: "INVITATION",
    email,
    name: input.name.trim(),
    role: input.role,
    tokenHash: hashToken(token),
    createdBy: input.actor.id,
    expiresAt: new Date(Date.now() + INVITE_HOURS * 3600 * 1000),
  });
  const acceptUrl = `${env.siteUrl}/admin/invite/${token}`;
  const t = emailTemplates.invitation({ name: input.name, inviterName: input.actor.name, role: ROLE_LABEL[input.role], acceptUrl, expiresHours: INVITE_HOURS });
  const dispatch = await enqueueEmail({ to: email, subject: t.subject, html: t.html, text: t.text, template: "invitation", entityType: "AuthToken" });
  await recordAudit({ actor: input.actor, action: "team.invite", entityType: "User", entityId: email, metadata: { role: input.role } });
  // In demo-log mode the link is surfaced to the admin so onboarding works without email.
  return { acceptUrl: dispatch.status === "DEMO_LOGGED" ? acceptUrl : undefined, emailStatus: dispatch.status };
}

export async function validateInviteToken(token: string) {
  await connectDb();
  const t = await AuthToken.findOne({ type: "INVITATION", tokenHash: hashToken(token), usedAt: { $exists: false } }).lean();
  if (!t || t.expiresAt.getTime() < Date.now()) return null;
  return { email: t.email, name: t.name ?? "", role: (t.role ?? "CONTENT_MANAGER") as Role };
}

export async function acceptInvitation(input: { token: string; name: string; password: string }): Promise<UserDoc> {
  await connectDb();
  const t = await AuthToken.findOne({ type: "INVITATION", tokenHash: hashToken(input.token), usedAt: { $exists: false } });
  if (!t || t.expiresAt.getTime() < Date.now()) throw new Error("This invitation is invalid or has expired.");
  if (await User.exists({ email: t.email })) throw new Error("An account already exists for this email. Sign in instead.");
  const user = await User.create({
    email: t.email,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    role: t.role ?? "CONTENT_MANAGER",
    isActive: true,
    invitedBy: t.createdBy,
  });
  t.usedAt = new Date();
  await t.save();
  await recordAudit({ actor: { id: user._id.toString(), name: user.name, email: user.email }, action: "team.invite_accepted", entityType: "User", entityId: user._id.toString() });
  return user as UserDoc;
}

export async function requestPasswordReset(emailRaw: string) {
  await connectDb();
  const email = emailRaw.toLowerCase().trim();
  const user = await User.findOne({ email, isActive: true });
  // Always behave the same to avoid account enumeration.
  if (!user) return;
  const token = generateToken(32);
  await AuthToken.create({ type: "PASSWORD_RESET", email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) });
  const t = emailTemplates.passwordReset({ name: user.name, resetUrl: `${env.siteUrl}/admin/reset-password/${token}` });
  await enqueueEmail({ to: email, subject: t.subject, html: t.html, text: t.text, template: "password-reset", entityType: "User", entityId: user._id.toString() });
  await recordAudit({ action: "auth.reset_requested", entityType: "User", entityId: user._id.toString(), severity: "SECURITY" });
}

export async function validateResetToken(token: string) {
  await connectDb();
  const t = await AuthToken.findOne({ type: "PASSWORD_RESET", tokenHash: hashToken(token), usedAt: { $exists: false } }).lean();
  return !!t && t.expiresAt.getTime() > Date.now();
}

export async function resetPassword(input: { token: string; password: string }) {
  await connectDb();
  const t = await AuthToken.findOne({ type: "PASSWORD_RESET", tokenHash: hashToken(input.token), usedAt: { $exists: false } });
  if (!t || t.expiresAt.getTime() < Date.now()) throw new Error("This reset link is invalid or has expired.");
  const user = await User.findOne({ email: t.email });
  if (!user) throw new Error("Account not found.");
  user.passwordHash = await hashPassword(input.password);
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  await user.save();
  t.usedAt = new Date();
  await t.save();
  await Session.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  await recordAudit({ actor: { id: user._id.toString(), name: user.name, email: user.email }, action: "auth.password_reset", entityType: "User", entityId: user._id.toString(), severity: "SECURITY" });
  return user as UserDoc;
}

export async function listTeam() {
  await connectDb();
  const [users, invitations] = await Promise.all([
    User.find().sort({ createdAt: 1 }).select("-passwordHash").lean(),
    AuthToken.find({ type: "INVITATION", usedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean(),
  ]);
  return { users, invitations };
}

export async function updateUserRole(actor: CurrentUser, userId: string, role: Role) {
  await connectDb();
  const target = await User.findById(userId);
  if (!target) throw new Error("User not found.");
  if ((role === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") && actor.role !== "SUPER_ADMIN") throw new Error("Only a super admin can change super admin roles.");
  if (target._id.toString() === actor.id && role !== actor.role) throw new Error("You cannot change your own role.");
  const from = target.role;
  target.role = role;
  await target.save();
  await Session.updateMany({ userId: target._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  await recordAudit({ actor, action: "team.role_changed", entityType: "User", entityId: userId, metadata: { from, to: role }, severity: "SECURITY" });
}

export async function setUserActive(actor: CurrentUser, userId: string, active: boolean) {
  await connectDb();
  const target = await User.findById(userId);
  if (!target) throw new Error("User not found.");
  if (target._id.toString() === actor.id) throw new Error("You cannot deactivate your own account.");
  if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new Error("Only a super admin can deactivate a super admin.");
  target.isActive = active;
  await target.save();
  if (!active) await Session.updateMany({ userId: target._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  await recordAudit({ actor, action: active ? "team.user_activated" : "team.user_deactivated", entityType: "User", entityId: userId, severity: "SECURITY" });
}

export async function revokeInvitation(actor: CurrentUser, id: string) {
  await connectDb();
  await AuthToken.updateOne({ _id: id, type: "INVITATION" }, { $set: { usedAt: new Date() } });
  await recordAudit({ actor, action: "team.invite_revoked", entityType: "AuthToken", entityId: id });
}
