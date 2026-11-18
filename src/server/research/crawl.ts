import type { CrawlSettings } from "@/types/research";
import { classifyPage, detectPlaceholderPage, extractPage, legacyTechnology } from "./extract";
import { domainOf, textMentionsBusiness } from "./normalise";
import { crawlDelaySeconds, isAllowed, rulesForStatus, type RobotsRules } from "./robots";
import { FetchFailure, decodeHtml, safeFetch, type SafeFetchOptions, type SafeResponse } from "./safe-fetch";
import type { CrawledPage, SiteCheck } from "./types";

/**
 * Polite crawl of one business website. Reads robots.txt first and obeys it, stays on the
 * business's own site, fetches only the pages that matter for research (contact, about,
 * team, services and so on), waits between requests, stops at once on 401, 403 or 429, and
 * never logs in, solves a CAPTCHA or works around any protection. Page scripts never run.
 */

export type Fetcher = (url: string, opts: SafeFetchOptions) => Promise<SafeResponse>;

export interface CrawlOptions {
  settings: CrawlSettings;
  userAgent: string;
  businessName: string;
  /** City, region and country, so a name like "Bright Path Ibadan" still matches a site that says "Bright Path". */
  places?: (string | undefined)[];
  /** The crawl stops starting new requests after this moment (epoch ms). */
  deadline: number;
  fetcher?: Fetcher;
  sleep?: (ms: number) => Promise<void>;
  /** How many internal links to test for the broken link sample. */
  linkSample?: number;
}

export interface CrawlResult {
  check: SiteCheck;
  pages: CrawledPage[];
  /** Requests made, for the daily page limit and the usage ledger. */
  requests: number;
}

const PRIORITY = ["contact", "about", "team", "services", "products", "solutions", "careers", "pricing"] as const;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function failureOf(err: unknown): SiteCheck["failure"] {
  if (err instanceof FetchFailure) {
    if (err.kind === "dns" || err.kind === "tls" || err.kind === "timeout" || err.kind === "connection") return err.kind;
    if (err.kind === "blocked" || err.kind === "bad_url") return "blocked";
    if (err.kind === "too_large") return "too_large";
  }
  return "connection";
}

const isHtml = (res: SafeResponse) => {
  const type = (res.headers["content-type"] ?? "").toLowerCase();
  return !type || type.includes("html") || type.includes("xml");
};

