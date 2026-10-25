import { ActionForm, Submit } from "./action-form";
import { FieldLabel, FormRow, inputClass, selectClass } from "./ui";
import { portfolioUpsertAction } from "@/app/admin/(dashboard)/actions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/types/content";
import type { PortfolioProject } from "@/types/content";

type P = Partial<PortfolioProject>;
const join = (a?: string[]) => (a ?? []).join("\n");
export function PortfolioForm({ project, allSlugs }: { project?: P; allSlugs: { slug: string; title: string }[] }) {
  const isEdit = !!project?.slug;
  return (
    <ActionForm action={portfolioUpsertAction} refresh={isEdit}>
      {isEdit && <input type="hidden" name="originalSlug" value={project!.slug} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="pf-title">Title</FieldLabel>
          <input id="pf-title" name="title" defaultValue={project?.title ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-slug" hint="(URL: /work/slug)">
            Slug
          </FieldLabel>
          <input id="pf-slug" name="slug" defaultValue={project?.slug ?? ""} className={`${inputClass} font-mono`} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="pf-teaser">Teaser (card text)</FieldLabel>
          <input id="pf-teaser" name="teaser" defaultValue={project?.teaser ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="pf-desc">Description</FieldLabel>
          <textarea id="pf-desc" name="description" rows={4} defaultValue={project?.description ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-status">Status</FieldLabel>
          <select id="pf-status" name="status" defaultValue={project?.status ?? "IN_DEVELOPMENT"} className={selectClass}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-industry">Industry</FieldLabel>
          <input id="pf-industry" name="industry" defaultValue={project?.industry ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-client">Client / owner</FieldLabel>
          <input id="pf-client" name="clientOrOwner" defaultValue={project?.clientOrOwner ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-role">Published role / contribution</FieldLabel>
          <input id="pf-role" name="publishedRole" defaultValue={project?.publishedRole ?? ""} className={inputClass} placeholder="Design & engineering by areniX" />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-year" hint="(only if verified)">
            Year
          </FieldLabel>
          <input id="pf-year" name="year" type="number" min={2000} max={2100} defaultValue={project?.year ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-sort">Sort order</FieldLabel>
          <input id="pf-sort" name="sortOrder" type="number" min={0} defaultValue={project?.sortOrder ?? 0} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-services" hint="(one per line)">
            Services
          </FieldLabel>
          <textarea id="pf-services" name="services" rows={3} defaultValue={join(project?.services)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-tech" hint="(one per line, verified only)">
            Technologies
          </FieldLabel>
          <textarea id="pf-tech" name="technologies" rows={3} defaultValue={join(project?.technologies)} className={inputClass} />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="pf-challenge">Challenge</FieldLabel>
          <textarea id="pf-challenge" name="challenge" rows={3} defaultValue={project?.challenge ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-goals" hint="(one per line)">
            Goals
          </FieldLabel>
          <textarea id="pf-goals" name="goals" rows={4} defaultValue={join(project?.goals)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-features" hint="(one per line)">
            Features
          </FieldLabel>
          <textarea id="pf-features" name="features" rows={4} defaultValue={join(project?.features)} className={inputClass} />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="pf-approach">Approach</FieldLabel>
          <textarea id="pf-approach" name="approach" rows={3} defaultValue={project?.approach ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-outcomes" hint="(one per line, verifiable only)">
            Outcomes
          </FieldLabel>
          <textarea id="pf-outcomes" name="outcomes" rows={3} defaultValue={join(project?.outcomes)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-eng">Engineering notes</FieldLabel>
          <textarea id="pf-eng" name="engineeringNotes" rows={3} defaultValue={project?.engineeringNotes ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-live" hint="(https only)">
            Live URL
          </FieldLabel>
          <input id="pf-live" name="liveUrl" type="url" defaultValue={project?.liveUrl ?? ""} className={inputClass} placeholder="https://" />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pf-repo" hint="(https only, public repos)">
            Repository URL
          </FieldLabel>
          <input id="pf-repo" name="repoUrl" type="url" defaultValue={project?.repoUrl ?? ""} className={inputClass} placeholder="https://" />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="pf-related" hint="(slugs, one per line)">
            Related projects
          </FieldLabel>
          <textarea id="pf-related" name="relatedSlugs" rows={2} defaultValue={join(project?.relatedSlugs)} className={`${inputClass} font-mono text-xs`} />
          <p className="text-xs text-slate-500">Available: {allSlugs.filter((s) => s.slug !== project?.slug).map((s) => s.slug).join(", ") || ", "}</p>
        </FormRow>
      </div>
      <fieldset className="grid gap-2 rounded-lg border border-slate-200 p-3 text-xs sm:grid-cols-2">
        <legend className="px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">Publication</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isLiveUrlPublic" defaultChecked={project?.isLiveUrlPublic ?? false} className="accent-[var(--color-accent)]" />
          Live URL is public and approved (shows &ldquo;Visit Website&rdquo;)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="approvedForPublication" defaultChecked={project?.approvedForPublication ?? false} className="accent-[var(--color-accent)]" />
          Content approved for publication (required to publish)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={project?.featured ?? false} className="accent-[var(--color-accent)]" />
          Featured on home / work
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={project?.published ?? false} className="accent-[var(--color-accent)]" />
          Published (visible on the public site)
        </label>
      </fieldset>
      <div>
        <Submit>{isEdit ? "Save project" : "Create project"}</Submit>
      </div>
    </ActionForm>
  );
}
