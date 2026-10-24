import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { leadsByStage, listLeads, listStaffOptions } from "@/server/services/crm";
import { LEAD_STATUSES } from "@/server/db/models/crm";
import { formatDate, formatMoney, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, inputClass, selectClass, btnSecondary } from "@/components/admin/ui";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-form";
import { dispatchFollowUpsAction } from "../actions";

function isOverdue(followUpAt: Date | null | undefined, status: string) {
  if (!followUpAt || ["WON", "LOST", "ARCHIVED"].includes(status)) return false;
  return new Date(followUpAt).getTime() < Date.now();
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; q?: string; assignedTo?: string; page?: string }> }) {
  const user = await requirePermission("leads:read");
  const sp = await searchParams;
  const view = sp.view === "board" ? "board" : "table";
  const page = Number(sp.page ?? 1) || 1;
  const [list, board, staff] = await Promise.all([view === "table" ? listLeads({ status: sp.status, q: sp.q, assignedTo: sp.assignedTo, page, all: !!sp.status }) : null, view === "board" ? leadsByStage() : null, listStaffOptions()]);
  const qs = (extra: Record<string, string>) => `/admin/leads?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.assignedTo ? { assignedTo: sp.assignedTo } : {}), ...extra })}`;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Pipeline runs NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT and WON, with LOST, ON_HOLD and ARCHIVED outcomes."
        actions={
          <>
            <div className="flex rounded-lg border border-[rgba(245,245,243,0.15)] p-1 text-xs" role="group" aria-label="View">
              <Link href={qs({ view: "table" })} className={cn("rounded-md px-2.5 py-1", view === "table" ? "bg-on-dark text-ink" : "text-muted")}>
                Table
              </Link>
              <Link href={qs({ view: "board" })} className={cn("rounded-md px-2.5 py-1", view === "board" ? "bg-on-dark text-ink" : "text-muted")}>
                Board
              </Link>
            </div>
            {userCan(user, "leads:write") && (
              <ActionButton action={dispatchFollowUpsAction} fields={{}} variant="secondary">
                Send due follow-up reminders
              </ActionButton>
            )}
          </>
        }
      />

      {view === "table" && list && (
        <Card>
          <form method="get" className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <input type="hidden" name="view" value="table" />
            <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search lead title" className={inputClass} aria-label="Search leads" />
            <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Status">
              <option value="">Open (not archived)</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select name="assignedTo" defaultValue={sp.assignedTo ?? ""} className={selectClass} aria-label="Assignee">
              <option value="">Anyone</option>
              {staff.map((s) => (
                <option key={s._id.toString()} value={s._id.toString()}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className={btnSecondary}>
              Filter
            </button>
          </form>
          {list.items.length ? (
            <Table head={["Lead", "Client", "Status", "Priority", "Value", "Follow-up", "Owner", "Updated"]} caption="Leads">
              {list.items.map((l) => {
                const client = l.clientId as unknown as { name?: string; email?: string } | null;
                const owner = l.assignedTo as unknown as { name?: string } | null;
                const overdue = isOverdue(l.followUpAt, l.status);
                return (
                  <tr key={l._id.toString()} className="hover:bg-[rgba(245,245,243,0.03)]">
                    <Td>
                      <Link href={`/admin/leads/${l._id.toString()}`} className="font-medium hover:text-accent">
                        {l.title}
                      </Link>
                      <p className="text-xs text-muted">{l.source}</p>
                    </Td>
                    <Td>
                      <p>{client?.name ?? "Not set"}</p>
                      <p className="text-xs text-muted">{client?.email}</p>
                    </Td>
                    <Td>
                      <StatusBadge status={l.status} />
                    </Td>
                    <Td>
                      <Badge tone={l.priority === "HIGH" ? "danger" : l.priority === "LOW" ? "neutral" : "outline"}>{l.priority}</Badge>
                    </Td>
                    <Td muted>{l.estimatedValue ? formatMoney(l.estimatedValue, l.currency) : "Not set"}</Td>
                    <Td className={overdue ? "text-danger" : "text-muted"}>{l.followUpAt ? formatDate(l.followUpAt) : "Not set"}</Td>
                    <Td muted>{owner?.name ?? "Not set"}</Td>
                    <Td muted>{timeAgo(l.updatedAt as Date)}</Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <EmptyState title="No leads match" body="Leads are created automatically from inquiries and consultation requests." />
          )}
          <Pager page={list.page} pages={list.pages} href={(p) => qs({ view: "table", page: String(p) })} />
        </Card>
      )}

      {view === "board" && board && (
        <div className="-mx-3 overflow-x-auto px-3 pb-4 sm:-mx-5 sm:px-5">
          <div className="flex min-w-max gap-3">
            {board.map((col) => (
              <section key={col.stage} className="w-64 shrink-0 rounded-xl border border-[rgba(245,245,243,0.1)] bg-surface-deep" aria-label={`${col.stage} column`}>
                <header className="flex items-center justify-between border-b border-[rgba(245,245,243,0.08)] px-3 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider">{col.stage.replace(/_/g, " ")}</h2>
                  <span className="font-mono text-xs text-muted">{col.leads.length}</span>
                </header>
                <ul className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
                  {col.leads.map((l) => {
                    const client = l.clientId as unknown as { name?: string } | null;
                    return (
                      <li key={l._id.toString()}>
                        <Link href={`/admin/leads/${l._id.toString()}`} className="block rounded-lg border border-[rgba(245,245,243,0.08)] p-3 text-sm hover:border-accent">
                          <p className="font-medium leading-snug">{l.title}</p>
                          <p className="mt-1 text-xs text-muted">{client?.name ?? "Not set"}</p>
                          <div className="mt-2 flex items-center justify-between text-[0.65rem] text-muted">
                            <span>{l.priority}</span>
                            <span>{timeAgo(l.updatedAt as Date)}</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                  {col.leads.length === 0 && <li className="p-3 text-center text-xs text-muted">Empty</li>}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
