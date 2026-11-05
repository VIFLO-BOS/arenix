import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { getOverviewMetrics, getRecentActivity, type Range } from "@/server/services/metrics";
import { integrations } from "@/lib/env";
import { twoStepMode } from "@/server/auth/two-step";
import { formatDateTime, formatMoney, timeAgo } from "@/lib/utils";
import { PageHeader, Stat, Card, EmptyState, Notice } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RANGES: Range[] = ["7d", "30d", "90d", "all"];

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requirePermission("dashboard:read");
  const sp = await searchParams;
  const range = (RANGES.includes(sp.range as Range) ? sp.range : "30d") as Range;
  const canCrm = ["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT"].includes(user.role);
  const [m, activity] = canCrm ? await Promise.all([getOverviewMetrics(range), getRecentActivity(10)]) : [null, []];

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${user.name.split(" ")[0]}`}
        title="Overview"
        description={canCrm ? "Real counts from the database for the selected period." : "Your role has access to content and media tools."}
        actions={
          canCrm ? (
            <div className="flex gap-1 rounded-lg border border-slate-200 p-1" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <Link key={r} href={`/admin?range=${r}`} aria-current={r === range ? "page" : undefined} className={cn("rounded-md px-2.5 py-1 text-xs", r === range ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}>
                  {r === "all" ? "All time" : `Last ${r}`}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      {twoStepMode() === "off" && (
        <div className="mb-4">
          <Notice tone="danger">
            <strong>Two step sign in is off.</strong> Sign in codes are emailed, so they switch on automatically once <code className="font-mono">RESEND_API_KEY</code> is set. Until then this dashboard is protected by passwords only.
          </Notice>
        </div>
      )}

      {!integrations.email.configured && (
        <div className="mb-4">
          <Notice tone="warning">
            Email is in <strong>demo log</strong> mode, messages are stored and printed to the server log, not delivered. Set <code className="font-mono">RESEND_API_KEY</code> and a verified <code className="font-mono">EMAIL_FROM</code> to send real email.
          </Notice>
        </div>
      )}

      {m ? (
        <>
          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
            <Stat label="New inquiries" value={m.inquiries.newCount} hint={`${m.inquiries.total} received in period`} tone="accent" />
            <Stat label="Leads" value={m.leads.total} hint={`${m.leads.qualified} qualified, ${m.leads.won} won`} />
            <Stat label="Consultations" value={m.bookings.confirmed} hint={`${m.bookings.requested} awaiting confirmation`} />
            <Stat label="Overdue follow ups" value={m.overdueFollowUps} tone={m.overdueFollowUps ? "danger" : "muted"} hint={m.overdueFollowUps ? "Needs attention today" : "Nothing overdue"} />
          </div>
          <div className="mt-3 grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
            <Stat label="Win rate" value={m.leads.winRate === null ? "Not yet" : `${m.leads.winRate}%`} hint={m.leads.winRate === null ? "No decided leads yet" : `${m.leads.won} won / ${m.leads.lost} lost`} />
            <Stat label="Pipeline value" value={m.pipelineValue.length ? m.pipelineValue.map((p) => formatMoney(p.total, p.currency)).join(", ") : "None"} hint="Open leads with an estimate" />
            <Stat label="First response" value={m.firstResponse ? `${m.firstResponse.avgHours} h` : "Not measured"} hint={m.firstResponse ? `Average over ${m.firstResponse.measured} leads` : "Set when a lead is first contacted"} />
            <Stat label="WhatsApp clicks" value={m.whatsappClicks} hint="Click to chat opens (not messages received)" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card title="Recent activity" className="lg:col-span-2" actions={<Link href="/admin/inquiries" className="text-xs text-slate-500 hover:text-slate-900">All inquiries</Link>}>
              {activity.length ? (
                <ul className="divide-y divide-slate-100">
                  {activity.map((a) => (
                    <li key={`${a.kind}-${a.id}`} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <Link href={a.href} className="min-w-0 truncate text-sm hover:text-accent">
                        {a.label}
                      </Link>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                        <StatusBadge status={a.status} />
                        <span>{timeAgo(a.at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No activity yet" body="Inquiries, bookings and lead updates will appear here as they happen." />
              )}
            </Card>
            <div className="flex flex-col gap-4">
              <Card title="Upcoming consultations">
                {m.bookings.upcoming.length ? (
                  <ul className="flex flex-col gap-2 text-sm">
                    {m.bookings.upcoming.map((b) => (
                      <li key={b._id.toString()}>
                        <Link href={`/admin/bookings/${b._id.toString()}`} className="hover:text-accent">
                          {b.name}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDateTime(b.startsAt, "Africa/Lagos")}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No confirmed upcoming consultations.</p>
                )}
              </Card>
              <Card title="Requests by service">
                {m.byService.length ? (
                  <ul className="flex flex-col gap-2">
                    {m.byService.map((s) => {
                      const max = m.byService[0]?.count ?? 1;
                      return (
                        <li key={s.service} className="text-xs">
                          <div className="flex justify-between gap-2">
                            <span className="truncate">{s.service}</span>
                            <span className="font-mono text-slate-500">{s.count}</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-slate-100">
                            <div className="h-1 rounded-full bg-accent" style={{ width: `${Math.round((s.count / max) * 100)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No project requests in this period.</p>
                )}
              </Card>
              <Card title="Email delivery">
                <p className="text-sm">
                  <span className={cn("font-mono", m.email.failed ? "text-danger" : "text-success")}>{m.email.failed}</span> failed, <span className="font-mono">{m.email.pending}</span> pending
                </p>
                <Link href="/admin/notifications#email" className="mt-2 inline-block text-xs text-slate-500 hover:text-slate-900">
                  Email log
                </Link>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { t: "Portfolio", h: "/admin/portfolio", d: "Edit projects, screenshots and live links." },
            { t: "Content", h: "/admin/content", d: "Services, solutions, articles, FAQs, careers, testimonials." },
            { t: "Media", h: "/admin/media", d: "Upload and approve images." },
          ].map(({ t, h, d }) => (
            <Link key={h} href={h} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-accent">
              <p className="font-display font-semibold">{t}</p>
              <p className="mt-1 text-xs text-slate-500">{d}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
