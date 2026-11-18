import "server-only";
import { Types } from "mongoose";
import { env, integrations } from "@/lib/env";
import { AiError } from "@/server/ai";
import { getResearchSettings } from "@/server/ai/settings";
import { recordUsage } from "@/server/ai/usage";
import { connectDb } from "@/server/db/connect";
import { ApiUsage, OutreachDraft, Prospect, ProspectSearch, ResearchTask, type ProspectContact, type ProspectDoc, type ResearchState, type ResearchTaskDoc } from "@/server/db/models/research";
import { AI_PROVIDERS, type AiProviderId } from "@/types/research";
import { analyseProspect } from "./ai-research";
import { discoverWithAi } from "./ai-discovery";
import { crawlSite } from "./crawl";
import { extractPage } from "./extract";
import { normaliseEmail, normalisePhone, textMentionsBusiness } from "./normalise";
import { PermanentTaskError, enqueueTask, runWorker, taskCounts, type TaskHandler } from "./queue";
import { ROBOTS_TOKEN, isAllowed, rulesForStatus, type RobotsRules } from "./robots";
import { FetchFailure, decodeHtml, safeFetch } from "./safe-fetch";
import { bestCompaniesHouseMatch, discoverCompaniesHouse, searchCompaniesHouse } from "./sources/companies-house";
import { SourceError } from "./sources/errors";
import { searchGooglePlaces } from "./sources/google-places";
import { searchOpenStreetMap } from "./sources/openstreetmap";
import { runPageSpeed } from "./sources/pagespeed";
import { isEmailSuppressed, isPhoneSuppressed, rescore, suppressedSet, upsertCandidates, websiteDecision } from "./store";
import { countryIso } from "./normalise";
import type { DiscoveryCandidate, DiscoveryQuery, SiteCheck } from "./types";

/**
 * The research pipeline. A search becomes one discover task per source. Each discovered
 * business then gets small follow up tasks: verify (fetch the AI's source pages), crawl (read
 * its website), audit (PageSpeed), enrich (Companies House) and, when asked, analyse (AI
 * summary and score). The tasks run in the background through the queue in queue.ts.
 */

export const USER_AGENT = `Mozilla/5.0 (compatible; ${ROBOTS_TOKEN}/1.0; +${env.siteUrl}/research-bot)`;

export const DIRECTORY_SOURCES = ["google_places", "openstreetmap", "companies_house"] as const;

/** Public Overpass API servers, tried in order. https://wiki.openstreetmap.org/wiki/Overpass_API */
const OVERPASS_SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const isAi = (s: string): s is AiProviderId => (AI_PROVIDERS as readonly string[]).includes(s);

const DAY_MS = 24 * 60 * 60_000;
const startOfUtcDay = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const startOfUtcMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

export interface StoredFilters extends DiscoveryQuery {
  autoResearch: boolean;
}

/* -------------------------------- Helpers -------------------------------- */

async function setResearch(prospectId: string | Types.ObjectId, state: ResearchState, step?: string, error?: string) {
  await Prospect.updateOne({ _id: prospectId }, { $set: { research: { state, step, error: error?.slice(0, 300), updatedAt: new Date() } } });
}

async function unitsSince(provider: string, since: Date): Promise<number> {
  const [row] = await ApiUsage.aggregate<{ n: number }>([{ $match: { provider, createdAt: { $gte: since } } }, { $group: { _id: null, n: { $sum: { $ifNull: ["$units", 0] } } } }]);
  return row?.n ?? 0;
}

const oidStr = (v: unknown) => (v instanceof Types.ObjectId ? v.toString() : typeof v === "string" ? v : undefined);

/** Errors from a source that retrying cannot fix become permanent, so the queue stops at once. */
function rethrow(err: unknown): never {
  if (err instanceof AiError) {
    if (["budget", "disabled", "not_configured", "no_price", "auth", "quota", "refused", "bad_request"].includes(err.kind)) throw new PermanentTaskError(err.message);
    throw err;
  }
  if (err instanceof SourceError) {
    if (["auth", "quota", "bad_request", "not_found"].includes(err.kind)) throw new PermanentTaskError(err.message);
    throw err;
  }
  throw err;
}

