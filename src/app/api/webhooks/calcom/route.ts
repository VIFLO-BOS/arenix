import { NextResponse } from "next/server";
import { z } from "zod";
import { env, integrations } from "@/lib/env";
import { hmacSha256Hex, safeEqual } from "@/server/auth/crypto";
import { connectDb } from "@/server/db/connect";
import { Booking, Client, Lead } from "@/server/db/models/crm";
import { makeReference } from "@/server/services/reference";
import { emailTemplates, enqueueEmail } from "@/server/services/email";
import { notifyRoles } from "@/server/services/notifications";
import { recordAudit } from "@/server/services/audit";
import { formatDateTime } from "@/lib/utils";

/**
 * Cal.com webhook receiver. Verifies the HMAC-SHA256 signature over the RAW body
 * (header `x-cal-signature-256`), processes idempotently by (provider, externalId, event)
 * and maps BOOKING_CREATED / BOOKING_RESCHEDULED / BOOKING_CANCELLED to Booking records.
 */
const payloadSchema = z.object({
  triggerEvent: z.string(),
  createdAt: z.string().optional(),
  payload: z
    .object({
      uid: z.string().optional(),
      bookingId: z.union([z.number(), z.string()]).optional(),
      title: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      attendees: z.array(z.object({ name: z.string().optional(), email: z.string().optional(), timeZone: z.string().optional() })).optional(),
      eventTitle: z.string().optional(),
      eventTypeId: z.union([z.number(), z.string()]).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      responses: z.record(z.string(), z.unknown()).optional(),
      rescheduleUid: z.string().optional(),
      cancellationReason: z.string().optional(),
      videoCallData: z.object({ url: z.string().optional() }).optional(),
    })
    .passthrough(),
});

