import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { dueFollowUps, recentDrafts, sendLinks } from "@/server/research/service";
import { formatDate } from "@/lib/utils";
import { PageHeader, Card, EmptyState, Notice, Table, Td, btnSecondary } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-form";
import { CopyButton } from "@/components/admin/research/copy-button";
import { ResearchNav } from "@/components/admin/research/research-nav";
import { draftSentAction, sequenceAction } from "../research-actions";

const STEP_LABEL = ["First message", "Follow up 1", "Follow up 2"];

export default async function OutreachPage() {
  const user = await requirePermission("leads:read");
  const canWrite = userCan(user, "leads:write");
  const [due, drafts] = await Promise.all([dueFollowUps(), recentDrafts(40)]);

  return (
    <>
      <PageHeader eyebrow="Find leads" title="Follow ups" description="Messages due today for businesses found by lead research. Each one opens in your own email or WhatsApp with the text filled in, and you press send." />
      <ResearchNav current="/admin/leads/outreach" showSettings={userCan(user, "settings:write")} />
      <div className="mb-4">
        <Notice tone="info">The system never sends these itself. Cold messages through the site&apos;s email service would break its terms and could stop the sign in codes and form emails. A sequence stops when you mark a reply, when the lead moves past Contacted, or when the business opts out.</Notice>
      </div>

      <Card title={`Due today (${due.length})`} className="mb-4">
        {due.length ? (
          <ul className="space-y-3">
            {due.map((d) => (
              <li key={d._id.toString()} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/admin/leads/prospects/${d.prospectId.toString()}`} className="font-semibold text-slate-900 hover:text-accent-deep">
                    {d.prospect?.name ?? "Business"}
                  </Link>
                  <span className="text-slate-500">{STEP_LABEL[d.step] ?? `Step ${d.step}`}</span>
                  <span className="text-slate-500">{d.channel === "EMAIL" ? "Email" : d.channel === "WHATSAPP" ? "WhatsApp" : "LinkedIn"}</span>
                  {d.dueAt && <span className="text-slate-500">Due {formatDate(d.dueAt)}</span>}
                  {d.to && <span className="break-all font-mono text-slate-600">{d.to}</span>}
                </div>
                {d.subject && <p className="text-sm font-medium">{d.subject}</p>}
                <p className="whitespace-pre-wrap text-sm text-slate-700">{d.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {sendLinks(d).map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={`${btnSecondary} min-h-8 px-2.5 text-xs`}>
                      {l.label}
                    </a>
                  ))}
                  <CopyButton text={d.subject ? `${d.subject}\n\n${d.body}` : d.body} />
                  {canWrite && (
                    <>
                      <ActionButton action={draftSentAction} fields={{ id: d._id.toString() }} variant="accent">
                        I sent it
                      </ActionButton>
                      {d.sequenceId && (
                        <>
                          <ActionButton action={sequenceAction} fields={{ sequenceId: d.sequenceId, op: "reply" }}>
                            Reply received
                          </ActionButton>
                          <ActionButton action={sequenceAction} fields={{ sequenceId: d.sequenceId, op: "stop" }} variant="danger">
                            Stop
                          </ActionButton>
                        </>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing due today" body="Schedule a draft from a business's research profile and it appears here on its date." />
        )}
      </Card>

      <Card title="Drafts waiting" description="First messages that are drafted or scheduled.">
        {drafts.length ? (
          <Table head={["Business", "Channel", "Status", "Created"]} caption="Drafts waiting">
            {drafts.map((d) => {
              const p = d.prospectId as unknown as { _id: { toString(): string }; name?: string } | null;
              return (
                <tr key={d._id.toString()}>
                  <Td>
                    {p ? (
                      <Link href={`/admin/leads/prospects/${p._id.toString()}`} className="font-medium hover:text-accent-deep">
                        {p.name ?? "Business"}
                      </Link>
                    ) : (
                      "Deleted"
                    )}
                  </Td>
                  <Td muted>{d.channel === "EMAIL" ? "Email" : d.channel === "WHATSAPP" ? "WhatsApp" : "LinkedIn"}</Td>
                  <Td>
                    <StatusBadge status={d.status} />
                  </Td>
                  <Td muted>{formatDate(d.createdAt)}</Td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState title="No drafts" body="Drafts are written from a business's research profile." />
        )}
      </Card>
    </>
  );
}