/** Queues the research steps for one business. Free steps only, unless analyse is asked for. */
export async function queueResearch(prospectId: string, opts: { searchId?: string; userId?: string; analyse?: boolean; force?: boolean }): Promise<boolean> {
  await connectDb();
  const p = await Prospect.findById(prospectId).select("website location registration optedOutAt").lean();
  if (!p || p.optedOutAt) return false;
  const base = { prospectId, searchId: opts.searchId, createdBy: opts.userId };
  let queued = false;
  const freshCrawl = p.website.crawledAt && Date.now() - new Date(p.website.crawledAt).getTime() < 30 * DAY_MS;
  if (p.website.url && (!freshCrawl || opts.force)) {
    const r = await enqueueTask({ ...base, type: "crawl", payload: { analyse: !!opts.analyse }, dedupeKey: `crawl:${prospectId}` });
    queued ||= r.created;
  } else if (opts.analyse) {
    const r = await enqueueTask({ ...base, type: "analyse", dedupeKey: `analyse:${prospectId}` });
    queued ||= r.created;
  }
  if (integrations.research.companiesHouse.configured && countryIso(p.location?.country) === "GB" && p.registration?.status === "NOT_CHECKED") {
    const r = await enqueueTask({ ...base, type: "enrich", dedupeKey: `enrich:${prospectId}` });
    queued ||= r.created;
  }
  if (queued) await setResearch(prospectId, "QUEUED", "Waiting to start");
  return queued;
}

/** Website status and base score from what is stored, without any network request. */
export async function refreshFromStored(prospectId: string): Promise<void> {
  const p = await Prospect.findById(prospectId).select("website").lean();
  if (!p) return;
  if (!p.website.url) {
    const d = websiteDecision(p);
    await Prospect.updateOne({ _id: prospectId }, { $set: { "website.status": d.status, "website.evidence": d.evidence, "website.checkedAt": new Date() } });
  }
  await rescore(prospectId);
}

/* -------------------------------- Discovery ------------------------------- */

async function runSource(source: string, query: DiscoveryQuery, ctx: { searchId: string; userId?: string }): Promise<{ candidates: DiscoveryCandidate[]; notes: string }> {
  if (isAi(source)) {
    const r = await discoverWithAi(source, query, ctx);
    return { candidates: r.candidates, notes: r.notes };
  }
  if (source === "openstreetmap") {
    // Public Overpass servers are run by volunteers and are sometimes busy or refuse a
    // network, so the next one is tried before giving up. OVERPASS_URL can name a preferred one.
    const servers = [...new Set([env.overpassUrl, ...OVERPASS_SERVERS].filter(Boolean))];
    let lastErr: unknown;
    for (const overpassUrl of servers) {
      const started = Date.now();
      try {
        const candidates = await searchOpenStreetMap(query, { userAgent: USER_AGENT, overpassUrl });
        await recordUsage({ provider: "openstreetmap", feature: "discovery", units: 2, ok: true, durationMs: Date.now() - started, searchId: ctx.searchId, userId: ctx.userId });
        return { candidates, notes: candidates.length ? "" : "OpenStreetMap has no matching businesses mapped in this area." };
      } catch (err) {
        lastErr = err;
        await recordUsage({ provider: "openstreetmap", feature: "discovery", units: 2, ok: false, errorKind: err instanceof SourceError ? err.kind : "provider_error", errorMessage: `${new URL(overpassUrl).host}. ${err instanceof Error ? err.message : ""}`, durationMs: Date.now() - started, searchId: ctx.searchId });
        // A place Nominatim cannot find will not be found on another Overpass server either.
        if (err instanceof SourceError && err.kind === "not_found") break;
      }
    }
    throw lastErr;
  }
  if (source === "google_places") {
    if (!env.googlePlacesApiKey) throw new PermanentTaskError("Google Places has no API key configured.");
    const settings = await getResearchSettings();
    const used = await unitsSince("google_places", startOfUtcMonth());
    const pages = Math.min(3, Math.ceil(query.maxResults / 20));
    if (used + pages > settings.placesMonthlyLimit) throw new PermanentTaskError(`The Google Places limit of ${settings.placesMonthlyLimit} requests this month is reached.`);
    const started = Date.now();
    try {
      const r = await searchGooglePlaces(query, { apiKey: env.googlePlacesApiKey, maxPages: pages });
      await recordUsage({ provider: "google_places", feature: "discovery", units: r.requests, ok: true, durationMs: Date.now() - started, searchId: ctx.searchId, userId: ctx.userId });
      return { candidates: r.candidates, notes: "" };
    } catch (err) {
      await recordUsage({ provider: "google_places", feature: "discovery", units: 1, ok: false, errorKind: err instanceof SourceError ? err.kind : "provider_error", errorMessage: err instanceof Error ? err.message : undefined, searchId: ctx.searchId });
      throw err;
    }
  }
  if (source === "companies_house") {
    if (!env.companiesHouseApiKey) throw new PermanentTaskError("Companies House has no API key configured.");
    const candidates = await discoverCompaniesHouse(query, { apiKey: env.companiesHouseApiKey });
    await recordUsage({ provider: "companies_house", feature: "discovery", units: 1, ok: true, searchId: ctx.searchId, userId: ctx.userId });
    return { candidates, notes: countryIso(query.country) === "GB" ? "" : "Companies House only covers the United Kingdom." };
  }
  throw new PermanentTaskError(`Unknown source ${source}.`);
}

