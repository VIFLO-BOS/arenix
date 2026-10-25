import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { adminGetPortfolio, listMediaAssets } from "@/server/services/cms";
import { listPortfolioSlugs } from "@/server/services/pickers";
import { toPlain } from "@/lib/utils";
import type { PortfolioProject } from "@/types/content";
import { PageHeader, Card, FieldLabel, FormRow, inputClass, selectClass, Notice } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm, Submit } from "@/components/admin/action-form";
import { PortfolioForm } from "@/components/admin/portfolio-form";
import { portfolioDeleteAction, portfolioMediaAction, portfolioMediaRemoveAction } from "../../actions";

export default async function PortfolioEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePermission("cms:read");
  const { slug } = await params;
  const [doc, slugs, media] = await Promise.all([adminGetPortfolio(slug), listPortfolioSlugs(), listMediaAssets(1)]);
  if (!doc) notFound();
  const project = toPlain(doc) as unknown as PortfolioProject & { _id: string };
  const canWrite = userCan(user, "cms:write");
  const canPublish = userCan(user, "cms:publish");

  return (
    <>
      <PageHeader
        eyebrow="Portfolio project"
        title={project.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={project.published ? "success" : "neutral"}>{project.published ? "Published" : "Draft"}</Badge>
            {!project.approvedForPublication && <Badge tone="warning">Not approved</Badge>}
            <span className="font-mono text-xs">/work/{project.slug}</span>
          </span>
        }
        actions={
          <>
            <Link href="/admin/portfolio" className="text-xs text-slate-500 hover:text-slate-900">
              Portfolio
            </Link>
            <Link href={`/work/${project.slug}`} target="_blank" className="text-xs text-slate-500 hover:text-slate-900">
              Preview
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="flex flex-col gap-4 xl:col-span-3">
          <Card title="Details">{canWrite ? <PortfolioForm project={project} allSlugs={slugs} /> : <p className="text-sm text-slate-500">Read only for your role.</p>}</Card>
          {canPublish && (
            <Card title="Danger zone">
              <ActionButton action={portfolioDeleteAction} fields={{ slug: project.slug }} variant="danger" confirm={`Delete "${project.title}" permanently? The public page will 404.`}>
                Delete project
              </ActionButton>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card title={`Screenshots and media (${project.gallery.length})`} description="Only approved authentic media is shown publicly. Everything else renders the labelled placeholder.">
            {project.gallery.length ? (
              <ul className="mb-4 flex flex-col gap-3">
                {project.gallery.map((m) => (
                  <li key={m.id} className="flex gap-3 rounded-lg border border-slate-200 p-2">
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-slate-100">
                      <Image src={m.src} alt="" fill sizes="96px" className="object-cover object-top" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="truncate font-medium">{m.pageLabel ?? m.caption ?? m.id}</p>
                      <p className="truncate text-slate-500">{m.alt}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {project.coverMedia?.id === m.id && <Badge tone="accent">Cover</Badge>}
                        <Badge tone={m.approvedForPublication ? "success" : "warning"}>{m.approvedForPublication ? "Approved" : "Unapproved"}</Badge>
                        <Badge tone="outline">{m.isAuthenticScreenshot ? "Authentic" : m.kind}</Badge>
                        {m.device && <Badge tone="outline">{m.device}</Badge>}
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex flex-col gap-1">
                        {project.coverMedia?.id !== m.id && (
                          <ActionButton action={portfolioMediaAction} fields={{ slug: project.slug, mediaId: m.id, src: m.src, alt: m.alt, caption: m.caption ?? "", pageLabel: m.pageLabel ?? "", kind: m.kind, device: m.device ?? "", isAuthenticScreenshot: m.isAuthenticScreenshot ? "on" : "", approvedForPublication: m.approvedForPublication ? "on" : "", sortOrder: String(m.sortOrder ?? 0), setAsCover: "on" }} variant="secondary" className="min-h-8 px-2 text-[0.65rem]">
                            Set cover
                          </ActionButton>
                        )}
                        <ActionButton action={portfolioMediaRemoveAction} fields={{ slug: project.slug, mediaId: m.id }} variant="danger" className="min-h-8 px-2 text-[0.65rem]" confirm="Remove this image from the project?">
                          Remove
                        </ActionButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Notice tone="info">No media yet. The public card shows a labelled &ldquo;preview being prepared&rdquo; placeholder.</Notice>
            )}

            {canWrite && (
              <ActionForm action={portfolioMediaAction} resetOnSuccess className="rounded-lg border border-dashed border-slate-200 p-3">
                <input type="hidden" name="slug" value={project.slug} />
                <p className="text-xs font-semibold">Add or update media</p>
                <FormRow>
                  <FieldLabel htmlFor="m-src" hint="(from the media library or the screenshots folder)">
                    Image path
                  </FieldLabel>
                  <input id="m-src" name="src" list="media-list" className={`${inputClass} font-mono text-xs`} placeholder="/uploads/media/file.webp or /screenshots/slug/file.webp" required />
                  <datalist id="media-list">
                    {media.items.map((a) => (
                      <option key={a._id.toString()} value={a.url}>
                        {a.alt || a.filename}
                      </option>
                    ))}
                  </datalist>
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="m-alt">Alt text (what is on screen)</FieldLabel>
                  <input id="m-alt" name="alt" className={inputClass} required />
                </FormRow>
                <div className="grid grid-cols-2 gap-2">
                  <FormRow>
                    <FieldLabel htmlFor="m-page">Page label</FieldLabel>
                    <input id="m-page" name="pageLabel" className={inputClass} placeholder="Homepage" />
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="m-caption">Caption</FieldLabel>
                    <input id="m-caption" name="caption" className={inputClass} />
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="m-kind">Kind</FieldLabel>
                    <select id="m-kind" name="kind" className={selectClass} defaultValue="screenshot">
                      <option value="screenshot">Screenshot</option>
                      <option value="device-mockup">Device mockup</option>
                      <option value="illustration">Illustration</option>
                      <option value="video">Video</option>
                    </select>
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="m-device">Device</FieldLabel>
                    <select id="m-device" name="device" className={selectClass} defaultValue="desktop">
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="m-order">Sort order</FieldLabel>
                    <input id="m-order" name="sortOrder" type="number" min={0} defaultValue={project.gallery.length + 1} className={inputClass} />
                  </FormRow>
                </div>
                <div className="grid gap-1 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isAuthenticScreenshot" defaultChecked className="accent-[var(--color-accent)]" /> Authentic screenshot of this product
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="approvedForPublication" className="accent-[var(--color-accent)]" /> Approved for publication (sanitised, owner approved)
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="setAsCover" className="accent-[var(--color-accent)]" /> Use as cover image
                  </label>
                </div>
                <div>
                  <Submit variant="secondary">Add media</Submit>
                </div>
              </ActionForm>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
