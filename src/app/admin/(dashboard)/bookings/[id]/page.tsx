import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getBooking } from "@/server/services/crm";
import { BOOKING_STATUSES } from "@/server/db/models/crm";
import { CONSULTATION_TYPES } from "@/types/content";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, KeyValue, inputClass, selectClass, FieldLabel, FormRow } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { bookingTransitionAction } from "../../actions";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("bookings:read");
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();
  const type = CONSULTATION_TYPES.find((c) => c.key === booking.consultationType);
  const lead = booking.leadId as unknown as { _id: { toString(): string }; title: string } | null;
  const client = booking.clientId as unknown as { _id: { toString(): string }; name: string } | null;
  const canWrite = userCan(user, "bookings:write");
  const isProvider = booking.provider === "calcom";
  const localDefault = booking.startsAt ? new Date(booking.startsAt.getTime() - booking.startsAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title={booking.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} /> {type?.label ?? booking.consultationType}, requested {formatDateTime(booking.createdAt as Date)}
          </span>
        }
        actions={<Link href="/admin/bookings" className="text-xs text-muted hover:text-on-dark">All bookings</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Visitor">
            <KeyValue
              items={[
                ["Name", client ? <Link key="c" href={`/admin/clients/${client._id.toString()}`} className="underline underline-offset-4">{booking.name}</Link> : booking.name],
                ["Email", <a key="e" href={`mailto:${booking.email}`} className="underline underline-offset-4">{booking.email}</a>],
                ["Phone", booking.phone],
                ["Company", booking.company],
                ["Visitor timezone", booking.visitorTimezone],
                ["Service context", booking.serviceContext],
                ["Lead", lead ? <Link key="l" href={`/admin/leads/${lead._id.toString()}`} className="underline underline-offset-4">{lead.title}</Link> : undefined],
              ]}
            />
            {booking.summary && (
              <div className="mt-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">What they want to discuss</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{booking.summary}</p>
              </div>
            )}
            {booking.preferredWindows.length > 0 && (
              <div className="mt-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Preferred windows (visitor time)</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {booking.preferredWindows.map((w) => (
                    <li key={w} className="rounded-full border border-[rgba(245,245,243,0.15)] px-2 py-0.5 text-xs">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card title="Schedule">
            <KeyValue
              items={[
                ["Starts (team time)", booking.startsAt ? formatDateTime(booking.startsAt, "Africa/Lagos") : "Not scheduled"],
                ["Starts (visitor time)", booking.startsAt && booking.visitorTimezone ? formatDateTime(booking.startsAt, booking.visitorTimezone) : undefined],
                ["Duration", booking.durationMinutes ? `${booking.durationMinutes} min` : type ? `${type.durationMinutes} min` : undefined],
                ["Meeting link", booking.meetingUrl ? <a key="m" href={booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">{booking.meetingUrl}</a> : undefined],
                ["Provider", booking.provider === "calcom" ? `Cal.com, ${booking.externalId ?? ""}` : "Request only, no provider"],
              ]}
            />
            {isProvider && (
              <p className="mt-3 text-xs text-muted">This booking is owned by the scheduling provider. Reschedule or cancel through Cal.com, and the webhook will update this record. Local status changes below are for record keeping, completed or no show.</p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          {canWrite && (
            <Card title={booking.status === "REQUESTED" ? "Confirm or update" : "Update status"}>
              <ActionForm action={bookingTransitionAction}>
                <input type="hidden" name="id" value={id} />
                <FormRow>
                  <FieldLabel htmlFor="b-status">Status</FieldLabel>
                  <select id="b-status" name="status" defaultValue={booking.status === "REQUESTED" ? "CONFIRMED" : booking.status} className={selectClass}>
                    {BOOKING_STATUSES.map((s) => (
                      <option key={s} value={s} disabled={isProvider && ["CONFIRMED", "RESCHEDULED", "CANCELLED"].includes(s) && s !== booking.status}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FormRow>
                {!isProvider && (
                  <>
                    <FormRow>
                      <FieldLabel htmlFor="b-start" hint="(server local time)">
                        Date and time
                      </FieldLabel>
                      <input id="b-start" name="startsAt" type="datetime-local" defaultValue={localDefault} className={inputClass} />
                    </FormRow>
                    <FormRow>
                      <FieldLabel htmlFor="b-dur">Duration (minutes)</FieldLabel>
                      <input id="b-dur" name="durationMinutes" type="number" min={5} max={480} defaultValue={booking.durationMinutes ?? type?.durationMinutes ?? 30} className={inputClass} />
                    </FormRow>
                    <FormRow>
                      <FieldLabel htmlFor="b-url">Meeting link (https)</FieldLabel>
                      <input id="b-url" name="meetingUrl" type="url" defaultValue={booking.meetingUrl ?? ""} className={inputClass} placeholder="https://meet.example" />
                    </FormRow>
                  </>
                )}
                <FormRow>
                  <FieldLabel htmlFor="b-note" hint="(optional)">
                    Note
                  </FieldLabel>
                  <input id="b-note" name="note" className={inputClass} />
                </FormRow>
                <div>
                  <Submit>Apply</Submit>
                </div>
                <p className="text-xs text-muted">Confirming or rescheduling emails the visitor the confirmed time and meeting link.</p>
              </ActionForm>
            </Card>
          )}
          <Card title="Timeline">
            <ol className="flex flex-col gap-2 text-xs">
              {[...booking.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-[rgba(245,245,243,0.06)] pb-2 last:border-0">
                  <span>
                    {h.from ? `${h.from} to ` : ""}
                    <strong>{h.to}</strong>
                    {h.note ? `, ${h.note}` : ""}
                    <span className="text-muted"> by {h.actorLabel}</span>
                  </span>
                  <span className="shrink-0 text-muted">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
            {booking.events.length > 0 && (
              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer">Provider / system events ({booking.events.length})</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {booking.events.map((e, i) => (
                    <li key={i}>
                      {e.kind}, {formatDateTime(e.at)} {e.payloadId ? <span className="font-mono">({e.payloadId.slice(0, 24)})</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
