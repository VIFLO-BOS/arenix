import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { listInternalProjects } from "@/server/services/projects";
import { PROJECT_STATUSES_INTERNAL } from "@/server/db/models/crm";
import { formatDate } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, selectClass, btnSecondary, btnPrimary } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await requirePermission("projects:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pages } = await listInternalProjects(user, { status: sp.status, page });
  return (
    <>
      <PageHeader title="Projects" description={`${total} internal delivery record${total === 1 ? "" : "s"}. ${user.role === "PROJECT_MANAGER" ? "You see projects you own or are a member of." : "Confidential by default. Separate from the public portfolio."}`} actions={userCan(user, "projects:write") ? <Link href="/admin/projects/new" className={btnPrimary}>New project</Link> : undefined} />
      <Card>
        <form method="get" className="mb-4 flex gap-2">
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Status">
            <option value="">All statuses</option>
            {PROJECT_STATUSES_INTERNAL.map((s) => (
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
          <Table head={["Project", "Client", "Owner", "Status", "Progress", "Deadline"]} caption="Internal projects">
            {items.map((p) => (
              <tr key={p._id.toString()} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/admin/projects/${p._id.toString()}`} className="font-medium hover:text-accent">
                    {p.name}
                  </Link>
                </Td>
                <Td muted>{(p.clientId as unknown as { name?: string } | null)?.name ?? "Not set"}</Td>
                <Td muted>{(p.ownerId as unknown as { name?: string } | null)?.name ?? "Not set"}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${p.progressPercent ?? 0}%` }} />
                    </div>
                    <span className="font-mono text-xs text-slate-500">{p.progressPercent ?? 0}%</span>
                  </div>
                </Td>
                <Td muted>{p.deadline ? formatDate(p.deadline) : "Not set"}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No projects" body="Create a project when a proposal is accepted." />
        )}
        <Pager page={page} pages={pages} href={(p) => `/admin/projects?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
