import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getSearch, listProspects } from "@/server/research/service";
import { SOURCE_LABEL, DATA_SOURCES, AI_PROVIDERS } from "@/types/research";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Notice, Pager, KeyValue, btnSecondary } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-form";
import { FoundBy, SourceBadge } from "@/components/admin/research/labels";
import { ResearchNav } from "@/components/admin/research/research-nav";
import { ResearchPoller } from "@/components/admin/research/research-poller";
import { ProspectTable } from "@/components/admin/research/prospect-table";
import { ProspectFilters, filterFrom, filterQuery, type FilterParams } from "@/components/admin/research/filters";
import { cancelSearchAction } from "../../research-actions";

export const maxDuration = 300;

const usd = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

export default async function SearchPage({ params, searchParams }: { params: Promise<{ searchId: string }>; searchParams: Promise<FilterParams & { reused?: string }> }) {
  const user = await requirePermission("leads:read");
  const { searchId } = await params;
  const sp = await searchParams;
  const data = await getSearch(searchId);
  if (!data) notFound();
  const { search, sources, open } = data;
  const list = await listProspects(filterFrom(sp, searchId));
  const filters = search.filters as { industry?: string; keywords?: string[]; city?: string; region?: string; country?: string; websiteFilter?: string; maxResults?: number; autoResearch?: boolean };
  const active = open > 0 && search.status !== "CANCELLED";
  const by = search.createdBy as unknown as { name?: string } | null;
  const base = `/admin/leads/discover/${searchId}`;

  return (
    <>
      <PageHeader
        eyebrow="Find leads"
        title={search.query}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={search.status} />
            <FoundBy sources={search.providers} />
          </span>
        }
        actions={
          <>
            {active && userCan(user, "prospecting:run") && (
              <ActionButton action={cancelSearchAction} fields={{ id: searchId }} confirm="Cancel this search? Work already done is kept." variant="danger">
                Cancel search
              </ActionButton>
            )}
            <Link href="/admin/leads/discover" className={btnSecondary}>
              New search
            </Link>
          </>
        }
      />
      <ResearchNav current="/admin/leads/discover" showSettings={userCan(user, "settings:write")} />
      {sp.reused && (
        <div className="mb-4">
          <Notice tone="info">The same search ran in the last 24 hours, so its results are shown instead of paying again. Tick the option to run again on the search form for fresh results.</Notice>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="Search">
          <KeyValue
            items={[
              ["Industry", filters.industry],
              ["Keywords", filters.keywords?.join(", ")],
              ["Location", [filters.city, filters.region, filters.country].filter(Boolean).join(", ")],
              ["Website", filters.websiteFilter === "none" ? "Prefer no website" : filters.websiteFilter === "has" ? "Has a website" : "Any"],
              ["Per source", filters.maxResults ? `Up to ${filters.maxResults}` : undefined],
              ["Started", `${formatDateTime(search.createdAt)}${by?.name ? ` by ${by.name}` : ""}`],
              ["Estimated cost", usd(search.estimatedCostUsd)],
              ["Cost so far", usd(search.actualCostUsd)],
              ["Tasks", `${search.progress.done} done, ${search.progress.failed} failed, ${Math.max(0, search.progress.total - search.progress.done - search.progress.failed)} waiting`],
            ]}
          />
          <div className="mt-3">
            <ResearchPoller active={active} searchId={searchId} />
          </div>
        </Card>
        <Card title="Results by source" description="Each AI and source searched on its own. Businesses found by more than one are merged into one row.">
          <Table head={["Source", "Status", "Found", "New", "Merged", "Notes"]} caption="Results by source" className="text-xs">
            {sources.map((s) => (
              <tr key={s.source}>
                <Td>
                  <SourceBadge source={s.source} />
                </Td>
                <Td>
                  <StatusBadge status={s.status} />
                </Td>
                <Td muted>{s.found}</Td>
                <Td muted>{s.created}</Td>
                <Td muted>{s.merged}</Td>
                <Td muted className="max-w-[18rem] text-xs">
                  {s.error ?? (s.notes || "None")}
                </Td>
              </tr>
            ))}
          </Table>
          {search.providers.includes("openstreetmap") && <p className="mt-2 text-[0.7rem] text-slate-500">Map data from OpenStreetMap, available under the Open Database License. {"©"} OpenStreetMap contributors.</p>}
        </Card>
      </div>

      <Card title={`Businesses (${list.total})`} description="One row per business. The Found by column shows every AI and source that found it.">
        <ProspectFilters sp={sp} sources={[...AI_PROVIDERS, ...DATA_SOURCES.filter((d) => d !== "manual")].filter((s) => SOURCE_LABEL[s])} />
        {list.rows.length ? (
          <ProspectTable rows={list.rows} userId={user.id} canWrite={userCan(user, "leads:write")} canRun={userCan(user, "prospecting:run")} exportBase={`/api/research/export?${filterQuery(sp, { searchId })}`} />
        ) : (
          <EmptyState title={active ? "Searching" : "No businesses match"} body={active ? "Results appear here as each source finishes." : "Try different filters, or a broader search."} />
        )}
        <Pager page={list.page} pages={list.pages} href={(p) => `${base}?${filterQuery(sp, { page: String(p) })}`} />
      </Card>
    </>
  );
}