const discover: TaskHandler = async ({ task }) => {
  const searchId = oidStr(task.searchId);
  const source = String(task.payload?.source ?? "");
  if (!searchId) throw new PermanentTaskError("The task has no search.");
  const search = await ProspectSearch.findById(searchId).lean();
  if (!search) throw new PermanentTaskError("The search no longer exists.");
  if (search.cancelRequested) return { skip: "The search was cancelled." };
  await ProspectSearch.updateOne({ _id: search._id, status: "QUEUED" }, { $set: { status: "RUNNING" } });
  // Google Maps only confirms businesses other sources found, so it waits for them (at most 15 minutes).
  if (source === "google_places" && Date.now() - new Date(task.createdAt).getTime() < 15 * 60_000) {
    const others = await ResearchTask.exists({ searchId: search._id, type: "discover", status: { $in: ["PENDING", "RUNNING"] }, _id: { $ne: task._id } });
    if (others) return { defer: { until: new Date(Date.now() + 20_000), reason: "Waiting for the other sources to finish." } };
  }

  const filters = search.filters as unknown as StoredFilters;
  let found: { candidates: DiscoveryCandidate[]; notes: string };
  try {
    found = await runSource(source, filters, { searchId, userId: oidStr(search.createdBy) });
  } catch (err) {
    rethrow(err);
  }
  const report = await upsertCandidates(searchId, found.candidates, filters.country);

  for (const pid of report.prospectIds) {
    if (isAi(source)) await enqueueTask({ type: "verify", prospectId: pid, searchId, payload: { source }, dedupeKey: `verify:${pid}:${source}` });
    await refreshFromStored(pid);
    if (filters.autoResearch) await queueResearch(pid, { searchId });
  }
  const notes = [found.notes, report.notKept ? `${report.notKept} Google Maps results matched no business from another source and were not kept, because Google's terms do not allow saving its business details.` : "", report.skippedOptOut ? `${report.skippedOptOut} skipped because they opted out.` : ""].filter(Boolean).join(" ");
  return { result: { source, found: found.candidates.length, created: report.created, merged: report.merged, skippedOptOut: report.skippedOptOut, notes } };
};

/* ------------------------------ Verification ------------------------------ */

const robotsCache = new Map<string, { rules: RobotsRules; at: number }>();

