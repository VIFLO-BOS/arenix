import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { integrations } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";
import { getResearchSettings } from "@/server/ai/settings";
import { loadSpend, recentUsage, usageSummary } from "@/server/ai/usage";
import { formatPriceLines } from "@/server/ai/pricing";
import { AI_PROVIDERS, AI_PROVIDER_ENV, AI_PROVIDER_LABEL, AI_TASKS, AI_TASK_HINT, AI_TASK_LABEL, SOURCE_LABEL, type AiProviderId, type AiTask } from "@/types/research";
import { PageHeader, Card, Stat, Table, Td, EmptyState, Notice, FieldLabel, FormRow, inputClass, selectClass, btnSecondary } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { leadResearchSettingsAction, providerTestAction } from "../../actions";
import { leadResearchTuningAction } from "../../leads/research-actions";

/** Small amounts need more decimals. A test request costs a fraction of a cent. */
function usd(n: number) {
  return n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

const MODEL_FIELD: Record<AiTask, string> = { research: "modelResearch", extract: "modelExtract", analyse: "modelAnalyse", write: "modelWrite" };

/** Gemini and OpenAI were written from the documentation before a key existed to test them with. */
const UNTESTED: ReadonlySet<AiProviderId> = new Set(["gemini", "openai"]);

const OTHER_LABEL: Record<string, string> = { crawler: "Website crawler", pagespeed: "PageSpeed" };
const labelOf = (provider: string) => SOURCE_LABEL[provider] ?? OTHER_LABEL[provider] ?? provider;

export default async function LeadResearchSettingsPage() {
  await requirePermission("settings:write");
  const [settings, spend, summary, recent] = await Promise.all([getResearchSettings(), loadSpend(), usageSummary(), recentUsage(15)]);
  const remaining = Math.max(0, settings.budget.monthlyCapUsd - spend.monthTotalUsd);
  const requests = summary.reduce((n, r) => n + r.requests, 0);
  const failed = summary.reduce((n, r) => n + r.failed, 0);
  const main = settings.providerOrder.find((p) => settings.providers[p].enabled && integrations.ai[p].configured);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Lead research"
        description="The AI providers used to find and research businesses, the models they run, and how much they may spend. API keys live in the server environment and are never shown or stored here."
        actions={
          <Link href="/admin/settings" className={btnSecondary}>
            Back to settings
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {AI_PROVIDERS.map((p) => (
          <Notice key={p} tone={integrations.ai[p].configured ? "success" : "info"}>
            {AI_PROVIDER_LABEL[p]} {integrations.ai[p].configured ? "API key configured" : "has no API key"}
          </Notice>
        ))}
      </div>

      {!main && (
        <div className="mb-4">
          <Notice tone="warning">No AI provider is both switched on and configured, so lead research cannot run yet. Add an API key to the environment and switch that provider on below.</Notice>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Spent this month" value={usd(spend.monthTotalUsd)} hint="Estimated from recorded usage" />
        <Stat label="Monthly budget" value={usd(settings.budget.monthlyCapUsd)} hint="Requests stop at this amount" />
        <Stat label="Remaining" value={usd(remaining)} tone={remaining <= 0 ? "danger" : "success"} />
        <Stat label="Requests this month" value={requests} hint={failed ? `${failed} failed` : "None failed"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Budget and order" description="Every request is checked against these limits before it is sent. A request that would pass a limit is refused.">
          <ActionForm action={leadResearchSettingsAction}>
            <input type="hidden" name="section" value="budget" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormRow>
                <FieldLabel htmlFor="lr-month" hint="(US dollars, all providers)">
                  Monthly budget
                </FieldLabel>
                <input id="lr-month" name="monthlyCapUsd" type="number" min={0} max={10000} step="0.01" inputMode="decimal" defaultValue={settings.budget.monthlyCapUsd} className={inputClass} />
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="lr-search" hint="(US dollars)">
                  Limit for one search
                </FieldLabel>
                <input id="lr-search" name="perSearchCapUsd" type="number" min={0} max={100} step="0.01" inputMode="decimal" defaultValue={settings.budget.perSearchCapUsd} className={inputClass} />
              </FormRow>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["First", "Second", "Third"] as const).map((label, i) => (
                <FormRow key={label}>
                  <FieldLabel htmlFor={`lr-order-${i}`}>{label} choice</FieldLabel>
                  <select id={`lr-order-${i}`} name={`order${i + 1}`} defaultValue={settings.providerOrder[i]} className={selectClass}>
                    {AI_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {AI_PROVIDER_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </FormRow>
              ))}
            </div>
            <p className="text-xs text-slate-500">The first provider that is switched on does the work. A later one takes over only when it is switched on and allowed as a fallback. The month runs on UTC time.</p>
            <div>
              <Submit>Save budget and order</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Test providers" description="Sends one tiny real request to each provider that has an API key and records the cost below.">
          <ActionForm action={providerTestAction}>
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" name="withWebSearch" className="mt-0.5 accent-[var(--color-accent)]" />
              <span>Also test web search. This adds one request per provider that searches the web, which costs a few US cents.</span>
            </label>
            <div>
              <Submit variant="accent" pendingLabel="Testing, this can take a minute">
                Test providers
              </Submit>
            </div>
          </ActionForm>
        </Card>

        {AI_PROVIDERS.map((p) => {
          const ps = settings.providers[p];
          const configured = integrations.ai[p].configured;
          const priced = settings.prices.filter((x) => x.provider === p).map((x) => x.model);
          return (
            <Card
              key={p}
              title={AI_PROVIDER_LABEL[p]}
              description={configured ? "API key configured" : `Add ${AI_PROVIDER_ENV[p]} to the environment to use this provider`}
              actions={<Badge tone={ps.enabled && configured ? "success" : ps.enabled ? "warning" : "neutral"}>{ps.enabled && configured ? "On" : ps.enabled ? "On, no key" : "Off"}</Badge>}
            >
              <ActionForm action={leadResearchSettingsAction}>
                <input type="hidden" name="section" value="provider" />
                <input type="hidden" name="provider" value={p} />
                {UNTESTED.has(p) && <Notice tone="warning">This connection was written from the official documentation and has not been tested with a live key yet. Run a provider test after adding the key and before switching it on.</Notice>}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="enabled" defaultChecked={ps.enabled} className="accent-[var(--color-accent)]" /> Use {AI_PROVIDER_LABEL[p]} for lead research
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="allowFallback" defaultChecked={ps.allowFallback} className="accent-[var(--color-accent)]" /> Allow as a fallback when a provider ahead of it cannot run
                  </label>
                </div>
                <FormRow>
                  <FieldLabel htmlFor={`lr-cap-${p}`} hint={`(US dollars, ${usd(spend.monthByProvider[p] ?? 0)} used this month)`}>
                    Monthly budget for {AI_PROVIDER_LABEL[p]}
                  </FieldLabel>
                  <input id={`lr-cap-${p}`} name="providerCapUsd" type="number" min={0} max={10000} step="0.01" inputMode="decimal" defaultValue={ps.monthlyCapUsd} className={inputClass} />
                </FormRow>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AI_TASKS.map((t) => (
                    <FormRow key={t}>
                      <FieldLabel htmlFor={`lr-${p}-${t}`}>{AI_TASK_LABEL[t]}</FieldLabel>
                      <input id={`lr-${p}-${t}`} name={MODEL_FIELD[t]} list={`lr-models-${p}`} defaultValue={ps.models[t]} className={`${inputClass} font-mono text-xs`} autoComplete="off" spellCheck={false} />
                      <p className="text-xs text-slate-500">{AI_TASK_HINT[t]}</p>
                    </FormRow>
                  ))}
                </div>
                <datalist id={`lr-models-${p}`}>
                  {priced.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <div>
                  <Submit>Save {AI_PROVIDER_LABEL[p]}</Submit>
                </div>
              </ActionForm>
            </Card>
          );
        })}

        <Card title="Prices" description="Used to estimate cost and enforce the budgets. Update them when a provider changes its prices. A model can only be chosen above once it has a price here.">
          <ActionForm action={leadResearchSettingsAction}>
            <input type="hidden" name="section" value="prices" />
            <FormRow>
              <FieldLabel htmlFor="lr-prices" hint="(one per line as provider, model, input price, output price in US dollars per million tokens)">
                Model prices
              </FieldLabel>
              <textarea id="lr-prices" name="pricesText" rows={Math.min(16, settings.prices.length + 2)} defaultValue={formatPriceLines(settings.prices)} className={`${inputClass} font-mono text-xs`} spellCheck={false} />
            </FormRow>
            <div className="grid gap-3 sm:grid-cols-3">
              {AI_PROVIDERS.map((p) => (
                <FormRow key={p}>
                  <FieldLabel htmlFor={`lr-sp-${p}`}>{AI_PROVIDER_LABEL[p]} web search</FieldLabel>
                  <input id={`lr-sp-${p}`} name={{ anthropic: "searchAnthropic", gemini: "searchGemini", openai: "searchOpenai" }[p]} type="number" min={0} max={1000} step="0.01" inputMode="decimal" defaultValue={settings.searchPricePer1000[p]} className={inputClass} />
                </FormRow>
              ))}
            </div>
            <p className="text-xs text-slate-500">Web search prices are in US dollars per 1,000 searches.</p>
            <div>
              <Submit>Save prices</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Data sources" description="Sources that are not AI. Keys live in the server environment.">
          <Table head={["Source", "Status", "Key"]} caption="Data sources" className="text-xs">
            {[
              ["OpenStreetMap", "Free open map data, always available", "None needed"],
              ["Google Maps (Places)", integrations.research.googlePlaces.configured ? `Configured, limited to ${settings.placesMonthlyLimit} requests a month` : "Not configured", "GOOGLE_PLACES_API_KEY"],
              ["PageSpeed Insights", integrations.research.pagespeed.configured ? "Configured" : "Optional and off. Speed scores are skipped, and the other website checks still run.", "PAGESPEED_API_KEY"],
              ["Companies House", integrations.research.companiesHouse.configured ? "Configured, United Kingdom only" : "Not configured", "COMPANIES_HOUSE_API_KEY"],
              ["Daily background run", integrations.research.cron.configured ? "Configured" : "Not configured, research runs only while a page is open or right after a search starts", "CRON_SECRET"],
            ].map(([name, status, key]) => (
              <tr key={name}>
                <Td>{name}</Td>
                <Td muted>{status}</Td>
                <Td className="font-mono text-[0.7rem] text-slate-500">{key}</Td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-slate-500">Nigeria&apos;s Corporate Affairs Commission has no public API, so CAC registration is checked by hand from each research profile.</p>
        </Card>

        <Card title="Crawl limits" description="How politely and how deeply business websites are read. The crawler always obeys robots.txt and stops when a site refuses it.">
          <ActionForm action={leadResearchTuningAction}>
            <input type="hidden" name="section" value="crawl" />
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["depth", "Link depth", settings.crawl.depth, 0, 4],
                  ["pagesPerSite", "Pages per site", settings.crawl.pagesPerSite, 1, 30],
                  ["timeoutSeconds", "Timeout per page (seconds)", settings.crawl.timeoutSeconds, 3, 30],
                  ["retries", "Retries", settings.crawl.retries, 0, 4],
                  ["delaySeconds", "Pause between pages (seconds)", settings.crawl.delaySeconds, 1, 30],
                  ["maxPageKb", "Largest page (KB)", settings.crawl.maxPageKb, 100, 10240],
                  ["pagesPerDay", "Pages per day, all sites", settings.crawl.pagesPerDay, 0, 20000],
                  ["placesMonthlyLimit", "Google Places requests a month", settings.placesMonthlyLimit, 0, 100000],
                ] as const
              ).map(([name, label, value, min, max]) => (
                <FormRow key={name}>
                  <FieldLabel htmlFor={`lr-c-${name}`}>{label}</FieldLabel>
                  <input id={`lr-c-${name}`} name={name} type="number" min={min} max={max} step={1} inputMode="numeric" defaultValue={value} className={inputClass} />
                </FormRow>
              ))}
            </div>
            <div>
              <Submit>Save crawl limits</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Scoring and targeting" description="The most points each signal adds to the base lead score, the industries areniX wants most, and how long unused research is kept." className="lg:col-span-2">
          <ActionForm action={leadResearchTuningAction}>
            <input type="hidden" name="section" value="scoring" />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  ["websiteNeed", "Website need"],
                  ["industryFit", "Industry fit"],
                  ["size", "Size signals"],
                  ["reachability", "Reachability"],
                  ["decisionMaker", "Decision maker"],
                  ["hiring", "Hiring"],
                ] as const
              ).map(([name, label]) => (
                <FormRow key={name}>
                  <FieldLabel htmlFor={`lr-w-${name}`}>{label}</FieldLabel>
                  <input id={`lr-w-${name}`} name={name} type="number" min={0} max={100} step={1} inputMode="numeric" defaultValue={settings.scoring[name]} className={inputClass} />
                </FormRow>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormRow>
                <FieldLabel htmlFor="lr-industries" hint="(one per line or comma separated)">
                  Target industries
                </FieldLabel>
                <textarea id="lr-industries" name="industries" rows={4} defaultValue={settings.targeting.industries.join("\n")} className={inputClass} />
              </FormRow>
              <div className="flex flex-col gap-3">
                <FormRow>
                  <FieldLabel htmlFor="lr-countries" hint="(offered first in the search form)">
                    Countries
                  </FieldLabel>
                  <input id="lr-countries" name="countries" defaultValue={settings.targeting.countries.join(", ")} className={inputClass} />
                </FormRow>
                <FormRow>
                  <FieldLabel htmlFor="lr-retention" hint="(months)">
                    Delete businesses not added to Leads after
                  </FieldLabel>
                  <input id="lr-retention" name="retentionMonths" type="number" min={1} max={60} step={1} inputMode="numeric" defaultValue={settings.retentionMonths} className={inputClass} />
                </FormRow>
              </div>
            </div>
            <p className="text-xs text-slate-500">The score is the share of the total weight earned, so weights need not add up to 100. AI may move a score by at most 10 points, and only for reasons that cite stored evidence.</p>
            <div>
              <Submit>Save scoring and targeting</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Usage this month" description="Estimated from the tokens and searches each request reported. The provider's own invoice is the final figure." className="lg:col-span-2">
          {summary.length ? (
            <Table head={["Provider", "Model", "Requests", "Failed", "Input tokens", "Output tokens", "Searches", "Estimated cost"]} caption="Usage this month by provider and model">
              {summary.map((r) => (
                <tr key={`${r.provider}/${r.model}`}>
                  <Td>{labelOf(r.provider)}</Td>
                  <Td className="font-mono text-xs">{r.model || "Not recorded"}</Td>
                  <Td muted>{r.requests}</Td>
                  <Td className={r.failed ? "text-danger" : "text-slate-500"}>{r.failed}</Td>
                  <Td muted>{r.inputTokens.toLocaleString("en-GB")}</Td>
                  <Td muted>{r.outputTokens.toLocaleString("en-GB")}</Td>
                  <Td muted>{r.searchCalls}</Td>
                  <Td>{usd(r.costUsd)}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No usage recorded this month" body="Run a provider test to see a request appear here with its cost." />
          )}
        </Card>

        <Card title="Recent requests" description="The latest 15 requests, newest first." className="lg:col-span-2">
          {recent.length ? (
            <Table head={["When", "Provider", "Model", "Used for", "Tokens in and out", "Searches", "Cost", "Result"]} caption="Recent AI requests">
              {recent.map((r) => (
                <tr key={r.id}>
                  <Td muted>{formatDateTime(r.createdAt)}</Td>
                  <Td>{labelOf(r.provider)}</Td>
                  <Td className="font-mono text-xs">{r.model ?? "Not recorded"}</Td>
                  <Td muted>{r.feature.replace(/_/g, " ")}</Td>
                  <Td muted>
                    {r.inputTokens.toLocaleString("en-GB")} and {r.outputTokens.toLocaleString("en-GB")}
                  </Td>
                  <Td muted>{r.searchCalls}</Td>
                  <Td>{usd(r.costUsd)}</Td>
                  <Td>
                    {r.ok ? <Badge tone="success">OK</Badge> : <Badge tone="danger">{(r.errorKind ?? "failed").replace(/_/g, " ")}</Badge>}
                    {!r.ok && r.errorMessage && <p className="mt-1 max-w-[28ch] text-xs text-slate-500">{r.errorMessage}</p>}
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No requests yet" />
          )}
        </Card>
      </div>
    </>
  );
}
