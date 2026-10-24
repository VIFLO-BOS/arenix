import "server-only";
import { connectDb } from "@/server/db/connect";
import { Booking, Client, Lead, type BookingStatus } from "@/server/db/models/crm";
import { SiteSetting } from "@/server/db/models/cms";
import { makeReference } from "./reference";
import { emailTemplates, enqueueEmail, staffRecipients } from "./email";
import { notifyRoles } from "./notifications";
import { recordAudit } from "./audit";
import { env } from "@/lib/env";
import { CONSULTATION_TYPES } from "@/types/content";
import type { ConsultationRequestInput } from "@/lib/validation/forms";
import { formatDateTime } from "@/lib/utils";

function typeLabel(key: string) {
  return CONSULTATION_TYPES.find((c) => c.key === key)?.label ?? key;
}

async function bookingRecipients() {
  try {
    const s = await SiteSetting.findOne({ key: "site" }).lean();
    return staffRecipients((s?.notifications?.bookingEmails ?? []) as string[]);
  } catch {
    return staffRecipients();
  }
}

async function uniqueReference() {
  for (let i = 0; i < 5; i++) {
    const ref = makeReference("BKG");
    if (!(await Booking.exists({ reference: ref }))) return ref;
  }
  return `${makeReference("BKG")}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

/**
 * Honest request-only booking: stored as REQUESTED. No slot is reserved and no confirmation
 * is claimed. Staff confirm from the dashboard, which triggers the confirmation email.
 */
export async function createConsultationRequest(input: ConsultationRequestInput, meta: { ipHash?: string }) {
  await connectDb();
  const reference = await uniqueReference();
  const type = CONSULTATION_TYPES.find((c) => c.key === input.consultationType);

  let clientId = (await Client.findOne({ email: input.email.toLowerCase() }))?._id;
  if (!clientId) {
    clientId = (
      await Client.create({ name: input.name, email: input.email.toLowerCase(), phone: input.phone || undefined, source: "website:booking", notes: input.company ? `Company: ${input.company}` : undefined })
    )._id;
  }

  const booking = await Booking.create({
    reference,
    status: "REQUESTED",
    consultationType: input.consultationType,
    serviceContext: input.serviceContext || undefined,
    provider: "none",
    name: input.name,
    email: input.email,
    phone: input.phone || undefined,
    company: input.company || undefined,
    summary: input.summary,
    preferredWindows: input.preferredWindows,
    visitorTimezone: input.visitorTimezone || undefined,
    durationMinutes: type?.durationMinutes,
    consent: true,
    clientId,
    ipHash: meta.ipHash,
    statusHistory: [{ to: "REQUESTED", actorLabel: "visitor" }],
    events: [{ kind: "requested", note: "Request submitted via website" }],
  });

  const lead = await Lead.create({
    title: `${typeLabel(input.consultationType)} — ${input.company || input.name}`,
    status: "NEW",
    source: "website:book-consultation",
    serviceCategory: input.serviceContext || undefined,
    clientId,
    bookingIds: [booking._id],
    statusHistory: [{ to: "NEW", actorLabel: "system" }],
    activities: [{ kind: "SYSTEM", body: `Created from consultation request ${reference}`, authorLabel: "system" }],
  });
  booking.leadId = lead._id;
  await booking.save();

  const ack = emailTemplates.bookingRequested({ name: input.name, reference, consultationType: typeLabel(input.consultationType) });
  await enqueueEmail({ to: input.email, subject: ack.subject, html: ack.html, text: ack.text, template: "booking-requested", entityType: "Booking", entityId: booking._id.toString() });
  const adminUrl = `${env.siteUrl}/admin/bookings/${booking._id.toString()}`;
  const alert = emailTemplates.bookingStaffAlert({ reference, name: input.name, email: input.email, consultationType: typeLabel(input.consultationType), status: "REQUESTED", adminUrl });
  const recipients = await bookingRecipients();
  if (recipients.length) await enqueueEmail({ to: recipients, subject: alert.subject, html: alert.html, text: alert.text, template: "booking-staff", entityType: "Booking", entityId: booking._id.toString() });
  await notifyRoles({ roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT"], type: "booking.requested", title: `Consultation requested ${reference}`, body: `${input.name} · ${typeLabel(input.consultationType)}`, link: `/admin/bookings/${booking._id.toString()}`, entityType: "Booking", entityId: booking._id.toString() });
  await recordAudit({ action: "booking.requested", entityType: "Booking", entityId: booking._id.toString(), metadata: { reference }, ipHash: meta.ipHash });
  return { reference, id: booking._id.toString() };
}

/** Staff-side transition with email side effects. */
export async function transitionBooking(
  id: string,
  to: BookingStatus,
  actor: { id: string; name: string; email: string },
  details?: { startsAt?: Date; endsAt?: Date; meetingUrl?: string; note?: string },
) {
  await connectDb();
  const booking = await Booking.findById(id);
  if (!booking) throw new Error("Booking not found");
  const from = booking.status;
  booking.status = to;
  if (details?.startsAt) booking.startsAt = details.startsAt;
  if (details?.endsAt) booking.endsAt = details.endsAt;
  if (details?.meetingUrl !== undefined) booking.meetingUrl = details.meetingUrl || undefined;
  booking.statusHistory.push({ from, to, actorId: actor.id as unknown as never, actorLabel: actor.name, note: details?.note, at: new Date() });
  booking.events.push({ kind: `status:${to.toLowerCase()}`, at: new Date(), note: details?.note });
  await booking.save();

  if (to === "CONFIRMED" || to === "RESCHEDULED") {
    const when = booking.startsAt ? formatDateTime(booking.startsAt, booking.visitorTimezone || "Africa/Lagos") : "time to be shared by email";
    const t = emailTemplates.bookingConfirmed({ name: booking.name, reference: booking.reference, consultationType: typeLabel(booking.consultationType), when, meetingUrl: booking.meetingUrl ?? undefined, rescheduleUrl: booking.rescheduleUrl ?? undefined, cancelUrl: booking.cancelUrl ?? undefined });
    await enqueueEmail({ to: booking.email, subject: t.subject, html: t.html, text: t.text, template: "booking-confirmed", entityType: "Booking", entityId: booking._id.toString() });
  }
  await recordAudit({ actor, action: "booking.status", entityType: "Booking", entityId: booking._id.toString(), metadata: { from, to } });
  return booking;
}