async function robotsFor(origin: string): Promise<RobotsRules> {
  const hit = robotsCache.get(origin);
  if (hit && Date.now() - hit.at < 60 * 60_000) return hit.rules;
  let rules: RobotsRules;
  try {
    const res = await safeFetch(`${origin}/robots.txt`, { userAgent: USER_AGENT, timeoutMs: 8000, maxBytes: 512 * 1024, accept: "text/plain,*/*;q=0.5" });
    rules = rulesForStatus(res.status, res.status >= 200 && res.status < 300 ? res.body.toString("utf8") : "");
  } catch {
    rules = rulesForStatus(0, "");
  }
  robotsCache.set(origin, { rules, at: Date.now() });
  if (robotsCache.size > 500) robotsCache.delete(robotsCache.keys().next().value as string);
  return rules;
}

/** Fetches a source page politely and says whether it mentions the business. */
async function pageMentions(url: string, name: string, places: (string | undefined)[]): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const rules = await robotsFor(u.origin);
  if (!isAllowed(rules, u.pathname + u.search)) return false;
  try {
    const res = await safeFetch(url, { userAgent: USER_AGENT, timeoutMs: 10_000, maxBytes: 1536 * 1024 });
    if (res.status < 200 || res.status >= 300) return false;
    const page = extractPage(decodeHtml(res.body, res.headers["content-type"]), res.url, { maxTextChars: 200_000 });
    return textMentionsBusiness(`${page.title ?? ""} ${page.text}`, name, places);
  } catch (err) {
    if (err instanceof FetchFailure) return false;
    throw err;
  }
}

const verify: TaskHandler = async ({ task }) => {
  const source = String(task.payload?.source ?? "");
  const doc = await Prospect.findById(task.prospectId);
  if (!doc) return { skip: "The business no longer exists." };
  const entries = doc.foundBy.filter((f) => f.provider === source && !f.checkedAt);
  if (!entries.length) return { skip: "Already checked." };
  const urls = [...new Set(entries.flatMap((e) => e.sourceUrls))].slice(0, 3);
  const confirmed: string[] = [];
  for (const url of urls) if (await pageMentions(url, doc.name, [doc.location?.city, doc.location?.region, doc.location?.country])) confirmed.push(url);
  await recordUsage({ provider: "crawler", feature: "verify", units: urls.length, ok: true, searchId: oidStr(task.searchId), prospectId: doc._id.toString() });
  const now = new Date();
  for (const e of entries) {
    e.checkedAt = now;
    e.confirmedUrls = e.sourceUrls.filter((u) => confirmed.includes(u));
  }
  if (confirmed.length) doc.verification = "VERIFIED";
  await doc.save();
  return { result: { checked: urls.length, confirmed: confirmed.length } };
};

/* --------------------------------- Crawling -------------------------------- */

function mergeContacts(doc: ProspectDoc, found: { kind: ProspectContact["kind"]; value: string; sourceUrl: string }[], blocked: Set<string>) {
  const now = new Date();
  for (const f of found) {
    if (f.kind === "EMAIL" ? isEmailSuppressed(blocked, f.value) : isPhoneSuppressed(blocked, f.value)) continue;
    const existing = doc.contacts.find((c) => c.value === f.value && c.kind === f.kind);
    if (existing) {
      // Seen on the business's own site, so it is now verified.
      existing.verification = "VERIFIED";
      existing.sourceUrl = f.sourceUrl;
      existing.seenAt = now;
    } else if (doc.contacts.length < 25) {
      doc.contacts.push({ kind: f.kind, value: f.value, verification: "VERIFIED", sourceUrl: f.sourceUrl, seenAt: now });
    }
  }
}

