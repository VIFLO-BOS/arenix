import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { getResearchSettings } from "@/server/ai/settings";
import { listSearches, sourceOptions } from "@/server/research/service";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Notice, FieldLabel, FormRow, inputClass, selectClass } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { FoundBy } from "@/components/admin/research/labels";
import { ResearchNav } from "@/components/admin/research/research-nav";
import { prospectSearchAction } from "../research-actions";

// Starting a search also starts the background research, which may run for a few minutes.
export const maxDuration = 300;

const usd = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

export default async function DiscoverPage() {
  const user = await requirePermission("leads:read");
  const canRun = userCan(user, "prospecting:run");
  const [settings, options, searches] = await Promise.all([getResearchSettings(), sourceOptions(20), listSearches(30)]);
  const firstAi = options.find((o) => o.kind === "ai" && o.available)?.id;

  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="Find leads"
        description="Describe the businesses you want. Every AI and data source you choose searches at once, and all results land in one table with a Found by column."
      />
      <ResearchNav current="/admin/leads/discover" showSettings={userCan(user, "settings:write")} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {canRun ? (
          <Card title="New search" description="Fill in what you know. Empty fields are read from your description by AI when one is switched on.">
            <ActionForm action={prospectSearchAction}>
              <FormRow>
                <FieldLabel htmlFor="ps-text">What are you looking for?</FieldLabel>
                <textarea id="ps-text" name="text" rows={3} required maxLength={500} placeholder="For example, registered logistics companies in Lagos with no website" className={inputClass} />
              </FormRow>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormRow>
                  <FieldLabel htmlFor="ps-industry">Industry</FieldLabel>
                  <input id="ps-industry" name="industry" list="ps-industries" maxLength={80} className={inputClass} />
                  <datalist id="ps-industries">
                    {settings.targeting.industries.map((i) => (
                      <option key={i} value={i} />
                    ))}
                  </datalist>
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="ps-keywords" hint="(comma separated)">
                    Keywords
                  </FieldLabel>
                  <input id="ps-keywords" name="keywords" maxLength={200} placeholder="haulage, courier" className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="ps-country">Country</FieldLabel>
                  <input id="ps-country" name="country" list="ps-countries" maxLength={80} defaultValue={settings.targeting.countries[0] ?? ""} className={inputClass} />
                  <datalist id="ps-countries">
                    {settings.targeting.countries.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="ps-region">State or region</FieldLabel>
                  <input id="ps-region" name="region" maxLength={80} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="ps-city">City</FieldLabel>
                  <input id="ps-city" name="city" maxLength={80} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="ps-max">Businesses per source</FieldLabel>
                  <select id="ps-max" name="maxResults" defaultValue="20" className={selectClass}>
                    {[10, 20, 30, 50].map((n) => (
                      <option key={n} value={n}>
                        Up to {n}
                      </option>
                    ))}
                  </select>
                </FormRow>
              </div>

              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1 text-xs font-medium text-slate-700">Website</legend>
                {(
                  [
                    ["any", "Any businesses"],
                    ["none", "Prefer businesses without a website"],
                    ["has", "Only businesses with a website"],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="radio" name="websiteFilter" value={v} defaultChecked={v === "any"} className="accent-[var(--color-accent)]" />
                    {label}
                  </label>
                ))}
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-medium text-slate-700">Search with</legend>
                {options.map((o) => (
                  <label key={o.id} className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${o.available ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"}`}>
                    <input type="checkbox" name="sources[]" value={o.id} disabled={!o.available} defaultChecked={o.available && (o.id === firstAi || o.id === "openstreetmap")} className="mt-0.5 accent-[var(--color-accent)]" />
                    <span>
                      <span className="font-medium text-slate-900">{o.label}</span>
                      <span className="ml-1 text-slate-500">{o.kind === "ai" ? "AI web research" : "Directory"}</span>
                      <span className="block text-slate-500">{o.note}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" name="autoResearch" defaultChecked className="mt-0.5 accent-[var(--color-accent)]" />
                <span>Research each business&apos;s website automatically (free). AI summaries are only written when you ask for them.</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" name="refresh" className="mt-0.5 accent-[var(--color-accent)]" />
                <span>Run again even if the same search ran in the last 24 hours.</span>
              </label>
              <p className="text-xs text-slate-500">
                Budget left this month is checked before the search starts. Limit for one search per AI ${settings.budget.perSearchCapUsd.toFixed(2)}. AI results without a source page are thrown away.
              </p>
              <div>
                <Submit variant="accent" pendingLabel="Starting the search">
                  Find businesses
                </Submit>
              </div>
            </ActionForm>
          </Card>
        ) : (
          <Notice tone="info">You can view searches and businesses. Starting a search needs the prospecting permission, because searches cost money.</Notice>
        )}

        <Card title="Past searches" description="The same search within 24 hours reopens the earlier one instead of paying again.">
          {searches.length ? (
            <Table head={["Search", "Sources", "Status", "Cost", "Started"]} caption="Past searches">
              {searches.map((s) => {
                const by = s.createdBy as unknown as { name?: string } | null;
                return (
                  <tr key={s._id.toString()} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/admin/leads/discover/${s._id.toString()}`} className="line-clamp-2 font-medium hover:text-accent-deep">
                        {s.query}
                      </Link>
                      {by?.name && <p className="text-xs text-slate-500">{by.name}</p>}
                    </Td>
                    <Td>
                      <FoundBy sources={s.providers} />
                    </Td>
                    <Td>
                      <StatusBadge status={s.status} />
                    </Td>
                    <Td muted>{usd(s.actualCostUsd)}</Td>
                    <Td muted>{formatDateTime(s.createdAt)}</Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <EmptyState title="No searches yet" body="Run a search to find businesses. Results from every AI and source appear in one table." />
          )}
        </Card>
      </div>
    </>
  );
}
