import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getProposal, proposalTotals } from "@/server/services/proposals";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { PageHeader, Card, KeyValue, Table, Td, FieldLabel, FormRow, inputClass, Notice } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionButton, ActionForm, Submit } from "@/components/admin/action-form";
import { ProposalVersionFields } from "@/components/admin/proposal-version-fields";
import { Markdown } from "@/components/ui/markdown";
import { proposalTransitionAction, proposalVersionAction } from "../../actions";

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("proposals:read");
  const { id } = await params;
  const p = await getProposal(id);
  if (!p) notFound();
  const current = p.versions.find((v) => v.version === p.currentVersion);
  const totals = current ? proposalTotals({ lineItems: current.lineItems, taxRatePercent: current.taxRatePercent ?? 0 }) : null;
  const client = p.clientId as unknown as { _id: { toString(): string }; name: string; email?: string } | null;
  const lead = p.leadId as unknown as { _id: { toString(): string }; title: string; status: string } | null;
  const owner = p.ownerId as unknown as { name?: string } | null;
  const approver = p.approvedBy as unknown as { name?: string } | null;
  const canWrite = userCan(user, "proposals:write");
  const canApprove = userCan(user, "proposals:approve");
  const canSend = userCan(user, "proposals:send");

  return (
    <>
      <PageHeader
        eyebrow={p.reference}
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} /> Version {p.currentVersion}, owner {owner?.name ?? "Not set"}
            {p.approvedAt ? `, approved by ${approver?.name ?? ", "} ${formatDate(p.approvedAt)}` : ""}
            {p.sentAt ? `, sent to ${p.sentTo} ${formatDate(p.sentAt)}` : ""}
          </span>
        }
        actions={<Link href="/admin/proposals" className="text-xs text-slate-500 hover:text-slate-900">All proposals</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title={`Current version (v${p.currentVersion})`} description={current ? `Created ${formatDateTime(current.createdAt)}` : undefined}>
            {current ? (
              <>
                {current.summary && <p className="mb-4 text-sm">{current.summary}</p>}
                {current.scope && (
                  <div className="mb-4 rounded-lg bg-slate-50 p-4">
                    <Markdown content={current.scope} className="text-sm" />
                  </div>
                )}
                {current.deliverables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Deliverables</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {current.deliverables.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {current.lineItems.length > 0 && totals && (
                  <Table head={["Item", "Qty", "Unit", "Amount"]} caption="Line items">
                    {current.lineItems.map((li, i) => (
                      <tr key={i}>
                        <Td>
                          <p>{li.label}</p>
                          {li.description && <p className="text-xs text-slate-500">{li.description}</p>}
                        </Td>
                        <Td muted>{li.quantity}</Td>
                        <Td muted>{formatMoney(li.unitAmount, current.currency)}</Td>
                        <Td>{formatMoney(li.quantity * li.unitAmount, current.currency)}</Td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200">
                      <Td className="text-right text-slate-500" colSpan={3}>
                        Subtotal
                      </Td>
                      <Td>{formatMoney(totals.subtotal, current.currency)}</Td>
                    </tr>
                    {totals.tax > 0 && (
                      <tr>
                        <Td className="text-right text-slate-500" colSpan={3}>
                          Tax ({current.taxRatePercent}%)
                        </Td>
                        <Td>{formatMoney(totals.tax, current.currency)}</Td>
                      </tr>
                    )}
                    <tr>
                      <Td className="text-right font-semibold" colSpan={3}>
                        Total
                      </Td>
                      <Td className="font-semibold">{formatMoney(totals.total, current.currency)}</Td>
                    </tr>
                  </Table>
                )}
                <KeyValue className="mt-4" items={[["Valid until", current.validUntil ? formatDate(current.validUntil) : undefined], ["Internal notes", current.notes]]} />
              </>
            ) : (
              <p className="text-sm text-slate-500">No version content.</p>
            )}
          </Card>

          {canWrite && p.status !== "ACCEPTED" && (
            <Card title="Add a new version" description="Creates v{n+1}. If the proposal was approved or sent, it returns to DRAFT for re approval.">
              <ActionForm action={proposalVersionAction}>
                <input type="hidden" name="id" value={id} />
                <ProposalVersionFields version={current ?? undefined} />
                <div>
                  <Submit>Save as v{p.currentVersion + 1}</Submit>
                </div>
              </ActionForm>
            </Card>
          )}

          {p.versions.length > 1 && (
            <Card title="Version history">
              <ul className="flex flex-col gap-2 text-sm">
                {[...p.versions].reverse().map((v) => {
                  const t = proposalTotals({ lineItems: v.lineItems, taxRatePercent: v.taxRatePercent ?? 0 });
                  return (
                    <li key={v.version} className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 last:border-0">
                      <span>
                        v{v.version} {v.version === p.currentVersion && <span className="text-xs text-accent">(current)</span>}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatMoney(t.total, v.currency)}, {formatDateTime(v.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Workflow">
            <KeyValue
              className="sm:grid-cols-1"
              items={[
                ["Client", client ? <Link key="c" href={`/admin/clients/${client._id.toString()}`} className="underline underline-offset-4">{client.name}</Link> : ", "],
                ["Client email", client?.email ?? ",  (needed to send)"],
                ["Lead", lead ? <Link key="l" href={`/admin/leads/${lead._id.toString()}`} className="underline underline-offset-4">{lead.title}</Link> : "Not set"],
              ]}
            />
            {canWrite && (
              <div className="mt-4 flex flex-col gap-2">
                {p.status === "DRAFT" && (
                  <ActionButton action={proposalTransitionAction} fields={{ id, status: "IN_REVIEW" }} variant="primary">
                    Submit for review
                  </ActionButton>
                )}
                {p.status === "IN_REVIEW" && (
                  <>
                    {canApprove ? (
                      <ActionButton action={proposalTransitionAction} fields={{ id, status: "APPROVED" }} variant="primary" confirm="Approve this version for sending?">
                        Approve
                      </ActionButton>
                    ) : (
                      <Notice tone="info">Awaiting approval by an admin.</Notice>
                    )}
                    <ActionButton action={proposalTransitionAction} fields={{ id, status: "DRAFT" }} variant="secondary">
                      Back to draft
                    </ActionButton>
                  </>
                )}
                {p.status === "APPROVED" &&
                  (canSend ? (
                    <ActionForm action={proposalTransitionAction}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="status" value="SENT" />
                      <FormRow>
                        <FieldLabel htmlFor="sentTo" hint={client?.email ? "(defaults to client email)" : "(required)"}>
                          Send to
                        </FieldLabel>
                        <input id="sentTo" name="sentTo" type="email" defaultValue={client?.email ?? ""} className={inputClass} />
                      </FormRow>
                      <Submit variant="accent" pendingLabel="Sending">
                        Send proposal email
                      </Submit>
                    </ActionForm>
                  ) : (
                    <Notice tone="info">Approved. Sending requires the send permission.</Notice>
                  ))}
                {p.status === "SENT" && (
                  <>
                    <ActionForm action={proposalTransitionAction}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="status" value="ACCEPTED" />
                      <FormRow>
                        <FieldLabel htmlFor="acc-note">How was acceptance confirmed?</FieldLabel>
                        <input id="acc-note" name="note" className={inputClass} placeholder="e.g. signed PDF received by email on …" required />
                      </FormRow>
                      <Submit variant="primary">Record acceptance (lead → WON)</Submit>
                    </ActionForm>
                    <ActionForm action={proposalTransitionAction}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="status" value="REJECTED" />
                      <FormRow>
                        <FieldLabel htmlFor="rej-note">Reason</FieldLabel>
                        <input id="rej-note" name="note" className={inputClass} />
                      </FormRow>
                      <Submit variant="danger">Record rejection (lead → LOST)</Submit>
                    </ActionForm>
                    <ActionButton action={proposalTransitionAction} fields={{ id, status: "EXPIRED" }} variant="secondary">
                      Mark expired
                    </ActionButton>
                  </>
                )}
                {(p.status === "REJECTED" || p.status === "EXPIRED") && (
                  <ActionButton action={proposalTransitionAction} fields={{ id, status: "DRAFT" }} variant="secondary">
                    Reopen as draft
                  </ActionButton>
                )}
                {p.status === "ACCEPTED" && <Notice tone="success">Accepted {p.decisionAt ? formatDate(p.decisionAt) : ""}. {p.decisionNote}</Notice>}
              </div>
            )}
          </Card>
          <Card title="Status history">
            <ol className="flex flex-col gap-2 text-xs">
              {[...p.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-slate-200 pb-2 last:border-0">
                  <span>
                    {h.from ? `${h.from} to ` : ""}
                    <strong>{h.to}</strong>
                    {h.note ? `, ${h.note}` : ""}
                    <span className="text-slate-500"> by {h.actorLabel}</span>
                  </span>
                  <span className="shrink-0 text-slate-500">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
