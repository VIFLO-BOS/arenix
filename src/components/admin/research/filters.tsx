import { inputClass, selectClass, btnSecondary } from "@/components/admin/ui";
import { SCORE_BANDS, SCORE_BAND_LABEL, SOURCE_LABEL, VERIFICATION_LABEL, VERIFICATION_LEVELS, WEBSITE_STATUSES, WEBSITE_STATUS_LABEL } from "@/types/research";
import type { ProspectFilter } from "@/server/research/service";

export type FilterParams = Partial<Record<"q" | "foundBy" | "websiteStatus" | "band" | "verification" | "location" | "industry" | "inLeads" | "show" | "sort" | "page", string>>;

/** Reads the table filters from the query string. Unknown values are ignored by the query. */
export function filterFrom(sp: FilterParams, searchId?: string): ProspectFilter {
  return {
    searchId,
    q: sp.q || undefined,
    foundBy: sp.foundBy || undefined,
    websiteStatus: sp.websiteStatus || undefined,
    band: sp.band || undefined,
    verification: sp.verification || undefined,
    location: sp.location || undefined,
    industry: sp.industry || undefined,
    inLeads: sp.inLeads === "yes" ? "yes" : sp.inLeads === "no" ? "no" : undefined,
    show: sp.show === "dismissed" ? "dismissed" : "active",
    sort: sp.sort === "newest" ? "newest" : sp.sort === "name" ? "name" : "score",
    page: Number(sp.page ?? 1) || 1,
  };
}

/** Query string for the same filters, used by pagination and export links. */
export function filterQuery(sp: FilterParams, extra: Record<string, string> = {}): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") out.set(k, v);
  for (const [k, v] of Object.entries(extra)) out.set(k, v);
  return out.toString();
}

/** Filter bar for the results table. A plain GET form, so filters live in the address. */
export function ProspectFilters({ sp, sources }: { sp: FilterParams; sources: string[] }) {
  return (
    <form method="get" className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search name, domain or industry" aria-label="Search businesses" className={inputClass} />
      <select name="foundBy" defaultValue={sp.foundBy ?? ""} aria-label="Found by" className={selectClass}>
        <option value="">Found by anyone</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            Found by {SOURCE_LABEL[s] ?? s}
          </option>
        ))}
      </select>
      <select name="websiteStatus" defaultValue={sp.websiteStatus ?? ""} aria-label="Website status" className={selectClass}>
        <option value="">Any website status</option>
        {WEBSITE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {WEBSITE_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select name="band" defaultValue={sp.band ?? ""} aria-label="Score band" className={selectClass}>
        <option value="">Any score</option>
        {SCORE_BANDS.map((b) => (
          <option key={b} value={b}>
            {SCORE_BAND_LABEL[b]}
          </option>
        ))}
      </select>
      <select name="verification" defaultValue={sp.verification ?? ""} aria-label="Verification" className={selectClass}>
        <option value="">Any verification</option>
        {VERIFICATION_LEVELS.map((v) => (
          <option key={v} value={v}>
            {VERIFICATION_LABEL[v]}
          </option>
        ))}
      </select>
      <input name="location" defaultValue={sp.location ?? ""} placeholder="City, state or country" aria-label="Location" className={inputClass} />
      <input name="industry" defaultValue={sp.industry ?? ""} placeholder="Industry" aria-label="Industry" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <select name="inLeads" defaultValue={sp.inLeads ?? ""} aria-label="In Leads" className={selectClass}>
          <option value="">In Leads or not</option>
          <option value="no">Not in Leads</option>
          <option value="yes">Already in Leads</option>
        </select>
        <select name="sort" defaultValue={sp.sort ?? "score"} aria-label="Sort" className={selectClass}>
          <option value="score">Highest score</option>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input type="checkbox" name="show" value="dismissed" defaultChecked={sp.show === "dismissed"} className="accent-[var(--color-accent)]" />
        Show dismissed only
      </label>
      <div className="flex gap-2 lg:col-start-4">
        <button type="submit" className={btnSecondary}>
          Filter
        </button>
      </div>
    </form>
  );
}
