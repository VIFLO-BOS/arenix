import { requirePermission, userCan } from "@/server/auth/session";
import { listProspects } from "@/server/research/service";
import { AI_PROVIDERS, DATA_SOURCES } from "@/types/research";
import { PageHeader, Card, EmptyState, Pager } from "@/components/admin/ui";
import { ResearchNav } from "@/components/admin/research/research-nav";
import { ProspectTable } from "@/components/admin/research/prospect-table";
import { ProspectFilters, filterFrom, filterQuery, type FilterParams } from "@/components/admin/research/filters";

export const maxDuration = 300;

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<FilterParams> }) {
  const user = await requirePermission("leads:read");
  const sp = await searchParams;
  const list = await listProspects(filterFrom(sp));

  return (
    <>
      <PageHeader eyebrow="Find leads" title="All businesses" description="Every business found by any search, merged into one row each. Businesses not added to Leads are deleted after the retention period set in Lead research settings." />
      <ResearchNav current="/admin/leads/prospects" showSettings={userCan(user, "settings:write")} />
      <Card title={`Businesses (${list.total})`}>
        <ProspectFilters sp={sp} sources={[...AI_PROVIDERS, ...DATA_SOURCES]} />
        {list.rows.length ? (
          <ProspectTable rows={list.rows} userId={user.id} canWrite={userCan(user, "leads:write")} canRun={userCan(user, "prospecting:run")} exportBase={`/api/research/export?${filterQuery(sp)}`} />
        ) : (
          <EmptyState title="No businesses yet" body="Run a search under Searches. The businesses it finds are listed here." />
        )}
        <Pager page={list.page} pages={list.pages} href={(p) => `/admin/leads/prospects?${filterQuery(sp, { page: String(p) })}`} />
      </Card>
    </>
  );
}
