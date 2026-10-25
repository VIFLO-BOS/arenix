import Link from "next/link";
import Image from "next/image";
import { requirePermission, userCan } from "@/server/auth/session";
import { adminListPortfolio } from "@/server/services/cms";
import { getPublicSettings } from "@/server/repositories/content";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types/content";
import { PageHeader, Card, Table, Td, EmptyState, Notice, btnPrimary } from "@/components/admin/ui";
import { Badge, ProjectStatusBadge } from "@/components/ui/badge";

export default async function PortfolioAdminPage() {
  const user = await requirePermission("cms:read");
  const [items, settings] = await Promise.all([adminListPortfolio(), getPublicSettings()]);
  return (
    <>
      <PageHeader title="Portfolio" description={`${items.length} project record${items.length === 1 ? "" : "s"} in the database. Public pages show only published + approved projects.`} actions={userCan(user, "cms:write") ? <Link href="/admin/portfolio/new" className={btnPrimary}>New project</Link> : undefined} />
      {settings.source === "fixture" && (
        <div className="mb-4">
          <Notice tone="warning">
            The public site is currently serving <strong>fixture</strong> content because the database has no portfolio records yet. Run <code className="font-mono">npm run db:seed</code> to load the starter roster, then edit here.
          </Notice>
        </div>
      )}
      <Card>
        {items.length ? (
          <Table head={["Cover", "Project", "Status", "Media", "Live link", "Flags", ""]} caption="Portfolio projects">
            {items.map((p) => (
              <tr key={p.slug} className="hover:bg-slate-50">
                <Td>
                  <div className="relative h-12 w-20 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    {p.coverMedia?.src ? <Image src={p.coverMedia.src} alt="" fill sizes="80px" className="object-cover object-top" /> : <span className="flex h-full items-center justify-center text-[0.6rem] text-slate-500">none</span>}
                  </div>
                </Td>
                <Td>
                  <Link href={`/admin/portfolio/${p.slug}`} className="font-medium hover:text-accent">
                    {p.title}
                  </Link>
                  <p className="font-mono text-xs text-slate-500">/work/{p.slug}</p>
                </Td>
                <Td>
                  <ProjectStatusBadge status={p.status as ProjectStatus} />
                </Td>
                <Td muted>
                  {p.gallery.length}, {p.gallery.filter((g) => g.approvedForPublication).length} approved
                </Td>
                <Td muted>{p.liveUrl ? (p.isLiveUrlPublic ? "Public" : "Hidden") : "Not set"}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Published" : "Draft"}</Badge>
                    {!p.approvedForPublication && <Badge tone="warning">Unapproved</Badge>}
                    {p.featured && <Badge tone="outline">Featured</Badge>}
                  </div>
                </Td>
                <Td>
                  {p.published && (
                    <Link href={`/work/${p.slug}`} className="text-xs text-slate-500 hover:text-slate-900" target="_blank">
                      View
                    </Link>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No portfolio records in the database" body={`Public pages currently fall back to the fixture roster (${Object.keys(PROJECT_STATUS_LABEL).length} status types supported). Seed or create projects to manage them here.`} />
        )}
      </Card>
    </>
  );
}
