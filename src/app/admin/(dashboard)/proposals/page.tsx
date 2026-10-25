import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { listProposals, proposalTotals } from "@/server/services/proposals";
import { PROPOSAL_STATUSES } from "@/server/db/models/crm";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, selectClass, btnSecondary, btnPrimary } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await requirePermission("proposals:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pages } = await listProposals({ status: sp.status, page });
  return (
    <>
      <PageHeader title="Proposals" description={`${total} proposal${total === 1 ? "" : "s"}. Draft, review, approve, send. Acceptance is recorded by staff, never inferred.`} actions={userCan(user, "proposals:write") ? <Link href="/admin/proposals/new" className={btnPrimary}>New proposal</Link> : undefined} />
      <Card>
        <form method="get" className="mb-4 flex gap-2">
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Status">
            <option value="">All statuses</option>
            {PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className={btnSecondary}>
            Filter
          </button>
        </form>
        {items.length ? (
          <Table head={["Reference", "Title", "Client / lead", "Version", "Total", "Status", "Updated"]} caption="Proposals">
            {items.map((p) => {
              const v = p.versions.find((x) => x.version === p.currentVersion);
              const totals = v ? proposalTotals({ lineItems: v.lineItems, taxRatePercent: v.taxRatePercent ?? 0 }) : null;
              const client = p.clientId as unknown as { name?: string } | null;
              const lead = p.leadId as unknown as { title?: string } | null;
              return (
                <tr key={p._id.toString()} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/admin/proposals/${p._id.toString()}`} className="font-mono text-xs text-accent hover:underline">
                      {p.reference}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={`/admin/proposals/${p._id.toString()}`} className="font-medium hover:text-accent">
                      {p.title}
                    </Link>
                  </Td>
                  <Td muted>{client?.name ?? lead?.title ?? "Not set"}</Td>
                  <Td muted>v{p.currentVersion}</Td>
                  <Td muted>{totals && v ? formatMoney(totals.total, v.currency) : "Not set"}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td muted>{formatDateTime(p.updatedAt as Date)}</Td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState title="No proposals" body="Create a proposal from a qualified lead." />
        )}
        <Pager page={page} pages={pages} href={(p) => `/admin/proposals?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
