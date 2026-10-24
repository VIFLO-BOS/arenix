import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getLead, listStaffOptions } from "@/server/services/crm";
import { LEAD_STATUSES } from "@/server/db/models/crm";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { PageHeader, Card, KeyValue, inputClass, selectClass, FieldLabel, FormRow, btnSecondary } from "@/components/admin/ui";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { leadActivityAction, leadUpdateAction } from "../../actions";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("leads:read");
  const { id } = await params;
  const [data, staff] = await Promise.all([getLead(id), listStaffOptions()]);
  if (!data) notFound();
  const { lead, bookings, proposals } = data;
  const client = lead.clientId as unknown as { _id: { toString(): string }; name: string; email?: string; phone?: string; preferredContact?: string } | null;
  const owner = lead.assignedTo as unknown as { _id: { toString(): string }; name: string } | null;
  const inquiry = lead.inquiryId as unknown as { _id: { toString(): string }; reference: string; type: string; message?: string; goal?: string; serviceCategory?: string } | null;
  const canWrite = userCan(user, "leads:write");
  const dateInput = (d?: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  return (
    <>
      <PageHeader
        eyebrow="Lead"
        title={lead.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            <Badge tone={lead.priority === "HIGH" ? "danger" : "outline"}>{lead.priority}</Badge>
            <span>Source: {lead.source}</span>
            <span>, Created {formatDateTime(lead.createdAt as Date)}</span>
          </span>
        }
        actions={
          <>
            <Link href="/admin/leads" className="text-xs text-muted hover:text-on-dark">
              All leads
            </Link>
            {userCan(user, "proposals:write") && (
              <Link href={`/admin/proposals/new?leadId=${id}`} className={btnSecondary}>
                New proposal
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Client">
            {client ? (
              <KeyValue
                items={[
                  ["Name", <Link key="n" href={`/admin/clients/${client._id.toString()}`} className="underline underline-offset-4">{client.name}</Link>],
                  ["Email", client.email],
                  ["Phone", client.phone],
                  ["Preferred contact", client.preferredContact],
                ]}
              />
            ) : (
              <p className="text-sm text-muted">No client linked.</p>
            )}
          </Card>
          {inquiry && (
            <Card title="Originating inquiry" actions={<Link href={`/admin/inquiries/${inquiry._id.toString()}`} className="text-xs text-muted hover:text-on-dark">Open {inquiry.reference}</Link>}>
              <KeyValue items={[["Type", inquiry.type], ["Service", inquiry.serviceCategory]]} className="mb-3" />
              {inquiry.goal && <p className="mb-2 text-sm">{inquiry.goal}</p>}
              {inquiry.message && <p className="whitespace-pre-wrap text-sm text-muted">{inquiry.message}</p>}
            </Card>
          )}
          <Card title="Activity and notes">
            {canWrite && (
              <ActionForm action={leadActivityAction} resetOnSuccess className="mb-5 rounded-lg border border-[rgba(245,245,243,0.08)] p-3">
                <input type="hidden" name="id" value={id} />
                <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                  <FormRow>
                    <FieldLabel htmlFor="act-kind">Type</FieldLabel>
                    <select id="act-kind" name="kind" className={selectClass} defaultValue="NOTE">
                      {["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP"].map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="act-body">What happened</FieldLabel>
                    <textarea id="act-body" name="body" rows={2} className={inputClass} required />
                  </FormRow>
                </div>
                <div>
                  <Submit variant="secondary">Log activity</Submit>
                </div>
                <p className="text-xs text-muted">Logging a call, email, meeting or WhatsApp on a NEW lead moves it to CONTACTED and records first response time.</p>
              </ActionForm>
            )}
            {lead.activities.length ? (
              <ol className="flex flex-col gap-2">
                {[...lead.activities].reverse().map((a, i) => (
                  <li key={a._id?.toString() ?? i} className="flex gap-3 border-b border-[rgba(245,245,243,0.06)] pb-2 text-sm last:border-0">
                    <Badge tone="outline" className="h-fit shrink-0">
                      {a.kind}
                    </Badge>
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-muted">
                        {a.authorLabel}, {formatDateTime(a.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">No activity yet.</p>
            )}
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Bookings">
              {bookings.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {bookings.map((b) => (
                    <li key={b._id.toString()} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/bookings/${b._id.toString()}`} className="font-mono text-xs text-accent hover:underline">
                        {b.reference}
                      </Link>
                      <StatusBadge status={b.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">None.</p>
              )}
            </Card>
            <Card title="Proposals">
              {proposals.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {proposals.map((p) => (
                    <li key={p._id.toString()} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/proposals/${p._id.toString()}`} className="hover:text-accent">
                        {p.reference}, v{p.currentVersion}
                      </Link>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">None.</p>
              )}
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {canWrite ? (
            <Card title="Update lead">
              <ActionForm action={leadUpdateAction}>
                <input type="hidden" name="id" value={id} />
                <FormRow>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <input id="title" name="title" defaultValue={lead.title} className={inputClass} />
                </FormRow>
                <div className="grid grid-cols-2 gap-2">
                  <FormRow>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <select id="status" name="status" defaultValue={lead.status} className={selectClass}>
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="priority">Priority</FieldLabel>
                    <select id="priority" name="priority" defaultValue={lead.priority} className={selectClass}>
                      {["LOW", "MEDIUM", "HIGH"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                </div>
                <FormRow>
                  <FieldLabel htmlFor="assignedTo">Owner</FieldLabel>
                  <select id="assignedTo" name="assignedTo" defaultValue={owner?._id.toString() ?? ""} className={selectClass}>
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s._id.toString()} value={s._id.toString()}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FormRow>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <FormRow>
                    <FieldLabel htmlFor="estimatedValue">Estimated value</FieldLabel>
                    <input id="estimatedValue" name="estimatedValue" type="number" min={0} step="1000" defaultValue={lead.estimatedValue ?? ""} className={inputClass} />
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="currency">Currency</FieldLabel>
                    <input id="currency" name="currency" defaultValue={lead.currency ?? "NGN"} maxLength={3} className={inputClass} />
                  </FormRow>
                </div>
                <FormRow>
                  <FieldLabel htmlFor="followUpAt">Follow up date</FieldLabel>
                  <input id="followUpAt" name="followUpAt" type="date" defaultValue={dateInput(lead.followUpAt)} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="followUpNote">Follow up note</FieldLabel>
                  <input id="followUpNote" name="followUpNote" defaultValue={lead.followUpNote ?? ""} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="lostReason" hint="(if lost)">
                    Lost reason
                  </FieldLabel>
                  <input id="lostReason" name="lostReason" defaultValue={lead.lostReason ?? ""} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="note" hint="(recorded with status change)">
                    Note
                  </FieldLabel>
                  <input id="note" name="note" className={inputClass} />
                </FormRow>
                <div>
                  <Submit>Save lead</Submit>
                </div>
              </ActionForm>
            </Card>
          ) : (
            <Card title="Details">
              <KeyValue items={[["Owner", owner?.name], ["Value", lead.estimatedValue ? formatMoney(lead.estimatedValue, lead.currency) : undefined], ["Follow-up", lead.followUpAt ? formatDate(lead.followUpAt) : undefined]]} />
            </Card>
          )}
          <Card title="Status history">
            <ol className="flex flex-col gap-2 text-xs">
              {[...lead.statusHistory].reverse().map((h, i) => (
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
          </Card>
        </div>
      </div>
    </>
  );
}