export async function POST(req: Request) {
  if (!integrations.scheduler.webhookVerifiable) {
    return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });
  }
  const raw = await req.text();
  const signature = req.headers.get("x-cal-signature-256") ?? "";
  const expected = hmacSha256Hex(env.schedulerWebhookSecret, raw);
  if (!signature || !safeEqual(signature, expected)) {
    await recordAudit({ action: "webhook.calcom.invalid_signature", severity: "SECURITY" });
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Unexpected payload" }, { status: 400 });

  const { triggerEvent, payload } = parsed.data;
  const externalId = String(payload.uid ?? payload.bookingId ?? "");
  if (!externalId) return NextResponse.json({ ok: false, error: "Missing booking identifier" }, { status: 400 });
  const attendee = payload.attendees?.[0];
  const eventKey = `${triggerEvent}:${externalId}:${payload.startTime ?? ""}`;

  await connectDb();
  const existing = await Booking.findOne({ provider: "calcom", externalId });

  // Idempotency: same event for same booking+time already processed.
  if (existing?.events.some((e) => e.payloadId === eventKey)) return NextResponse.json({ ok: true, duplicate: true });

  const startsAt = payload.startTime ? new Date(payload.startTime) : undefined;
  const endsAt = payload.endTime ? new Date(payload.endTime) : undefined;
  const visitorTz = attendee?.timeZone;
  const consultationType = String(payload.metadata?.consultationType ?? payload.eventTitle ?? payload.title ?? "consultation");

  if (triggerEvent === "BOOKING_CREATED" || (!existing && triggerEvent === "BOOKING_RESCHEDULED")) {
    if (existing) {
      existing.events.push({ kind: triggerEvent, payloadId: eventKey, at: new Date() });
      await existing.save();
      return NextResponse.json({ ok: true, duplicate: true });
    }
    const email = (attendee?.email ?? "").toLowerCase();
    let clientId = email ? (await Client.findOne({ email }))?._id : undefined;
    if (!clientId && email) clientId = (await Client.create({ name: attendee?.name ?? email, email, source: "calcom" }))._id;
    const booking = await Booking.create({
      reference: makeReference("BKG"),
      status: "CONFIRMED",
      consultationType,
      provider: "calcom",
      externalId,
      externalUid: payload.uid,
      name: attendee?.name ?? "Unknown",
      email: email || "unknown@invalid.local",
      summary: typeof payload.responses?.notes === "string" ? payload.responses.notes : undefined,
      visitorTimezone: visitorTz,
      startsAt,
      endsAt,
      durationMinutes: startsAt && endsAt ? Math.round((endsAt.getTime() - startsAt.getTime()) / 60000) : undefined,
      meetingUrl: payload.videoCallData?.url,
      consent: true,
      clientId,
      events: [{ kind: triggerEvent, payloadId: eventKey, at: new Date() }],
      statusHistory: [{ to: "CONFIRMED", actorLabel: "calcom webhook" }],
    });
    const lead = await Lead.create({
      title: `${consultationType} for ${attendee?.name ?? email}`,
      status: "NEW",
      source: "calcom",
      clientId,
      bookingIds: [booking._id],
      statusHistory: [{ to: "NEW", actorLabel: "system" }],
      activities: [{ kind: "SYSTEM", body: `Created from confirmed Cal.com booking ${booking.reference}`, authorLabel: "system" }],
    });
    booking.leadId = lead._id;
    await booking.save();
    if (email) {
      const t = emailTemplates.bookingConfirmed({ name: booking.name, reference: booking.reference, consultationType, when: startsAt ? formatDateTime(startsAt, visitorTz) : "see calendar invitation", meetingUrl: booking.meetingUrl ?? undefined });
      await enqueueEmail({ to: email, subject: t.subject, html: t.html, text: t.text, template: "booking-confirmed", entityType: "Booking", entityId: booking._id.toString() });
    }
    await notifyRoles({ roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT"], type: "booking.confirmed", title: `Booking confirmed ${booking.reference}`, body: `${booking.name} · ${consultationType}`, link: `/admin/bookings/${booking._id.toString()}` });
    await recordAudit({ action: "webhook.calcom.created", entityType: "Booking", entityId: booking._id.toString() });
    return NextResponse.json({ ok: true });
  }

  if (!existing) return NextResponse.json({ ok: true, ignored: true });

  if (triggerEvent === "BOOKING_RESCHEDULED") {
    const from = existing.status;
    existing.status = "RESCHEDULED";
    existing.startsAt = startsAt ?? existing.startsAt;
    existing.endsAt = endsAt ?? existing.endsAt;
    existing.events.push({ kind: triggerEvent, payloadId: eventKey, at: new Date() });
    existing.statusHistory.push({ from, to: "RESCHEDULED", actorLabel: "calcom webhook", at: new Date() });
    await existing.save();
    const t = emailTemplates.bookingConfirmed({ name: existing.name, reference: existing.reference, consultationType: existing.consultationType, when: existing.startsAt ? formatDateTime(existing.startsAt, existing.visitorTimezone || undefined) : "see calendar", meetingUrl: existing.meetingUrl ?? undefined });
    await enqueueEmail({ to: existing.email, subject: `Rescheduled, ${t.subject}`, html: t.html, text: t.text, template: "booking-rescheduled", entityType: "Booking", entityId: existing._id.toString() });
  } else if (triggerEvent === "BOOKING_CANCELLED") {
    const from = existing.status;
    existing.status = "CANCELLED";
    existing.events.push({ kind: triggerEvent, payloadId: eventKey, at: new Date(), note: payload.cancellationReason });
    existing.statusHistory.push({ from, to: "CANCELLED", actorLabel: "calcom webhook", note: payload.cancellationReason, at: new Date() });
    await existing.save();
  } else {
    existing.events.push({ kind: triggerEvent, payloadId: eventKey, at: new Date() });
    await existing.save();
  }
  await notifyRoles({ roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT"], type: `booking.${triggerEvent.toLowerCase()}`, title: `Booking ${existing.status.toLowerCase()} ${existing.reference}`, link: `/admin/bookings/${existing._id.toString()}` });
  await recordAudit({ action: `webhook.calcom.${triggerEvent.toLowerCase()}`, entityType: "Booking", entityId: existing._id.toString() });
  return NextResponse.json({ ok: true });
}
