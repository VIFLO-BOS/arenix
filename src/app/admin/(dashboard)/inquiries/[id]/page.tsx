import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getInquiry, listStaffOptions } from "@/server/services/crm";
import { INQUIRY_STATUSES } from "@/server/db/models/crm";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, KeyValue, inputClass, selectClass, FieldLabel, FormRow } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { inquiryAssignAction, inquiryNoteAction, inquiryStatusAction } from "../../actions";

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("inquiries:read");
  const { id } = await params;
  const [inquiry, staff] = await Promise.all([getInquiry(id), listStaffOptions()]);
  if (!inquiry) notFound();
  const canWrite = userCan(user, "inquiries:write");
  const lead = inquiry.leadId as unknown as { _id: { toString(): string }; title: string; status: string } | null;
  const assigned = inquiry.assignedTo as unknown as { _id: { toString(): string }; name: string } | null;

  return (
    <>
      <PageHeader
        eyebrow={inquiry.type === "PROJECT" ? "Project request" : "Contact inquiry"}
        title={inquiry.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={inquiry.status} /> Received {formatDateTime(inquiry.createdAt as Date)}
            {lead && (
              <>
               , Lead{" "}
                <Link href={`/admin/leads/${lead._id.toString()}`} className="underline underline-offset-4">
                  {lead.title}
                </Link>
              </>
            )}
          </span>
        }
        actions={
          <Link href="/admin/inquiries" className="text-xs text-muted hover:text-on-dark">
            All inquiries
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Contact">
            <KeyValue
              items={[
                ["Name", inquiry.name],
                ["Email", <a key="e" href={`mailto:${inquiry.email}`} className="underline underline-offset-4">{inquiry.email}</a>],
                ["Company", inquiry.company],
                ["Phone", inquiry.phone],
                ["Preferred contact", inquiry.preferredContact],
                ["Consent", inquiry.consent ? "Given" : "Not given"],
                ["Source page", inquiry.sourcePath],
              ]}
            />
          </Card>
          <Card title={inquiry.type === "PROJECT" ? "Request" : "Message"}>
            <KeyValue items={[["Service category", inquiry.serviceCategory], ["Solution context", inquiry.solutionContext], ["Project context", inquiry.projectContext], ["Budget", inquiry.budgetRange], ["Timeline", inquiry.timeline], ["Subject", inquiry.subject]]} className="mb-4" />
            {inquiry.goal && (
              <div className="mb-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Business goal</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{inquiry.goal}</p>
              </div>
            )}
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{inquiry.message}</p>
            </div>
            {inquiry.features && (
              <div className="mt-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Features</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{inquiry.features}</p>
              </div>
            )}
            {inquiry.attachments.length > 0 && (
              <div className="mt-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Attachments</p>
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {inquiry.attachments.map((a) => (
                    <li key={a._id?.toString() ?? a.storageKey}>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                          {a.filename}
                        </a>
                      ) : (
                        a.filename
                      )}{" "}
                      <span className="text-xs text-muted">
                        ({a.mime}, {Math.round(a.size / 1024)} KB)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <Card title="Internal notes">
            {inquiry.internalNotes.length ? (
              <ul className="mb-4 flex flex-col gap-3">
                {inquiry.internalNotes.map((n, i) => (
                  <li key={i} className="rounded-lg bg-[rgba(245,245,243,0.04)] p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {n.authorLabel}, {formatDateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">No notes yet.</p>
            )}
            {canWrite && (
              <ActionForm action={inquiryNoteAction} resetOnSuccess>
                <input type="hidden" name="id" value={id} />
                <FormRow>
                  <FieldLabel htmlFor="note-body">Add a note</FieldLabel>
                  <textarea id="note-body" name="body" rows={3} className={inputClass} required />
                </FormRow>
                <div>
                  <Submit variant="secondary">Add note</Submit>
                </div>
              </ActionForm>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {canWrite && (
            <>
              <Card title="Qualification">
                <ActionForm action={inquiryStatusAction}>
                  <input type="hidden" name="id" value={id} />
                  <FormRow>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <select id="status" name="status" defaultValue={inquiry.status} className={selectClass}>
                      {INQUIRY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="status-note" hint="(optional)">
                      Note
                    </FieldLabel>
                    <input id="status-note" name="note" className={inputClass} />
                  </FormRow>
                  <div>
                    <Submit>Update status</Submit>
                  </div>
                </ActionForm>
                <p className="mt-3 text-xs text-muted">Qualifying also moves the linked lead to QUALIFIED. Marking spam archives the lead.</p>
              </Card>
              <Card title="Assignment">
                <ActionForm action={inquiryAssignAction}>
                  <input type="hidden" name="id" value={id} />
                  <FormRow>
                    <FieldLabel htmlFor="assignee">Assigned to</FieldLabel>
                    <select id="assignee" name="userId" defaultValue={assigned?._id.toString() ?? ""} className={selectClass}>
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s._id.toString()} value={s._id.toString()}>
                          {s.name}, {String(s.role).replace(/_/g, " ").toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <div>
                    <Submit variant="secondary">Save assignment</Submit>
                  </div>
                </ActionForm>
              </Card>
            </>
          )}
          <Card title="History">
            <ol className="flex flex-col gap-2 text-xs">
              {[...inquiry.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-[rgba(245,245,243,0.06)] pb-2 last:border-0">
                  <span>
                    {h.from ? `${h.from} to ` : ""}
                    <strong>{h.to}</strong>
                    {h.note ? `, ${h.note}` : ""}
                  </span>
                  <span className="shrink-0 text-muted">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">Submitted by {h(inquiry.statusHistory[0]?.actorLabel)}, {inquiry.userAgent ? "browser recorded" : "no user agent"}</p>
          </Card>
        </div>
      </div>
    </>
  );
}

function h(v?: string) {
  return v ?? "visitor";
}
