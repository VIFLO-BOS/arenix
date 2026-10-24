import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { listBookings } from "@/server/services/crm";
import { BOOKING_STATUSES } from "@/server/db/models/crm";
import { CONSULTATION_TYPES } from "@/types/content";
import { integrations } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Pager, selectClass, btnSecondary, Notice } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; view?: string; page?: string }> }) {
  await requirePermission("bookings:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const upcoming = sp.view === "upcoming";
  const { items, total, pages } = await listBookings({ status: sp.status, page, upcoming });
  const typeLabel = (k: string) => CONSULTATION_TYPES.find((c) => c.key === k)?.label ?? k;
  const qs = (extra: Record<string, string>) => `/admin/bookings?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.view ? { view: sp.view } : {}), ...extra })}`;

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${total} consultation record${total === 1 ? "" : "s"}. Provider ${integrations.scheduler.configured ? "Cal.com with webhook sync" : "request only, no live calendar"}.`}
        actions={
          <div className="flex rounded-lg border border-[rgba(245,245,243,0.15)] p-1 text-xs" role="group" aria-label="View">
            <Link href={qs({ view: "all" })} className={cn("rounded-md px-2.5 py-1", !upcoming ? "bg-on-dark text-ink" : "text-muted")}>
              All
            </Link>
            <Link href={qs({ view: "upcoming" })} className={cn("rounded-md px-2.5 py-1", upcoming ? "bg-on-dark text-ink" : "text-muted")}>
              Upcoming
            </Link>
          </div>
        }
      />
      {!integrations.scheduler.configured && (
        <div className="mb-4">
          <Notice tone="info">Live scheduling is not configured. Visitors submit requests (REQUESTED). Confirm them here with a date/time and the visitor receives a confirmation email.</Notice>
        </div>
      )}
      <Card>
        <form method="get" className="mb-4 flex gap-2">
          {sp.view && <input type="hidden" name="view" value={sp.view} />}
          <select name="status" defaultValue={sp.status ?? ""} className={selectClass} aria-label="Status">
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
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
          <Table head={["Reference", "Person", "Type", "Status", "When", "Provider", "Requested"]} caption="Bookings">
            {items.map((b) => (
              <tr key={b._id.toString()} className="hover:bg-[rgba(245,245,243,0.03)]">
                <Td>
                  <Link href={`/admin/bookings/${b._id.toString()}`} className="font-mono text-xs text-accent hover:underline">
                    {b.reference}
                  </Link>
                </Td>
                <Td>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted">{b.email}</p>
                </Td>
                <Td muted>{typeLabel(b.consultationType)}</Td>
                <Td>
                  <StatusBadge status={b.status} />
                </Td>
                <Td muted>{b.startsAt ? formatDateTime(b.startsAt, "Africa/Lagos") : "Not scheduled"}</Td>
                <Td muted>
                  {b.provider}
                  {b.externalId ? `, ${b.externalId.slice(0, 8)}` : ""}
                </Td>
                <Td muted>{formatDateTime(b.createdAt as Date)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No bookings" body="Consultation requests and provider confirmed bookings appear here." />
        )}
        <Pager page={page} pages={pages} href={(p) => qs({ page: String(p) })} />
      </Card>
    </>
  );
}