const crawl: TaskHandler = async ({ task }) => {
  const settings = await getResearchSettings();
  const doc = await Prospect.findById(task.prospectId);
  if (!doc) return { skip: "The business no longer exists." };
  if (!doc.website.url) return { skip: "No website address is known." };
  if (doc.optedOutAt) return { skip: "The business opted out." };
  const blocked = await suppressedSet({ domain: doc.domain });
  if (blocked.size) return { skip: "The domain is on the opt out list." };

  const today = await unitsSince("crawler", startOfUtcDay());
  if (today + settings.crawl.pagesPerSite > settings.crawl.pagesPerDay) {
    const until = new Date(startOfUtcDay().getTime() + DAY_MS + 5 * 60_000);
    await setResearch(doc._id, "QUEUED", "Waiting for tomorrow's crawl allowance");
    return { defer: { until, reason: `The daily limit of ${settings.crawl.pagesPerDay} pages is reached.` } };
  }

  await setResearch(doc._id, "RUNNING", "Reading the website");
  const started = Date.now();
  const result = await crawlSite(doc.website.url, { settings: settings.crawl, userAgent: USER_AGENT, businessName: doc.name, places: [doc.location?.city, doc.location?.region, doc.location?.country], deadline: Date.now() + 60_000 });
  await recordUsage({ provider: "crawler", feature: "crawl", units: result.requests, ok: result.check.ok, errorKind: result.check.failure, durationMs: Date.now() - started, searchId: oidStr(task.searchId), prospectId: doc._id.toString() });

  const country = doc.location?.country;
  const contacts: { kind: ProspectContact["kind"]; value: string; sourceUrl: string }[] = [];
  for (const page of result.pages) {
    const x = page.extract;
    if (!x) continue;
    for (const e of x.emails) {
      const v = normaliseEmail(e);
      if (v) contacts.push({ kind: "EMAIL", value: v, sourceUrl: page.url });
    }
    for (const p of x.phones) {
      const v = normalisePhone(p, country ?? x.address?.country);
      if (v) contacts.push({ kind: "PHONE", value: v, sourceUrl: page.url });
    }
    for (const w of x.whatsapp) {
      const v = normalisePhone(w, country);
      if (v) contacts.push({ kind: "WHATSAPP", value: v, sourceUrl: page.url });
    }
    for (const person of x.people) {
      if (doc.people.length >= 20) break;
      const known = doc.people.find((p) => p.name.toLowerCase() === person.name.toLowerCase());
      if (known) {
        known.title ??= person.title;
        known.linkedinUrl ??= person.linkedinUrl;
        known.verification = "VERIFIED";
        known.sourceUrl = page.url;
        known.seenAt = new Date();
      } else doc.people.push({ name: person.name, title: person.title, linkedinUrl: person.linkedinUrl, sourceUrl: page.url, verification: "VERIFIED", seenAt: new Date() });
    }
    for (const s of x.socials) if (!doc.socials.some((o) => o.url.toLowerCase() === s.url.toLowerCase()) && doc.socials.length < 12) doc.socials.push(s);
    for (const h of x.hiring) if (!doc.hiringSignals.includes(h) && doc.hiringSignals.length < 8) doc.hiringSignals.push(h);
    for (const o of x.offerings) if (!doc.offerings.includes(o) && doc.offerings.length < 30) doc.offerings.push(o);
    if (!doc.description && x.description) doc.description = x.description.slice(0, 600);
    if (x.address) {
      doc.location.city ??= x.address.city;
      doc.location.region ??= x.address.region;
      doc.location.country ??= x.address.country;
      if (!doc.address && x.address.street) doc.address = [x.address.street, x.address.city].filter(Boolean).join(", ");
    }
  }
  const contactBlock = await suppressedSet({ emails: contacts.filter((c) => c.kind === "EMAIL").map((c) => c.value), phones: contacts.filter((c) => c.kind !== "EMAIL").map((c) => c.value) });
  mergeContacts(doc, contacts, contactBlock);
  doc.technologyHints = result.check.technology;
  if (result.check.ok && result.check.nameMatches) doc.verification = "VERIFIED";

  const decision = websiteDecision(doc, result.check);
  doc.website.status = decision.status;
  doc.website.evidence = decision.evidence;
  doc.website.failures = decision.failures;
  doc.website.audit = result.check as unknown as Record<string, unknown>;
  doc.website.checkedAt = new Date();
  if (result.check.ok) {
    doc.website.crawledAt = new Date();
    doc.website.pagesCrawled = result.pages.length;
  }
  doc.lastResearchedAt = new Date();
  await doc.save();
  await rescore(doc._id.toString());

  const pid = doc._id.toString();
  const searchId = oidStr(task.searchId);
  const analyse = !!task.payload?.analyse;
  let next = false;
  if (decision.recheckAt) {
    // Not tied to the search, so a recheck an hour later does not keep the search open.
    await enqueueTask({ type: "crawl", prospectId: pid, payload: { analyse, recheck: true }, runAfter: decision.recheckAt, dedupeKey: `recheck:${pid}` });
    await setResearch(pid, "QUEUED", "Checking the website again in an hour");
    next = true;
  } else if (result.check.ok && integrations.research.pagespeed.configured) {
    await enqueueTask({ type: "audit", prospectId: pid, searchId, payload: { analyse }, dedupeKey: `audit:${pid}` });
    await setResearch(pid, "QUEUED", "Waiting for the PageSpeed check");
    next = true;
  } else if (analyse) {
    await enqueueTask({ type: "analyse", prospectId: pid, searchId, dedupeKey: `analyse:${pid}` });
    await setResearch(pid, "QUEUED", "Waiting for the AI summary");
    next = true;
  }
  if (!next) await setResearch(pid, "DONE");
  return { result: { ok: result.check.ok, pages: result.pages.length, status: decision.status } };
};

