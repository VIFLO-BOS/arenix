import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { githubConfig } from "@/config/github";
import type { GithubLanguageShare, GithubPush, GithubRepoLabel, GithubSnapshot } from "@/types/github";

/**
 * Live GitHub activity for the homepage.
 *
 * Two cache tiers keep the API budget small and the page fast. The core tier is one GraphQL
 * request (repositories, commit counts, contribution calendar, last push) refreshed every
 * couple of minutes. The stats tier needs one REST request per repository (line counts and
 * traffic) and refreshes every half hour. Both are stored in the Next data cache, so a stale
 * entry is served instantly while a fresh one is fetched in the background.
 */

const API = "https://api.github.com";

/**
 * Language colours follow the language, never its rank. The first five were validated as a
 * categorical set on the dark card surface (#0f1b31) in their current order. Anything outside
 * this map folds into Other.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3987e5",
  HTML: "#d95926",
  JavaScript: "#199e70",
  CSS: "#9085e9",
  Rust: "#c98500",
  Python: "#d55181",
  Shell: "#008300",
  PLpgSQL: "#e66767",
};
const OTHER_COLOR = "#5b6478";
const MAX_LANGUAGES = 5;
const RECENT_PUSHES = 6;

function token() {
  return process.env.GITHUB_TOKEN?.trim() ?? "";
}

export function isGithubConfigured() {
  return token().length > 0;
}

function request(url: string, init: RequestInit = {}) {
  return fetch(url.startsWith("http") ? url : `${API}${url}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "arenix-site",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
}

/* ------------------------------------------------------------------ core tier (GraphQL) */

type CoreRepo = {
  name: string;
  url: string;
  isPrivate: boolean;
  pushedAt: string | null;
  stars: number;
  forks: number;
  watchers: number;
  language: string | null;
  languages: { name: string; size: number }[];
  commits: number;
  headline: string | null;
};

type Core = {
  profileUrl: string;
  fetchedAt: string;
  contributionsYear: number;
  calendar: { firstDay: string; weeks: number[][] };
  repos: CoreRepo[];
};

type GqlRepo = {
  name: string;
  url: string;
  isPrivate: boolean;
  isFork: boolean;
  pushedAt: string | null;
  stargazerCount: number;
  forkCount: number;
  watchers: { totalCount: number };
  primaryLanguage: { name: string } | null;
  languages: { edges: { size: number; node: { name: string } }[] } | null;
  defaultBranchRef: { target: { history?: { totalCount: number }; messageHeadline?: string } | null } | null;
};

type GqlResponse = {
  data?: {
    user: {
      url: string;
      contributionsCollection?: {
        contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number }[] }[] };
      };
      repositories: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: GqlRepo[] };
    } | null;
  };
  errors?: { message: string }[];
};

const CORE_QUERY = `
query Activity($login: String!, $after: String, $withCalendar: Boolean!) {
  user(login: $login) {
    url
    contributionsCollection @include(if: $withCalendar) {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    repositories(first: 100, after: $after, ownerAffiliations: OWNER, orderBy: { field: PUSHED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name url isPrivate isFork pushedAt stargazerCount forkCount
        watchers { totalCount }
        primaryLanguage { name }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }
        defaultBranchRef { target { ... on Commit { history { totalCount } messageHeadline } } }
      }
    }
  }
}`;

async function readCore(login: string): Promise<Core> {
  const repos: CoreRepo[] = [];
  let after: string | null = null;
  let profileUrl = `https://github.com/${login}`;
  let contributionsYear = 0;
  let calendar: Core["calendar"] = { firstDay: "", weeks: [] };

  for (let page = 0; page < 5; page++) {
    const res = await request("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: CORE_QUERY, variables: { login, after, withCalendar: page === 0 } }),
    });
    if (!res.ok) throw new Error(`GitHub GraphQL responded ${res.status}`);
    const body = (await res.json()) as GqlResponse;
    if (body.errors?.length) throw new Error(`GitHub GraphQL error ${body.errors[0]?.message ?? "unknown"}`);
    const user = body.data?.user;
    if (!user) throw new Error(`GitHub user ${login} not found`);

    profileUrl = user.url;
    if (user.contributionsCollection) {
      const cal = user.contributionsCollection.contributionCalendar;
      contributionsYear = cal.totalContributions;
      calendar = {
        firstDay: cal.weeks[0]?.contributionDays[0]?.date ?? "",
        weeks: cal.weeks.map((w) => w.contributionDays.map((d) => d.contributionCount)),
      };
    }

    for (const r of user.repositories.nodes) {
      // Forks carry other people's history, so they never count toward our numbers.
      if (r.isFork) continue;
      repos.push({
        name: r.name,
        url: r.url,
        isPrivate: r.isPrivate,
        pushedAt: r.pushedAt,
        stars: r.stargazerCount,
        forks: r.forkCount,
        watchers: r.watchers.totalCount,
        language: r.primaryLanguage?.name ?? null,
        languages: (r.languages?.edges ?? []).map((e) => ({ name: e.node.name, size: e.size })),
        commits: r.defaultBranchRef?.target?.history?.totalCount ?? 0,
        headline: r.defaultBranchRef?.target?.messageHeadline ?? null,
      });
    }

    const { hasNextPage, endCursor } = user.repositories.pageInfo;
    if (!hasNextPage) break;
    after = endCursor;
  }

  return { profileUrl, fetchedAt: new Date().toISOString(), contributionsYear, calendar, repos };
}