export async function crawlSite(startUrl: string, opts: CrawlOptions): Promise<CrawlResult> {
  const fetcher = opts.fetcher ?? safeFetch;
  const sleep = opts.sleep ?? wait;
  const s = opts.settings;
  const base: SafeFetchOptions = { userAgent: opts.userAgent, timeoutMs: s.timeoutSeconds * 1000, maxBytes: s.maxPageKb * 1024 };
  const checkedAt = new Date();
  let requests = 0;
  let lastRequest = 0;
  let lastDurationMs = 0;
  let delayMs = s.delaySeconds * 1000;

  const polite = async <T>(fn: () => Promise<T>): Promise<T> => {
    const since = Date.now() - lastRequest;
    if (lastRequest && since < delayMs) await sleep(delayMs - since);
    lastRequest = Date.now();
    requests += 1;
    const out = await fn();
    lastDurationMs = Date.now() - lastRequest;
    return out;
  };

  const fail = (failure: SiteCheck["failure"], extra: Partial<SiteCheck> = {}): CrawlResult => ({
    check: { requestedUrl: startUrl, ok: false, failure, https: startUrl.startsWith("https:"), redirects: 0, technology: [], legacyTechnology: [], checkedAt, ...extra },
    pages: [],
    requests,
  });

  const start = new URL(startUrl);
  const host = domainOf(startUrl) ?? start.hostname.replace(/^www\./, "");
  const sameSite = (u: string) => {
    try {
      return new URL(u).hostname.toLowerCase().replace(/^www\d?\./, "") === host;
    } catch {
      return false;
    }
  };

  // robots.txt first. A site that cannot even answer that is unreachable.
  let origin = start.origin;
  let rules: RobotsRules;
  try {
    const res = await polite(() => fetcher(`${origin}/robots.txt`, { ...base, maxBytes: 512 * 1024, accept: "text/plain,*/*;q=0.5" }));
    if (!sameSite(res.url)) return fail("blocked", { finalUrl: res.url, httpStatus: res.status });
    origin = new URL(res.url).origin;
    rules = rulesForStatus(res.status, res.status >= 200 && res.status < 300 ? res.body.toString("utf8") : "");
  } catch (err) {
    // Some sites only answer on plain http. Try once before calling it a failure.
    if (start.protocol === "https:" && err instanceof FetchFailure && (err.kind === "tls" || err.kind === "connection")) {
      try {
        origin = `http://${start.host}`;
        const res = await polite(() => fetcher(`${origin}/robots.txt`, { ...base, maxBytes: 512 * 1024, accept: "text/plain,*/*;q=0.5" }));
        rules = rulesForStatus(res.status, res.status >= 200 && res.status < 300 ? res.body.toString("utf8") : "");
      } catch {
        return fail(failureOf(err));
      }
    } else {
      return fail(failureOf(err));
    }
  }
  const robotsDelay = crawlDelaySeconds(rules);
  if (robotsDelay) delayMs = Math.max(delayMs, robotsDelay * 1000);
  if (!isAllowed(rules, "/")) return fail("robots", { https: origin.startsWith("https:") });

  // The home page.
  const fetchPage = async (url: string): Promise<SafeResponse> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= s.retries; attempt++) {
      try {
        const res = await polite(() => fetcher(url, base));
        if (res.status >= 500 && attempt < s.retries && Date.now() < opts.deadline) continue;
        return res;
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof FetchFailure && (err.kind === "timeout" || err.kind === "connection");
        if (!retryable || attempt >= s.retries || Date.now() >= opts.deadline) throw err;
      }
    }
    throw lastErr;
  };

  let home: SafeResponse;
  try {
    home = await fetchPage(`${origin}/`);
  } catch (err) {
    return fail(failureOf(err), { https: origin.startsWith("https:") });
  }
  const homeResponseMs = lastDurationMs;
  const finalUrl = home.url;
  const https = finalUrl.startsWith("https:");
  if (!sameSite(finalUrl)) return fail("blocked", { finalUrl, httpStatus: home.status, https, redirects: home.redirects });
  if (home.status === 401 || home.status === 403 || home.status === 429) return fail("blocked", { finalUrl, httpStatus: home.status, https, redirects: home.redirects });
  if (home.status >= 400) return fail("http_error", { finalUrl, httpStatus: home.status, https, redirects: home.redirects });
  if (!isHtml(home)) return fail("not_html", { finalUrl, httpStatus: home.status, https, redirects: home.redirects });

  const homeExtract = extractPage(decodeHtml(home.body, home.headers["content-type"]), finalUrl);
  const placeholder = detectPlaceholderPage(homeExtract);
  if (placeholder) return fail("parked", { finalUrl, httpStatus: home.status, https, redirects: home.redirects, pageBytes: home.body.length });

  const pages: CrawledPage[] = [{ url: finalUrl, status: home.status, bytes: home.body.length, extract: homeExtract }];
  const seen = new Set<string>([finalUrl, `${origin}/`]);

  // Priority pages, at most one per kind first, then deeper links of the same kinds.
  type Item = { url: string; kind: (typeof PRIORITY)[number]; depth: number };
  const queue: Item[] = [];
  const enqueue = (links: { url: string; text: string }[], depth: number) => {
    for (const link of links) {
      if (seen.has(link.url) || !sameSite(link.url)) continue;
      const kind = classifyPage(link.url, link.text);
      if (!kind) continue;
      seen.add(link.url);
      queue.push({ url: link.url, kind, depth });
    }
    queue.sort((a, b) => a.depth - b.depth || PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  };
  enqueue(homeExtract.internalLinks, 1);

  let blockedMidway = false;
  const kindsDone = new Set<string>();
  while (queue.length && pages.length < s.pagesPerSite && Date.now() + delayMs < opts.deadline) {
    // Prefer a kind not read yet.
    const index = queue.findIndex((q) => !kindsDone.has(q.kind));
    const item = queue.splice(index >= 0 ? index : 0, 1)[0] as Item;
    if (item.depth > s.depth) continue;
    const path = new URL(item.url).pathname + new URL(item.url).search;
    if (!isAllowed(rules, path)) continue;
    let res: SafeResponse;
    try {
      res = await fetchPage(item.url);
    } catch {
      continue;
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      blockedMidway = true;
      break;
    }
    if (res.status >= 400 || !isHtml(res) || !sameSite(res.url)) continue;
    const extract = extractPage(decodeHtml(res.body, res.headers["content-type"]), res.url);
    pages.push({ url: res.url, status: res.status, bytes: res.body.length, extract });
    kindsDone.add(item.kind);
    if (item.depth < s.depth) enqueue(extract.internalLinks, item.depth + 1);
  }

  // A sample of internal links that were not crawled, to spot broken links.
  let brokenLinks: SiteCheck["brokenLinks"];
  const sampleSize = opts.linkSample ?? 10;
  if (!blockedMidway && sampleSize > 0) {
    const candidates = [...new Set(pages.flatMap((p) => p.extract?.internalLinks.map((l) => l.url) ?? []))].filter((u) => !pages.some((p) => p.url === u) && sameSite(u));
    const sample = candidates.slice(0, sampleSize);
    const broken: string[] = [];
    let checked = 0;
    for (const url of sample) {
      if (Date.now() + delayMs + base.timeoutMs > opts.deadline) break;
      const u = new URL(url);
      if (!isAllowed(rules, u.pathname + u.search)) continue;
      try {
        let res = await polite(() => fetcher(url, { ...base, method: "HEAD", timeoutMs: Math.min(base.timeoutMs, 8000) }));
        if (res.status === 405 || res.status === 501) res = await polite(() => fetcher(url, { ...base, maxBytes: 64 * 1024, timeoutMs: Math.min(base.timeoutMs, 8000) }));
        if (res.status === 429 || res.status === 403) break;
        checked += 1;
        if (res.status === 404 || res.status === 410 || res.status >= 500) broken.push(url);
      } catch (err) {
        checked += 1;
        if (err instanceof FetchFailure && err.kind !== "timeout") broken.push(url);
      }
    }
    if (checked) brokenLinks = { checked, broken };
  }

  // Page weight: read the size of a few of the home page's scripts, stylesheets and images.
  // HEAD requests only, so nothing is downloaded. Other sites (CDNs) are asked once each.
  const homeAssets = homeExtract.assets;
  const pick = [...homeAssets.filter((a) => a.kind === "script").slice(0, 3), ...homeAssets.filter((a) => a.kind === "style").slice(0, 2), ...homeAssets.filter((a) => a.kind === "image").slice(0, 5)];
  let sampled = 0;
  let sampledBytes = 0;
  if (!blockedMidway) {
    for (const asset of pick) {
      if (Date.now() + delayMs + 6000 > opts.deadline) break;
      if (sameSite(asset.url)) {
        const u = new URL(asset.url);
        if (!isAllowed(rules, u.pathname + u.search)) continue;
      }
      try {
        const res = await polite(() => fetcher(asset.url, { ...base, method: "HEAD", timeoutMs: Math.min(base.timeoutMs, 6000) }));
        const size = Number(res.headers["content-length"] ?? "");
        if (res.status >= 200 && res.status < 300 && Number.isFinite(size) && size > 0) {
          sampled += 1;
          sampledBytes += size;
        }
      } catch {
        // An asset that cannot be read is left out of the sample.
      }
    }
  }
  const kb = (n: number) => Math.round(n / 1024);
  const assetCount = homeAssets.length;
  const speed = {
    responseMs: homeResponseMs,
    htmlKb: kb(home.body.length),
    compressed: !!home.headers["content-encoding"],
    scripts: homeAssets.filter((a) => a.kind === "script").length,
    styles: homeAssets.filter((a) => a.kind === "style").length,
    images: homeAssets.filter((a) => a.kind === "image").length,
    sampled,
    sampledKb: kb(sampledBytes),
    estimatedPageKb: kb(home.body.length + (sampled ? (sampledBytes / sampled) * assetCount : 0)),
  };
  const basics = {
    title: !!homeExtract.title,
    metaDescription: !!homeExtract.description,
    h1Count: homeExtract.h1Count,
    lang: !!homeExtract.htmlLang,
    images: homeExtract.images,
    imagesWithoutAlt: homeExtract.imagesWithoutAlt,
  };

  const technology = [...new Set(pages.flatMap((p) => p.extract?.technology ?? []))];
  const years = pages.map((p) => p.extract?.copyrightYear).filter((y): y is number => typeof y === "number");
  const allText = pages.map((p) => `${p.extract?.title ?? ""} ${p.extract?.siteName ?? ""} ${p.extract?.text.slice(0, 5000) ?? ""}`).join(" ");
  const hostWords = host.replace(/\.[a-z.]+$/, "").replace(/[-_.]/g, " ");
  const nameMatches = textMentionsBusiness(allText, opts.businessName, opts.places) || textMentionsBusiness(hostWords, opts.businessName, opts.places);

  return {
    check: {
      requestedUrl: startUrl,
      finalUrl,
      ok: true,
      httpStatus: home.status,
      https,
      redirects: home.redirects,
      hasViewport: homeExtract.hasViewport,
      copyrightYear: years.length ? Math.max(...years) : undefined,
      pageBytes: home.body.length,
      technology,
      legacyTechnology: legacyTechnology(technology),
      nameMatches,
      brokenLinks,
      speed,
      basics,
      checkedAt,
    },
    pages,
    requests,
  };
}
