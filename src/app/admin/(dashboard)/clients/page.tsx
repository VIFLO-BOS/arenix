import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { listClients } from "@/server/services/crm";
import { formatDate } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, inputClass, btnSecondary, btnPrimary } from "@/components/admin/ui";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePermission("clients:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pages } = await listClients({ q: sp.q, page });
  return (
    <>
      <PageHeader title="Clients" description={`${total} people and organisations.`} actions={userCan(user, "clients:write") ? <Link href="/admin/clients/new" className={btnPrimary}>New client</Link> : undefined} />
      <Card>
        <form method="get" className="mb-4 flex gap-2">
          <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search name or email" className={inputClass} aria-label="Search clients" />
          <button type="submit" className={btnSecondary}>
            Search
          </button>
        </form>
        {items.length ? (
          <Table head={["Name", "Email", "Organisation", "Preferred", "Source", "Added"]} caption="Clients">
            {items.map((c) => (
              <tr key={c._id.toString()} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/admin/clients/${c._id.toString()}`} className="font-medium hover:text-accent">
                    {c.name}
                  </Link>
                </Td>
                <Td muted>{c.email ?? "Not set"}</Td>
                <Td muted>{(c.organizationId as unknown as { name?: string } | null)?.name ?? "Not set"}</Td>
                <Td muted>{c.preferredContact}</Td>
                <Td muted>{c.source ?? "Not set"}</Td>
                <Td muted>{formatDate(c.createdAt as Date)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No clients yet" body="Clients are created from website submissions or manually." />
        )}
        <Pager page={page} pages={pages} href={(p) => `/admin/clients?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
