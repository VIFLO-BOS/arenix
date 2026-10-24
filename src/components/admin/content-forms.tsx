import { ActionForm, Submit } from "./action-form";
import { FieldLabel, FormRow, inputClass, selectClass } from "./ui";
import { contentUpsertAction } from "@/app/admin/(dashboard)/actions";
import { TECH_CATEGORIES } from "@/content/technologies";
import type { Article, CareerOpening, Faq, Service, Solution, Technology, Testimonial } from "@/types/content";

const join = (a?: string[]) => (a ?? []).join("\n");
const pairLines = (a?: { a: string; b: string }[]) => (a ?? []).map((p) => `${p.a} :: ${p.b}`).join("\n");
const d = (v?: string | Date) => (v ? new Date(v).toISOString().slice(0, 10) : "");

function Published({ checked, label = "Published" }: { checked?: boolean; label?: string }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" name="published" defaultChecked={checked ?? false} className="accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

function SlugFields({ slug, originalSlug, prefix }: { slug?: string; originalSlug?: string; prefix: string }) {
  return (
    <>
      {originalSlug && <input type="hidden" name="originalSlug" value={originalSlug} />}
      <FormRow>
        <FieldLabel htmlFor={`${prefix}-slug`} hint="(URL)">
          Slug
        </FieldLabel>
        <input id={`${prefix}-slug`} name="slug" defaultValue={slug ?? ""} className={`${inputClass} font-mono`} pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
      </FormRow>
    </>
  );
}

export function ServiceForm({ item }: { item?: Partial<Service> }) {
  return (
    <ActionForm action={contentUpsertAction} refresh={!!item?.slug}>
      <input type="hidden" name="kind" value="service" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="s-index">Index</FieldLabel>
          <input id="s-index" name="index" defaultValue={item?.index ?? ""} className={inputClass} placeholder="01" required />
        </FormRow>
        <SlugFields slug={item?.slug} originalSlug={item?.slug} prefix="s" />
        <FormRow>
          <FieldLabel htmlFor="s-title">Title</FieldLabel>
          <input id="s-title" name="title" defaultValue={item?.title ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-short">Short title</FieldLabel>
          <input id="s-short" name="shortTitle" defaultValue={item?.shortTitle ?? ""} className={inputClass} />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="s-summary">Summary</FieldLabel>
          <input id="s-summary" name="summary" defaultValue={item?.summary ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="s-desc">Description</FieldLabel>
          <textarea id="s-desc" name="description" rows={4} defaultValue={item?.description ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-problems" hint="(one per line)">
            Problems addressed
          </FieldLabel>
          <textarea id="s-problems" name="problems" rows={4} defaultValue={join(item?.problems)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-deliv" hint="(one per line)">
            Deliverables
          </FieldLabel>
          <textarea id="s-deliv" name="deliverables" rows={4} defaultValue={join(item?.deliverables)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-workflow" hint="(Title :: detail, one per line)">
            Workflow
          </FieldLabel>
          <textarea id="s-workflow" name="workflow" rows={4} defaultValue={pairLines(item?.workflow?.map((w) => ({ a: w.title, b: w.detail })))} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-faqs" hint="(Question :: answer, one per line)">
            FAQs
          </FieldLabel>
          <textarea id="s-faqs" name="faqs" rows={4} defaultValue={pairLines(item?.faqs?.map((f) => ({ a: f.question, b: f.answer })))} className={inputClass} />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="s-tech">Technical approach</FieldLabel>
          <textarea id="s-tech" name="technicalApproach" rows={3} defaultValue={item?.technicalApproach ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-hero">Hero style</FieldLabel>
          <select id="s-hero" name="heroStyle" defaultValue={item?.heroStyle ?? "grid"} className={selectClass}>
            {["grid", "stack", "frame", "orbit", "split", "ledger", "flow", "cloud"].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-related" hint="(project slugs, one per line)">
            Related projects
          </FieldLabel>
          <textarea id="s-related" name="relatedProjectSlugs" rows={2} defaultValue={join(item?.relatedProjectSlugs)} className={`${inputClass} font-mono text-xs`} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="s-sort">Sort order</FieldLabel>
          <input id="s-sort" name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} className={inputClass} />
        </FormRow>
      </div>
      <Published checked={item?.published ?? true} />
      <div>
        <Submit>Save service</Submit>
      </div>
    </ActionForm>
  );
}

export function SolutionForm({ item }: { item?: Partial<Solution> }) {
  return (
    <ActionForm action={contentUpsertAction} refresh={!!item?.slug}>
      <input type="hidden" name="kind" value="solution" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="so-sector">Sector</FieldLabel>
          <input id="so-sector" name="sector" defaultValue={item?.sector ?? ""} className={inputClass} required />
        </FormRow>
        <SlugFields slug={item?.slug} originalSlug={item?.slug} prefix="so" />
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="so-title">Title</FieldLabel>
          <input id="so-title" name="title" defaultValue={item?.title ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="so-summary">Summary</FieldLabel>
          <input id="so-summary" name="summary" defaultValue={item?.summary ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="so-desc">Description</FieldLabel>
          <textarea id="so-desc" name="description" rows={4} defaultValue={item?.description ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-needs" hint="(one per line)">
            Business needs
          </FieldLabel>
          <textarea id="so-needs" name="needs" rows={4} defaultValue={join(item?.needs)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-use" hint="(Title :: detail, one per line)">
            Use cases
          </FieldLabel>
          <textarea id="so-use" name="useCases" rows={4} defaultValue={pairLines(item?.useCases?.map((u) => ({ a: u.title, b: u.detail })))} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-wf" hint="(one per line)">
            Workflow
          </FieldLabel>
          <textarea id="so-wf" name="workflow" rows={4} defaultValue={join(item?.workflow)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-arch">Architecture notes</FieldLabel>
          <textarea id="so-arch" name="architectureNotes" rows={4} defaultValue={item?.architectureNotes ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-proof" hint="(project slugs, one per line)">
            Proof projects
          </FieldLabel>
          <textarea id="so-proof" name="proofProjectSlugs" rows={2} defaultValue={join(item?.proofProjectSlugs)} className={`${inputClass} font-mono text-xs`} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-cap">Capability status</FieldLabel>
          <select id="so-cap" name="capabilityStatus" defaultValue={item?.capabilityStatus ?? "proposed"} className={selectClass}>
            <option value="delivered">Delivered (public case study exists)</option>
            <option value="mixed">Mixed (delivered + proposed)</option>
            <option value="proposed">Proposed capability only</option>
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="so-sort">Sort order</FieldLabel>
          <input id="so-sort" name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} className={inputClass} />
        </FormRow>
      </div>
      <Published checked={item?.published ?? true} />
      <div>
        <Submit>Save solution</Submit>
      </div>
    </ActionForm>
  );
}

export function TechnologyForm({ item }: { item?: Partial<Technology> }) {
  return (
    <ActionForm action={contentUpsertAction} refresh={!!item?.slug}>
      <input type="hidden" name="kind" value="technology" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="t-name">Name</FieldLabel>
          <input id="t-name" name="name" defaultValue={item?.name ?? ""} className={inputClass} required />
        </FormRow>
        <SlugFields slug={item?.slug} originalSlug={item?.slug} prefix="t" />
        <FormRow>
          <FieldLabel htmlFor="t-cat">Category</FieldLabel>
          <select id="t-cat" name="category" defaultValue={item?.category ?? "Frontend"} className={selectClass}>
            {TECH_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="t-projects" hint="(project slugs, one per line)">
            Used in
          </FieldLabel>
          <textarea id="t-projects" name="projectSlugs" rows={2} defaultValue={join(item?.projectSlugs)} className={`${inputClass} font-mono text-xs`} />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="t-desc">Description</FieldLabel>
          <input id="t-desc" name="description" defaultValue={item?.description ?? ""} className={inputClass} />
        </FormRow>
      </div>
      <Published checked={item?.published ?? true} />
      <div>
        <Submit>Save technology</Submit>
      </div>
    </ActionForm>
  );
}

export function ArticleForm({ item }: { item?: Partial<Article> }) {
  return (
    <ActionForm action={contentUpsertAction} refresh={!!item?.slug}>
      <input type="hidden" name="kind" value="article" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="a-title">Title</FieldLabel>
          <input id="a-title" name="title" defaultValue={item?.title ?? ""} className={inputClass} required />
        </FormRow>
        <SlugFields slug={item?.slug} originalSlug={item?.slug} prefix="a" />
        <FormRow>
          <FieldLabel htmlFor="a-author">Author (real person or team)</FieldLabel>
          <input id="a-author" name="author" defaultValue={item?.author ?? "areniX Engineering"} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="a-excerpt">Excerpt</FieldLabel>
          <textarea id="a-excerpt" name="excerpt" rows={2} defaultValue={item?.excerpt ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="a-content" hint="(markdown)">
            Content
          </FieldLabel>
          <textarea id="a-content" name="content" rows={16} defaultValue={item?.content ?? ""} className={`${inputClass} font-mono text-xs`} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="a-cat">Category</FieldLabel>
          <input id="a-cat" name="category" defaultValue={item?.category ?? "Engineering"} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="a-tags" hint="(comma separated)">
            Tags
          </FieldLabel>
          <input id="a-tags" name="tags" defaultValue={(item?.tags ?? []).join(", ")} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="a-cover">Cover image path</FieldLabel>
          <input id="a-cover" name="coverSrc" defaultValue={item?.coverSrc ?? ""} className={`${inputClass} font-mono text-xs`} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="a-coveralt">Cover alt text</FieldLabel>
          <input id="a-coveralt" name="coverAlt" defaultValue={item?.coverAlt ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="a-date">Publish date</FieldLabel>
          <input id="a-date" name="publishedAt" type="date" defaultValue={d(item?.publishedAt)} className={inputClass} />
        </FormRow>
      </div>
      <Published checked={item?.published ?? false} />
      <div>
        <Submit>Save article</Submit>
      </div>
    </ActionForm>
  );
}

export function CareerForm({ item }: { item?: Partial<CareerOpening> }) {
  return (
    <ActionForm action={contentUpsertAction} refresh={!!item?.slug}>
      <input type="hidden" name="kind" value="career" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="c-title">Role title</FieldLabel>
          <input id="c-title" name="title" defaultValue={item?.title ?? ""} className={inputClass} required />
        </FormRow>
        <SlugFields slug={item?.slug} originalSlug={item?.slug} prefix="c" />
        <FormRow>
          <FieldLabel htmlFor="c-loc">Location</FieldLabel>
          <input id="c-loc" name="location" defaultValue={item?.location ?? "Remote"} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-type">Type</FieldLabel>
          <select id="c-type" name="type" defaultValue={item?.type ?? "Full-time"} className={selectClass}>
            {["Full-time", "Part-time", "Contract", "Internship"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="c-summary">Summary</FieldLabel>
          <input id="c-summary" name="summary" defaultValue={item?.summary ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="c-desc" hint="(markdown)">
            Description
          </FieldLabel>
          <textarea id="c-desc" name="description" rows={8} defaultValue={item?.description ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="c-req" hint="(one per line)">
            Requirements
          </FieldLabel>
          <textarea id="c-req" name="requirements" rows={4} defaultValue={join(item?.requirements)} className={inputClass} />
        </FormRow>
      </div>
      <Published checked={item?.published ?? false} label="Published (role is genuinely open)" />
      <div>
        <Submit>Save opening</Submit>
      </div>
    </ActionForm>
  );
}

export function TestimonialForm({ item }: { item?: Partial<Testimonial> & { _id?: string } }) {
  return (
    <ActionForm action={contentUpsertAction} resetOnSuccess={!item?._id}>
      <input type="hidden" name="kind" value="testimonial" />
      {item?._id && <input type="hidden" name="id" value={item._id} />}
      <FormRow>
        <FieldLabel htmlFor="tm-quote">Quote (exact wording as approved)</FieldLabel>
        <textarea id="tm-quote" name="quote" rows={3} defaultValue={item?.quote ?? ""} className={inputClass} required />
      </FormRow>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormRow>
          <FieldLabel htmlFor="tm-author">Author</FieldLabel>
          <input id="tm-author" name="author" defaultValue={item?.author ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="tm-role">Role</FieldLabel>
          <input id="tm-role" name="role" defaultValue={item?.role ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="tm-company">Company</FieldLabel>
          <input id="tm-company" name="company" defaultValue={item?.company ?? ""} className={inputClass} />
        </FormRow>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="approved" defaultChecked={item?.approved ?? false} className="accent-[var(--color-accent)]" />
        The person has approved publication of this exact wording
      </label>
      <Published checked={item?.published ?? false} label="Published (requires approval)" />
      <div>
        <Submit>Save testimonial</Submit>
      </div>
    </ActionForm>
  );
}

export function FaqForm({ item }: { item?: Partial<Faq> & { _id?: string } }) {
  return (
    <ActionForm action={contentUpsertAction} resetOnSuccess={!item?._id}>
      <input type="hidden" name="kind" value="faq" />
      {item?._id && <input type="hidden" name="id" value={item._id} />}
      <FormRow>
        <FieldLabel htmlFor="f-q">Question</FieldLabel>
        <input id="f-q" name="question" defaultValue={item?.question ?? ""} className={inputClass} required />
      </FormRow>
      <FormRow>
        <FieldLabel htmlFor="f-a">Answer</FieldLabel>
        <textarea id="f-a" name="answer" rows={3} defaultValue={item?.answer ?? ""} className={inputClass} required />
      </FormRow>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="f-scope">Scope</FieldLabel>
          <select id="f-scope" name="scope" defaultValue={item?.scope ?? "general"} className={selectClass}>
            {["general", "services", "contact", "booking", "careers"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="f-sort">Sort order</FieldLabel>
          <input id="f-sort" name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} className={inputClass} />
        </FormRow>
      </div>
      <Published checked={item?.published ?? true} />
      <div>
        <Submit>Save FAQ</Submit>
      </div>
    </ActionForm>
  );
}