const getCore = unstable_cache(readCore, ["github-core-v1"], {
  revalidate: githubConfig.coreRevalidateSeconds,
  tags: ["github"],
});

/* -------------------------------------------------------------- stats tier (REST per repo) */

type Stats = {
  fetchedAt: string;
  linesAdded: number;
  linesDeleted: number;
  views: number | null;
  clones: number | null;
  pending: number;
};

type ContributorStats = { author: { login: string } | null; weeks: { a: number; d: number }[] }[];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i] as T);
      }
    }),
  );
  return out;
}

/** Lines added and removed by the account in one repository, or "pending" while GitHub computes. */
async function readLines(login: string, repo: string): Promise<{ added: number; deleted: number } | "pending"> {
  const res = await request(`/repos/${login}/${encodeURIComponent(repo)}/stats/contributors`);
  if (res.status === 202) return "pending";
  if (res.status === 204 || res.status === 404 || res.status === 409) return { added: 0, deleted: 0 };
  if (!res.ok) throw new Error(`stats ${repo} responded ${res.status}`);
  const body = (await res.json()) as ContributorStats;
  let added = 0;
  let deleted = 0;
  for (const c of Array.isArray(body) ? body : []) {
    if (c.author?.login.toLowerCase() !== login.toLowerCase()) continue;
    for (const w of c.weeks) {
      added += w.a;
      deleted += w.d;
    }
  }
  return { added, deleted };
}

/** Traffic needs Administration read access. Returns null when the token cannot see it. */
async function readTraffic(login: string, repo: string, kind: "views" | "clones"): Promise<number | null> {
  const res = await request(`/repos/${login}/${encodeURIComponent(repo)}/traffic/${kind}`);
  if (!res.ok) return null;
  const body = (await res.json()) as { count?: number };
  return typeof body.count === "number" ? body.count : null;
}

async function readStats(login: string, repoNames: string[]): Promise<Stats> {
  let added = 0;
  let deleted = 0;
  let waiting = repoNames;

  // GitHub computes contributor stats lazily and answers 202 until they are ready.
  for (let attempt = 0; attempt < 3 && waiting.length; attempt++) {
    if (attempt > 0) await sleep(2000);
    const results = await mapLimit(waiting, 10, (name) => readLines(login, name).catch(() => ({ added: 0, deleted: 0 })));
    const stillWaiting: string[] = [];
    const asked = waiting;
    results.forEach((r, i) => {
      if (r === "pending") stillWaiting.push(asked[i] as string);
      else {
        added += r.added;
        deleted += r.deleted;
      }
    });
    waiting = stillWaiting;
  }

  const traffic = await mapLimit(repoNames, 10, async (name) => {
    const [views, clones] = await Promise.all([
      readTraffic(login, name, "views").catch(() => null),
      readTraffic(login, name, "clones").catch(() => null),
    ]);
    return { views, clones };
  });
  const sum = (values: (number | null)[]) => (values.some((v) => v !== null) ? values.reduce<number>((t, v) => t + (v ?? 0), 0) : null);

  return {
    fetchedAt: new Date().toISOString(),
    linesAdded: added,
    linesDeleted: deleted,
    views: sum(traffic.map((t) => t.views)),
    clones: sum(traffic.map((t) => t.clones)),
    pending: waiting.length,
  };
}

const getStats = unstable_cache(readStats, ["github-stats-v1"], {
  revalidate: githubConfig.statsRevalidateSeconds,
  tags: ["github"],
});