const audit: TaskHandler = async ({ task }) => {
  const doc = await Prospect.findById(task.prospectId);
  if (!doc?.website.url) return { skip: "No website address is known." };
  const check = doc.website.audit as unknown as SiteCheck | undefined;
  const pid = doc._id.toString();
  const analyse = !!task.payload?.analyse;
  const finish = async () => {
    if (analyse) {
      await enqueueTask({ type: "analyse", prospectId: pid, searchId: oidStr(task.searchId), dedupeKey: `analyse:${pid}` });
      await setResearch(pid, "QUEUED", "Waiting for the AI summary");
    } else await setResearch(pid, "DONE");
  };
  if (!check?.ok) {
    await finish();
    return { skip: "The website could not be read, so PageSpeed was not run." };
  }
  await setResearch(pid, "RUNNING", "Running PageSpeed");
  const started = Date.now();
  try {
    const scores = await runPageSpeed(check.finalUrl ?? doc.website.url, { apiKey: env.pagespeedApiKey || undefined, timeoutMs: 90_000 });
    await recordUsage({ provider: "pagespeed", feature: "audit", units: 1, ok: true, durationMs: Date.now() - started, searchId: oidStr(task.searchId), prospectId: pid });
    doc.website.pagespeed = scores;
  } catch (err) {
    await recordUsage({ provider: "pagespeed", feature: "audit", units: 1, ok: false, errorKind: err instanceof SourceError ? err.kind : "provider_error", errorMessage: err instanceof Error ? err.message : undefined, durationMs: Date.now() - started, prospectId: pid });
    // Without a key the shared quota runs out quickly. The status rules work without PageSpeed.
    if (err instanceof SourceError && (err.kind === "quota" || err.kind === "rate_limited" || err.kind === "bad_request")) {
      await finish();
      return { skip: `PageSpeed was not available (${err.kind}).` };
    }
    rethrow(err);
  }
  const decision = websiteDecision(doc, { ...check, checkedAt: new Date(check.checkedAt) });
  doc.website.status = decision.status;
  doc.website.evidence = decision.evidence;
  await doc.save();
  await rescore(pid);
  await finish();
  return { result: { performance: doc.website.pagespeed?.performance } };
};

const enrich: TaskHandler = async ({ task }) => {
  if (!env.companiesHouseApiKey) return { skip: "Companies House has no API key configured." };
  const doc = await Prospect.findById(task.prospectId);
  if (!doc) return { skip: "The business no longer exists." };
  if (countryIso(doc.location?.country) !== "GB") return { skip: "Companies House covers the United Kingdom only." };
  let companies;
  try {
    companies = await searchCompaniesHouse(doc.name, { apiKey: env.companiesHouseApiKey });
  } catch (err) {
    rethrow(err);
  }
  await recordUsage({ provider: "companies_house", feature: "enrich", units: 1, ok: true, prospectId: doc._id.toString() });
  const match = bestCompaniesHouseMatch(doc.name, companies);
  doc.registration = match
    ? { registry: "Companies House", number: match.number, status: "VERIFIED", companyStatus: match.status, sourceUrl: match.url, checkedAt: new Date() }
    : { ...doc.registration, registry: "Companies House", status: "NOT_FOUND", note: "No company with a closely matching name was found.", checkedAt: new Date() };
  await doc.save();
  return { result: { matched: !!match } };
};

