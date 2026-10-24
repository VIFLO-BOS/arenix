import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { listInquiries } from "@/server/services/crm";
import { INQUIRY_STATUSES } from "@/server/db/models/crm";
import { formatDateTime, truncate } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, inputClass, selectClass, btnSecondary } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; q?: string; page?: string }> }) {
  await requirePermission("inquiries:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pages } = await listInquiries({ status: sp.status, type: sp.type, q: sp.q, page });
  const href = (p: number) => `/admin/inquiries?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.type ? { type: sp.type } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Inquiries" description={`${total} record${total === 1 ? "" : "s"}, contact messages and project requests submitted on the website.`} />
      <Card>
        <form method="get" className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search name, email, reference, company" className={inputClass} aria-label="Search inquiries" />
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Status">
            <option value="">All statuses</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select name="type" defaultValue={sp.type ?? ""} className={selectClass} aria-label="Type">
            <option value="">All types</option>
            <option value="CONTACT">Contact</option>
            <option value="PROJECT">Project request</option>
          </select>
          <button type="submit" className={btnSecondary}>
            Filter
          </button>
        </form>
        {items.length ? (
          <Table head={["Reference", "From", "Type / service", "Status", "Assigned", "Received"]} caption="Inquiries">
            {items.map((i) => (
              <tr key={i._id.toString()} className="hover:bg-[rgba(245,245,243,0.03)]">
                <Td>
                  <Link href={`/admin/inquiries/${i._id.toString()}`} className="font-mono text-xs text-accent hover:underline">
                    {i.reference}
                  </Link>
                </Td>
                <Td>
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted">{i.email}</p>
                </Td>
                <Td>
                  <p>{i.type === "PROJECT" ? "Project request" : "Contact"}</p>
                  <p className="text-xs text-muted">{truncate(i.serviceCategory ?? i.subject ?? "", 50)}</p>
                </Td>
                <Td>
                  <StatusBadge status={i.status} />
                </Td>
                <Td muted>{(i.assignedTo as unknown as { name?: string } | null)?.name ?? "Not set"}</Td>
                <Td muted>{formatDateTime(i.createdAt as Date)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No inquiries match" body="Submissions from /contact and /start-project appear here with a reference number." />
        )}
        <Pager page={page} pages={pages} href={href} />
      </Card>
    </>
  );
}
