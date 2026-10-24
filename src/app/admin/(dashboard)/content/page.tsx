import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { adminListContent, type ContentKind } from "@/server/services/cms";
import { getPublicSettings } from "@/server/repositories/content";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Notice, btnPrimary } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-form";
import { FaqForm, TestimonialForm } from "@/components/admin/content-forms";
import { contentDeleteAction } from "../actions";

const TABS: { key: ContentKind; label: string }[] = [
  { key: "service", label: "Services" },
  { key: "solution", label: "Solutions" },
  { key: "technology", label: "Technologies" },
  { key: "article", label: "Insights" },
  { key: "career", label: "Careers" },
  { key: "testimonial", label: "Testimonials" },
  { key: "faq", label: "FAQs" },
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePermission("cms:read");
  const sp = await searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "service") as ContentKind;
  const [items, settings] = await Promise.all([adminListContent(tab), getPublicSettings()]);
  const canWrite = userCan(user, "cms:write");
  const canDelete = userCan(user, "cms:publish");
  const slugKinds: ContentKind[] = ["service", "solution", "technology", "article", "career"];
  return (
    <>
      <PageHeader title="Content" description="Services, solutions, technologies, articles, careers, testimonials and FAQs shown on the public site." actions={canWrite && slugKinds.includes(tab) ? <Link href={`/admin/content/${tab}/new`} className={btnPrimary}>New {TABS.find((t) => t.key === tab)?.label.replace(/s$/, "").toLowerCase()}</Link> : undefined} />
      {settings.source === "fixture" && (
        <div className="mb-4">
          <Notice tone="warning">Public pages are serving fixture content (database collections empty). Run <code className="font-mono">npm run db:seed</code> to load editable records.</Notice>
        </div>
      )}
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-lg border border-[rgba(245,245,243,0.12)] p-1" role="tablist" aria-label="Content type">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/content?tab=${t.key}`} role="tab" aria-selected={t.key === tab} className={cn("shrink-0 rounded-md px-3 py-1.5 text-xs", t.key === tab ? "bg-on-dark text-ink" : "text-muted hover:text-on-dark")}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className={cn("grid gap-4", (tab === "testimonial" || tab === "faq") && canWrite && "lg:grid-cols-3")}>
        <Card className={cn((tab === "testimonial" || tab === "faq") && canWrite && "lg:col-span-2")}>
          {items.length ? (
            <Table head={tab === "faq" ? ["Question", "Scope", "Order", "Status", ""] : tab === "testimonial" ? ["Quote", "Author", "Status", ""] : ["Title", "Slug", "Status", "Updated", ""]} caption={`${tab} records`}>
              {items.map((raw) => {
                const it = raw as unknown as Record<string, unknown> & { _id: { toString(): string } };
                const id = it._id.toString();
                const published = !!it.published;
                const editHref = slugKinds.includes(tab) ? `/admin/content/${tab}/${String(it.slug)}` : undefined;
                return (
                  <tr key={id} className="hover:bg-[rgba(245,245,243,0.03)]">
                    {tab === "faq" ? (
                      <>
                        <Td>
                          <p className="font-medium">{String(it.question)}</p>
                          <p className="line-clamp-1 text-xs text-muted">{String(it.answer)}</p>
                        </Td>
                        <Td muted>{String(it.scope)}</Td>
                        <Td muted>{String(it.sortOrder ?? 0)}</Td>
                      </>
                    ) : tab === "testimonial" ? (
                      <>
                        <Td>
                          <p className="line-clamp-2">“{String(it.quote)}”</p>
                        </Td>
                        <Td muted>
                          {String(it.author)}
                          {it.company ? `, ${String(it.company)}` : ""}
                          {!it.approved && <Badge tone="warning" className="ml-2">Unapproved</Badge>}
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td>
                          {editHref ? (
                            <Link href={editHref} className="font-medium hover:text-accent">
                              {String(it.title ?? it.name)}
                            </Link>
                          ) : (
                            String(it.title ?? it.name)
                          )}
                        </Td>
                        <Td muted>
                          <span className="font-mono text-xs">{String(it.slug)}</span>
                        </Td>
                      </>
                    )}
                    <Td>
                      <Badge tone={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</Badge>
                    </Td>
                    {tab !== "faq" && tab !== "testimonial" && <Td muted>{formatDate(it.updatedAt as Date)}</Td>}
                    <Td>
                      <div className="flex justify-end gap-2">
                        {editHref && canWrite && (
                          <Link href={editHref} className="text-xs text-muted hover:text-on-dark">
                            Edit
                          </Link>
                        )}
                        {(tab === "faq" || tab === "testimonial") && canWrite && (
                          <Link href={`/admin/content/${tab}/${id}`} className="text-xs text-muted hover:text-on-dark">
                            Edit
                          </Link>
                        )}
                        {canDelete && (
                          <ActionButton action={contentDeleteAction} fields={{ kind: tab, id: slugKinds.includes(tab) ? String(it.slug) : id }} variant="danger" className="min-h-7 px-2 text-[0.65rem]" confirm="Delete this record permanently?">
                            Delete
                          </ActionButton>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <EmptyState title={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} in the database`} body={slugKinds.includes(tab) ? "Create one or run the seed script to load the starter content." : "Add one using the form."} />
          )}
        </Card>
        {tab === "testimonial" && canWrite && (
          <Card title="Add testimonial" description="Only publish wording the person approved.">
            <TestimonialForm />
          </Card>
        )}
        {tab === "faq" && canWrite && (
          <Card title="Add FAQ">
            <FaqForm />
          </Card>
        )}
      </div>
    </>
  );
}