/* ----------------------------------------------------------------- masking and assembly */

const mapped = new Map(Object.entries(githubConfig.repositories).map(([name, entry]) => [name.toLowerCase(), entry]));

function labelFor(repo: CoreRepo): GithubRepoLabel {
  const entry = mapped.get(repo.name.toLowerCase());
  if (entry) {
    if (entry.project) return { name: entry.label, href: `/work/${entry.project}`, isPrivate: repo.isPrivate, masked: false };
    return { name: entry.label, href: repo.isPrivate ? undefined : repo.url, external: !repo.isPrivate, isPrivate: repo.isPrivate, masked: false };
  }
  if (!repo.isPrivate) return { name: repo.name, href: repo.url, external: true, isPrivate: false, masked: false };
  return { name: "Private repository", isPrivate: true, masked: true };
}

function toPush(repo: CoreRepo): GithubPush {
  return {
    at: repo.pushedAt ?? "",
    repo: labelFor(repo),
    language: repo.language ? { name: repo.language, color: LANGUAGE_COLORS[repo.language] ?? OTHER_COLOR } : null,
    commits: repo.commits,
    // Commit subjects of private repositories are never published.
    headline: repo.isPrivate ? null : repo.headline,
  };
}

function languageShares(repos: CoreRepo[]): GithubLanguageShare[] {
  const bytes = new Map<string, number>();
  for (const r of repos) for (const l of r.languages) bytes.set(l.name, (bytes.get(l.name) ?? 0) + l.size);
  const total = [...bytes.values()].reduce((t, v) => t + v, 0);
  if (!total) return [];
  const ranked = [...bytes.entries()].sort((a, b) => b[1] - a[1]);
  const named = ranked.filter(([name]) => LANGUAGE_COLORS[name]).slice(0, MAX_LANGUAGES);
  const namedSet = new Set(named.map(([name]) => name));
  const other = ranked.filter(([name]) => !namedSet.has(name)).reduce((t, [, v]) => t + v, 0);
  const shares = named.map(([name, size]) => ({ name, bytes: size, share: size / total, color: LANGUAGE_COLORS[name] ?? OTHER_COLOR }));
  if (other > 0) shares.push({ name: "Other", bytes: other, share: other / total, color: OTHER_COLOR });
  return shares;
}

function assemble(login: string, core: Core, stats: Stats | null): GithubSnapshot {
  const repos = core.repos;
  const pushed = repos.filter((r) => r.pushedAt).sort((a, b) => Date.parse(b.pushedAt!) - Date.parse(a.pushedAt!));
  const recent = pushed.slice(0, RECENT_PUSHES).map(toPush);
  const sum = (pick: (r: CoreRepo) => number) => repos.reduce((t, r) => t + pick(r), 0);
  const publicCount = repos.filter((r) => !r.isPrivate).length;

  return {
    username: login,
    profileUrl: core.profileUrl,
    fetchedAt: core.fetchedAt,
    statsFetchedAt: stats?.fetchedAt ?? null,
    totals: {
      repositories: repos.length,
      publicRepositories: publicCount,
      privateRepositories: repos.length - publicCount,
      commits: sum((r) => r.commits),
      contributionsYear: core.contributionsYear,
      stars: sum((r) => r.stars),
      forks: sum((r) => r.forks),
      watchers: sum((r) => r.watchers),
      linesAdded: stats ? stats.linesAdded : null,
      linesDeleted: stats ? stats.linesDeleted : null,
      views: stats?.views ?? null,
      clones: stats?.clones ?? null,
      pendingRepositories: stats?.pending ?? 0,
    },
    lastPush: recent[0] ?? null,
    recent,
    calendar: core.calendar,
    languages: languageShares(repos),
  };
}

/**
 * The public snapshot, or null when GitHub is not configured or cannot be reached. Line counts
 * and traffic degrade on their own: if that tier fails the core numbers still render.
 */
export const getGithubSnapshot = cache(async (): Promise<GithubSnapshot | null> => {
  if (!isGithubConfigured()) return null;
  const login = githubConfig.username;
  try {
    const core = await getCore(login);
    let stats: Stats | null = null;
    try {
      stats = await getStats(login, core.repos.map((r) => r.name).sort());
    } catch (err) {
      console.warn("[github] repository stats unavailable:", err instanceof Error ? err.message : err);
    }
    return assemble(login, core, stats);
  } catch (err) {
    console.warn("[github] activity unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
});
