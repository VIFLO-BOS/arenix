import Image from "next/image";
import { requirePermission, userCan } from "@/server/auth/session";
import { listMediaAssets } from "@/server/services/cms";
import { integrations } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { PageHeader, Card, EmptyState, Pager, FieldLabel, FormRow, inputClass, Notice } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm, Submit } from "@/components/admin/action-form";
import { contentDeleteAction, mediaUpdateAction, mediaUploadAction } from "../actions";

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePermission("cms:read");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1) || 1;
  const { items, total, pages } = await listMediaAssets(page);
  const canWrite = userCan(user, "media:write");
  const canDelete = userCan(user, "cms:publish");

  return (
    <>
      <PageHeader title="Media library" description={`${total} asset${total === 1 ? "" : "s"}, storage driver ${integrations.media.driver}. Approve an image before it can be published on a project.`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {items.length ? (
              <ul className="grid gap-3 xs:grid-cols-2 md:grid-cols-3">
                {items.map((a) => (
                  <li key={a._id.toString()} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2">
                    <div className="relative aspect-[4/3] overflow-hidden rounded bg-slate-100">
                      <Image src={a.url} alt={a.alt} fill sizes="(max width 768px) 50vw, 25vw" className="object-cover object-top" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={a.approvedForPublication ? "success" : "warning"}>{a.approvedForPublication ? "Approved" : "Unapproved"}</Badge>
                      {a.isAuthenticScreenshot && <Badge tone="outline">Authentic</Badge>}
                    </div>
                    <p className="truncate font-mono text-[0.65rem] text-slate-500" title={a.url}>
                      {a.url}
                    </p>
                    <p className="text-[0.65rem] text-slate-500">
                      {a.width && a.height ? `${a.width}×${a.height}, ` : ""}
                      {Math.round(a.size / 1024)} KB, {formatDate(a.createdAt as Date)}
                    </p>
                    {canWrite ? (
                      <ActionForm action={mediaUpdateAction} className="gap-2">
                        <input type="hidden" name="id" value={a._id.toString()} />
                        <input name="alt" defaultValue={a.alt} className={`${inputClass} min-h-8 text-xs`} aria-label="Alt text" placeholder="Alt text" />
                        <input name="caption" defaultValue={a.caption ?? ""} className={`${inputClass} min-h-8 text-xs`} aria-label="Caption" placeholder="Caption" />
                        <label className="flex items-center gap-1.5 text-[0.65rem]">
                          <input type="checkbox" name="approvedForPublication" defaultChecked={a.approvedForPublication} className="accent-[var(--color-accent)]" /> Approved for publication
                        </label>
                        <label className="flex items-center gap-1.5 text-[0.65rem]">
                          <input type="checkbox" name="isAuthenticScreenshot" defaultChecked={a.isAuthenticScreenshot} className="accent-[var(--color-accent)]" /> Authentic screenshot
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <Submit variant="secondary" className="min-h-8 px-2 text-xs">
                            Save
                          </Submit>
                          {canDelete && (
                            <ActionButton action={contentDeleteAction} fields={{ kind: "media", id: a._id.toString() }} variant="danger" className="min-h-8 px-2 text-[0.65rem]" confirm="Delete this file? It must not be used by any project.">
                              Delete
                            </ActionButton>
                          )}
                        </div>
                      </ActionForm>
                    ) : (
                      <p className="text-xs text-slate-500">{a.alt}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No uploaded media" body="Upload sanitised, owner approved screenshots here, then attach them to portfolio projects." />
            )}
            <Pager page={page} pages={pages} href={(p) => `/admin/media?page=${p}`} />
          </Card>
        </div>
        <div>
          {canWrite ? (
            <Card title="Upload image" description="PNG, JPEG, WebP or AVIF up to 10 MB. Content is sniffed server-side.">
              <ActionForm action={mediaUploadAction} resetOnSuccess>
                <FormRow>
                  <FieldLabel htmlFor="up-file">File</FieldLabel>
                  <input id="up-file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/avif" required className="block w-full text-xs file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:text-slate-900" />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="up-alt">Alt text (what is on screen)</FieldLabel>
                  <input id="up-alt" name="alt" className={inputClass} required />
                </FormRow>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isAuthenticScreenshot" defaultChecked className="accent-[var(--color-accent)]" /> Authentic screenshot of a real product
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="approvedForPublication" className="accent-[var(--color-accent)]" /> Approved for publication (sanitised; owner permission obtained)
                </label>
                <div>
                  <Submit pendingLabel="Uploading">Upload</Submit>
                </div>
              </ActionForm>
              <div className="mt-4">
                <Notice tone="info">Never upload screens containing employee names, salaries, emails, phone numbers, bank details or tokens. Crop or blur first.</Notice>
              </div>
            </Card>
          ) : (
            <Card title="Upload">
              <p className="text-sm text-slate-500">Your role can view media but not upload.</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