const analyse: TaskHandler = async ({ task }) => {
  const pid = oidStr(task.prospectId);
  if (!pid) throw new PermanentTaskError("The task has no business.");
  await setResearch(pid, "RUNNING", "Writing the AI summary");
  try {
    const r = await analyseProspect(pid, { userId: oidStr(task.createdBy), searchId: oidStr(task.searchId) });
    await setResearch(pid, "DONE");
    return { result: { model: r.model, costUsd: r.costUsd } };
  } catch (err) {
    rethrow(err);
  }
};

export const HANDLERS: Record<string, TaskHandler> = { discover, verify, crawl, audit, enrich, analyse };

/* --------------------------------- Progress -------------------------------- */

/** Recomputes a search's progress, status and cost from its tasks and the usage ledger. */
export async function refreshSearch(searchId: string): Promise<void> {
  await connectDb();
  const search = await ProspectSearch.findById(searchId).lean();
  if (!search) return;
  const counts = await taskCounts(searchId);
  const n = (k: string) => counts[k] ?? 0;
  const open = n("PENDING") + n("RUNNING");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const [cost] = await ApiUsage.aggregate<{ c: number }>([{ $match: { searchId: search._id } }, { $group: { _id: null, c: { $sum: "$costUsd" } } }]);
  const set: Record<string, unknown> = { progress: { total, done: n("DONE") + n("SKIPPED") + n("CANCELLED"), failed: n("FAILED") }, actualCostUsd: cost?.c ?? 0 };
  if (search.status !== "CANCELLED") {
    if (open > 0) set.status = "RUNNING";
    else {
      const discovers = await ResearchTask.find({ searchId: search._id, type: "discover" }).select("status error payload").lean();
      const failed = discovers.filter((d) => d.status === "FAILED");
      set.status = discovers.length && failed.length === discovers.length ? "FAILED" : "DONE";
      set.errorLog = failed.map((d) => `${String(d.payload?.source ?? "source")}. ${d.error ?? "Failed"}`).slice(0, 10);
      if (!search.finishedAt) set.finishedAt = new Date();
    }
  }
  await ProspectSearch.updateOne({ _id: search._id }, { $set: set });
}

async function afterTask(task: ResearchTaskDoc, ended: string | null): Promise<void> {
  if (task.searchId) await refreshSearch(task.searchId.toString());
  if (task.prospectId && ended === "FAILED") {
    const t = await ResearchTask.findById(task._id).select("error").lean();
    await setResearch(task.prospectId, "FAILED", `${task.type} failed`, t?.error);
  }
}

/** Runs queued research for up to budgetMs. Safe to call from several places at once. */
export async function runResearchWorker(budgetMs: number) {
  await connectDb();
  return runWorker({ handlers: HANDLERS, budgetMs, afterTask });
}

/* -------------------------------- Retention -------------------------------- */

/**
 * Deletes prospects that were never added to Leads and have not changed for the retention
 * period, with their drafts, and clears finished tasks older than 30 days.
 */
export async function purgeExpired(): Promise<{ prospects: number; tasks: number }> {
  await connectDb();
  const settings = await getResearchSettings();
  const cutoff = new Date(Date.now() - settings.retentionMonths * 30 * DAY_MS);
  const stale = await Prospect.find({ leadId: { $exists: false }, updatedAt: { $lt: cutoff } }).select("_id").limit(5000).lean();
  const ids = stale.map((s) => s._id);
  if (ids.length) {
    await OutreachDraft.deleteMany({ prospectId: { $in: ids } });
    await Prospect.deleteMany({ _id: { $in: ids } });
  }
  const tasks = await ResearchTask.deleteMany({ status: { $in: ["DONE", "SKIPPED", "CANCELLED", "FAILED"] }, finishedAt: { $lt: new Date(Date.now() - 30 * DAY_MS) } });
  return { prospects: ids.length, tasks: tasks.deletedCount };
}
