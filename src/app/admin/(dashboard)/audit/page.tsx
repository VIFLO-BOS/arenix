import { requirePermission } from "@/server/auth/session";
import { listAuditLog } from "@/server/services/ops-queries";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, inputClass, selectClass, btnSecondary } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string; severity?: string }> }) {
  await requirePermission("audit:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pages } = await listAuditLog({ page, action: sp.action, severity: sp.severity });
  const qs = (p: number) => `/admin/audit?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), ...(sp.severity ? { severity: sp.severity } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Audit log" description={`${total} recorded action${total === 1 ? "" : "s"}. Logins, role changes, publication, status changes and denied access. IPs are stored hashed.`} />
      <Card>
        <form method="get" className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input type="search" name="action" defaultValue={sp.action ?? ""} placeholder="Filter by action (e.g. auth., portfolio., lead.)" className={inputClass} aria-label="Action filter" />
          <select name="severity" defaultValue={sp.severity ?? ""} className={selectClass} aria-label="Severity">
            <option value="">All severities</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="SECURITY">SECURITY</option>
          </select>
          <button type="submit" className={btnSecondary}>
            Filter
          </button>
        </form>
        {items.length ? (
          <Table head={["When", "Actor", "Action", "Entity", "Severity", "Details"]} caption="Audit entries">
            {items.map((a) => (
              <tr key={a._id.toString()}>
                <Td muted>{formatDateTime(a.createdAt as Date)}</Td>
                <Td>
                  <span className="break-all text-xs">{a.actorLabel}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs">{a.action}</span>
                </Td>
                <Td muted>
                  <span className="text-xs">
                    {a.entityType}
                    {a.entityId ? `, ${a.entityId}` : ""}
                  </span>
                </Td>
                <Td>
                  <Badge tone={a.severity === "SECURITY" ? "danger" : a.severity === "WARN" ? "warning" : "neutral"}>{a.severity}</Badge>
                </Td>
                <Td muted>
                  <code className="break-all text-[0.65rem]">{a.metadata ? JSON.stringify(a.metadata).slice(0, 140) : ""}</code>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No audit entries" />
        )}
        <Pager page={page} pages={pages} href={qs} />
      </Card>
    </>
  );
}
