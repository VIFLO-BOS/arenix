import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { getDailySeries, getFunnel, getOverviewMetrics, type Range } from "@/server/services/metrics";
import { siteConfig } from "@/config/site";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader, Card, Stat, Notice, Table, Td } from "@/components/admin/ui";

const RANGES: Range[] = ["7d", "30d", "90d", "all"];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requirePermission("analytics:read");
  const sp = await searchParams;
  const range = (RANGES.includes(sp.range as Range) ? sp.range : "30d") as Range;
  const [m, funnel, series] = await Promise.all([getOverviewMetrics(range), getFunnel(range), getDailySeries(range)]);
  const max = Math.max(1, ...series.map((s) => s.count));
  const funnelMax = Math.max(1, funnel[0]?.value ?? 1);
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Conversion funnel and operating metrics computed from real records. Website traffic analytics are separate and shown only when configured."
        actions={
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/analytics?range=${r}`} aria-current={r === range ? "page" : undefined} className={cn("rounded-md px-2.5 py-1 text-xs", r === range ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}>
                {r === "all" ? "All time" : `Last ${r}`}
              </Link>
            ))}
          </div>
        }
      />

      {!siteConfig.analyticsDomain && (
        <div className="mb-4">
          <Notice tone="info">
            Website traffic analytics are <strong>not configured</strong> (this is different from zero visits). Set <code className="font-mono">NEXT_PUBLIC_ANALYTICS_DOMAIN</code> for a privacy aware provider to add page view data.
          </Notice>
        </div>
      )}

      <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
        <Stat label="Inquiries" value={m.inquiries.total} hint={`${m.inquiries.newCount} still NEW`} />
        <Stat label="Qualified leads" value={m.leads.qualified} hint={`of ${m.leads.total} leads`} />
        <Stat label="Proposals" value={m.proposals.sent} hint={`${m.proposals.accepted} accepted`} />
        <Stat label="Win rate" value={m.leads.winRate === null ? "Not yet" : `${m.leads.winRate}%`} hint={m.leads.winRate === null ? "No decided leads" : `${m.leads.won} won, ${m.leads.lost} lost`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Conversion funnel" description="Counts of records created in the period">
          <ol className="flex flex-col gap-3">
            {funnel.map((f) => (
              <li key={f.stage} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>{f.stage}</span>
                  <span className="font-mono text-slate-500">{f.value}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(2, Math.round((f.value / funnelMax) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Inquiries per day">
          {series.length ? (
            <div className="flex h-40 items-end gap-px" role="img" aria-label={`Daily inquiries, ${series.length} days with activity`}>
              {series.map((s) => (
                <div key={s.day} className="group relative flex-1 rounded-t bg-accent/70 hover:bg-accent" style={{ height: `${Math.max(4, Math.round((s.count / max) * 100))}%` }} title={`${s.day}, ${s.count}`} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No inquiries in this period.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">Only days with at least one inquiry are shown. Server timestamps (UTC).</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Bookings">
          <Table head={["Metric", "Value"]} caption="Booking metrics">
            <tr>
              <Td muted>Requested (awaiting)</Td>
              <Td>{m.bookings.requested}</Td>
            </tr>
            <tr>
              <Td muted>Confirmed, rescheduled or completed</Td>
              <Td>{m.bookings.confirmed}</Td>
            </tr>
            <tr>
              <Td muted>No shows recorded</Td>
              <Td>{m.bookings.noShow}</Td>
            </tr>
          </Table>
        </Card>
        <Card title="Pipeline and response">
          <Table head={["Metric", "Value"]} caption="Pipeline metrics">
            <tr>
              <Td muted>Open pipeline value</Td>
              <Td>{m.pipelineValue.length ? m.pipelineValue.map((p) => formatMoney(p.total, p.currency)).join(", ") : "None"}</Td>
            </tr>
            <tr>
              <Td muted>Average first response</Td>
              <Td>{m.firstResponse ? `${m.firstResponse.avgHours} h (${m.firstResponse.measured} leads)` : "Not measured yet"}</Td>
            </tr>
            <tr>
              <Td muted>Overdue follow ups</Td>
              <Td>{m.overdueFollowUps}</Td>
            </tr>
          </Table>
        </Card>
        <Card title="Channels">
          <Table head={["Metric", "Value"]} caption="Channel metrics">
            <tr>
              <Td muted>WhatsApp click to chat opens</Td>
              <Td>{m.whatsappClicks}</Td>
            </tr>
            <tr>
              <Td muted>Requests by service</Td>
              <Td>{m.byService.length ? m.byService.map((s) => `${s.service} (${s.count})`).join(", ") : "None"}</Td>
            </tr>
          </Table>
          <p className="mt-2 text-xs text-slate-500">WhatsApp clicks count link opens only. Messages are not received by this system.</p>
        </Card>
      </div>
    </>
  );
}
