import { describe, expect, it, vi } from "vitest";
import { crawlSite, type Fetcher } from "@/server/research/crawl";
import { FetchFailure, type SafeResponse } from "@/server/research/safe-fetch";
import { filterCitedSources, searchesFor } from "@/server/research/ai-discovery";
import { buildOverpassQuery, mapOverpassElements } from "@/server/research/sources/openstreetmap";
import { buildPlacesTextQuery, mapPlaces, searchGooglePlaces } from "@/server/research/sources/google-places";
import { bestCompaniesHouseMatch, mapCompanySearch, searchCompaniesHouse } from "@/server/research/sources/companies-house";
import { mapPageSpeed, runPageSpeed } from "@/server/research/sources/pagespeed";
import { SourceError } from "@/server/research/sources/errors";
import type { CrawlSettings } from "@/types/research";
import type { DiscoveryQuery } from "@/server/research/types";

const settings: CrawlSettings = { depth: 2, pagesPerSite: 8, timeoutSeconds: 5, retries: 1, delaySeconds: 1, maxPageKb: 512, pagesPerDay: 500 };

type Page = { status: number; body?: string; type?: string; location?: string };

/** A fake website. Every request is recorded so the tests can check what the crawler asked for. */
function site(pages: Record<string, Page | Error>) {
  const requested: string[] = [];
  const fetcher: Fetcher = async (url, opts) => {
    requested.push(`${opts.method ?? "GET"} ${url}`);
    const page = pages[url];
    if (page instanceof Error) throw page;
    const p = page ?? { status: 404, body: "Not found" };
    const res: SafeResponse = { url, status: p.status, headers: { "content-type": p.type ?? "text/html; charset=utf-8" }, body: Buffer.from(opts.method === "HEAD" ? "" : (p.body ?? "")), truncated: false, redirects: 0, chain: [url] };
    return res;
  };
  return { fetcher, requested };
}

const HOME = `<html><head><title>Bright Path Logistics</title><meta name="viewport" content="width=device-width"></head><body>
<a href="/about-us">About us</a><a href="/contact">Contact</a><a href="/private/team">Team</a><a href="/blog">Blog</a><a href="/old-page">Old</a>
<p>Bright Path Logistics, couriers in Ibadan. &copy; 2026</p></body></html>`;

const base = { settings, userAgent: "TestBot", businessName: "Bright Path Logistics", sleep: async () => undefined };

describe("crawlSite", () => {
  it("reads robots.txt first, obeys it and reads the priority pages", async () => {
    const { fetcher, requested } = site({
      "https://brightpath.ng/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /private", type: "text/plain" },
      "https://brightpath.ng/": { status: 200, body: HOME },
      "https://brightpath.ng/about-us": { status: 200, body: "<html><body><h1>About Bright Path</h1></body></html>" },
      "https://brightpath.ng/contact": { status: 200, body: "<html><body><a href='mailto:hello@brightpath.ng'>Email</a> Call 0803 123 4567</body></html>" },
      "https://brightpath.ng/blog": { status: 200, body: "<html></html>" },
    });
    const r = await crawlSite("https://brightpath.ng/", { ...base, fetcher, deadline: Date.now() + 60_000 });
    expect(requested[0]).toBe("GET https://brightpath.ng/robots.txt");
    expect(requested.some((u) => u.includes("/private"))).toBe(false);
    expect(r.check).toMatchObject({ ok: true, https: true, hasViewport: true, nameMatches: true, copyrightYear: 2026 });
    expect(r.pages.map((p) => p.url)).toEqual(expect.arrayContaining(["https://brightpath.ng/", "https://brightpath.ng/about-us", "https://brightpath.ng/contact"]));
    expect(r.pages.flatMap((p) => p.extract?.emails ?? [])).toContain("hello@brightpath.ng");
    // The blog is not a research page, so it is only part of the broken link sample.
    expect(r.pages.some((p) => p.url.endsWith("/blog"))).toBe(false);
    expect(r.check.brokenLinks?.broken).toContain("https://brightpath.ng/old-page");
    expect(r.requests).toBe(requested.length);
  });

  it("measures the home page's speed, weight and basics", async () => {
    const page = `<html lang="en"><head><title>Bright Path Logistics</title><meta name="description" content="Couriers"><script src="/app.js"></script><link rel="stylesheet" href="/site.css"></head><body><h1>Bright Path Logistics</h1><img src="/hero.jpg"></body></html>`;
    const sizes: Record<string, number> = { "https://brightpath.ng/app.js": 300 * 1024, "https://brightpath.ng/site.css": 100 * 1024, "https://brightpath.ng/hero.jpg": 2 * 1024 * 1024 };
    const { fetcher: inner, requested } = site({ "https://brightpath.ng/robots.txt": { status: 404 }, "https://brightpath.ng/": { status: 200, body: page } });
    const fetcher: Fetcher = async (url, opts) => {
      const res = await inner(url, opts);
      if (opts.method === "HEAD" && sizes[url]) return { ...res, status: 200, headers: { ...res.headers, "content-length": String(sizes[url]) } };
      return res;
    };
    const r = await crawlSite("https://brightpath.ng/", { ...base, fetcher, deadline: Date.now() + 60_000, linkSample: 0 });
    expect(r.check.speed).toMatchObject({ compressed: false, scripts: 1, styles: 1, images: 1, sampled: 3 });
    expect(r.check.speed?.estimatedPageKb).toBeGreaterThan(2400);
    expect(r.check.speed?.responseMs).toBeGreaterThanOrEqual(0);
    expect(r.check.basics).toEqual({ title: true, metaDescription: true, h1Count: 1, lang: true, images: 1, imagesWithoutAlt: 1 });
    expect(requested.filter((u) => u.startsWith("HEAD"))).toHaveLength(3);
  });

  it("waits between requests to the same site", async () => {
    const sleep = vi.fn(async () => undefined);
    const { fetcher } = site({ "https://brightpath.ng/robots.txt": { status: 404 }, "https://brightpath.ng/": { status: 200, body: HOME } });
    await crawlSite("https://brightpath.ng/", { ...base, sleep, fetcher, deadline: Date.now() + 60_000, linkSample: 0 });
    expect(sleep).toHaveBeenCalled();
  });

  it("stops when robots.txt disallows everything", async () => {
    const { fetcher, requested } = site({ "https://brightpath.ng/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /" } });
    const r = await crawlSite("https://brightpath.ng/", { ...base, fetcher, deadline: Date.now() + 60_000 });
    expect(r.check).toMatchObject({ ok: false, failure: "robots" });
    expect(requested).toHaveLength(1);
  });

  it("does not crawl when robots.txt answers with a server error", async () => {
    const { fetcher, requested } = site({ "https://brightpath.ng/robots.txt": { status: 503 } });
    const r = await crawlSite("https://brightpath.ng/", { ...base, fetcher, deadline: Date.now() + 60_000 });
    expect(r.check.failure).toBe("robots");
    expect(requested).toHaveLength(1);
  });

  it("reports a domain that does not resolve", async () => {
    const { fetcher } = site({ "https://gone.ng/robots.txt": new FetchFailure("dns", "no address") });
    const r = await crawlSite("https://gone.ng/", { ...base, fetcher, deadline: Date.now() + 60_000 });
    expect(r.check).toMatchObject({ ok: false, failure: "dns" });
  });

  it("stops at once when the site refuses the crawler", async () => {
    const { fetcher, requested } = site({ "https://brightpath.ng/robots.txt": { status: 404 }, "https://brightpath.ng/": { status: 403 } });
    const r = await crawlSite("https://brightpath.ng/", { ...base, fetcher, deadline: Date.now() + 60_000 });
    expect(r.check).toMatchObject({ ok: false, failure: "blocked", httpStatus: 403 });
    expect(requested).toHaveLength(2);
  });

  it("spots a parked domain", async () => {
    const { fetcher } = site({ "https://brightpath.ng/robots.txt": { status: 404 }, "https://brightpath.ng/": { status: 200, body: "<title>brightpath.ng</title><body>This domain is for sale!</body>" } });
    const r = await crawlSite("https://brightpath.ng/", { ...base, fetcher, deadline: Date.now() + 60_000 });
    expect(r.check.failure).toBe("parked");
  });

  it("notices when the site never mentions the business", async () => {
    const { fetcher } = site({ "https://brightpath.ng/robots.txt": { status: 404 }, "https://brightpath.ng/": { status: 200, body: "<title>Sunrise Bakery</title><body>Fresh bread</body>" } });
    const r = await crawlSite("https://brightpath.ng/", { ...base, businessName: "Okafor Haulage", fetcher, deadline: Date.now() + 60_000, linkSample: 0 });
    expect(r.check.nameMatches).toBe(false);
  });
});

describe("AI discovery filtering", () => {
  const business = (over: Partial<Parameters<typeof filterCitedSources>[0][number]> = {}) => ({ name: "Bright Path Logistics", website: null, phone: null, email: null, city: "Ibadan", region: null, country: "Nigeria", industry: "Logistics", sourceUrls: ["https://directory.example.ng/bright-path"], evidence: "Listed as a courier", ...over });

  it("keeps only source links the search really returned", () => {
    const { candidates, dropped } = filterCitedSources(
      [business(), business({ name: "Invented Ltd", sourceUrls: ["https://made-up.example.ng/x"] }), business({ name: "No Source", sourceUrls: [] })],
      [{ url: "https://www.directory.example.ng/bright-path/" }],
      "anthropic",
    );
    expect(candidates.map((c) => c.name)).toEqual(["Bright Path Logistics"]);
    expect(candidates[0]).toMatchObject({ foundBy: "anthropic", listsNoWebsite: true });
    expect(dropped).toBe(2);
  });

  it("accepts links when the provider reports no sources, leaving them to the verify step", () => {
    expect(filterCitedSources([business()], [], "openai").candidates).toHaveLength(1);
  });

  it("allows more searches for bigger requests, within limits", () => {
    expect(searchesFor(10)).toBe(3);
    expect(searchesFor(50)).toBe(5);
    expect(searchesFor(1)).toBe(2);
  });
});

const query: DiscoveryQuery = { text: "logistics companies in Ibadan", industry: "Logistics", keywords: [], city: "Ibadan", region: "Oyo", country: "Nigeria", websiteFilter: "any", maxResults: 10 };

function jsonFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("OpenStreetMap", () => {
  it("builds a tag query for a mapped industry and a name query otherwise", () => {
    const q = buildOverpassQuery({ areaId: 3600000001 }, query);
    expect(q).toContain("area(3600000001)->.searchArea;");
    expect(q).toMatch(/\[out:json\]/);
    const fallback = buildOverpassQuery({ bbox: [7.3, 3.8, 7.5, 4.0] }, { ...query, industry: undefined, keywords: ["zebra crossing paint"] });
    expect(fallback).toMatch(/"name"~"zebra crossing paint",i/);
  });

  it("maps elements and applies the website filter", () => {
    const json = {
      elements: [
        { type: "node", id: 1, tags: { name: "Bright Path Logistics", office: "logistics", phone: "+234 803 123 4567", website: "https://brightpath.ng" } },
        { type: "way", id: 2, tags: { name: "Okafor Haulage", office: "logistics", "addr:city": "Ibadan" } },
        { type: "node", id: 3, tags: { office: "logistics" } },
      ],
    };
    const all = mapOverpassElements(json, query);
    expect(all.map((c) => c.osmId)).toEqual(["node/1", "way/2"]);
    expect(all[0]).toMatchObject({ foundBy: "openstreetmap", website: "https://brightpath.ng", sourceUrls: ["https://www.openstreetmap.org/node/1"] });
    expect(mapOverpassElements(json, { ...query, websiteFilter: "none" }).map((c) => c.name)).toEqual(["Okafor Haulage"]);
  });
});

describe("Google Places", () => {
  it("builds the text query and maps places, skipping closed ones", () => {
    expect(buildPlacesTextQuery(query)).toBe("Logistics companies in Ibadan, Oyo, Nigeria");
    const mapped = mapPlaces({
      places: [
        { id: "p1", displayName: { text: "Bright Path Logistics" }, internationalPhoneNumber: "+234 803 123 4567", addressComponents: [{ longText: "Ibadan", types: ["locality"] }] },
        { id: "p2", displayName: { text: "Closed Ltd" }, businessStatus: "CLOSED_PERMANENTLY" },
      ],
    });
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({ googlePlaceId: "p1", city: "Ibadan", listsNoWebsite: true, foundBy: "google_places" });
  });

  it("sends the key and field mask and counts requests", async () => {
    const fetchImpl = jsonFetch({ places: [{ id: "p1", displayName: { text: "A" }, websiteUri: "https://a.ng" }] });
    const r = await searchGooglePlaces(query, { apiKey: "test-key", fetchImpl, maxPages: 3 });
    expect(r.requests).toBe(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.websiteUri");
  });

  it("maps HTTP errors to source errors", async () => {
    await expect(searchGooglePlaces(query, { apiKey: "k", fetchImpl: jsonFetch({ error: {} }, 403) })).rejects.toMatchObject({ kind: "auth" });
    await expect(searchGooglePlaces(query, { apiKey: "k", fetchImpl: jsonFetch({ error: {} }, 429) })).rejects.toBeInstanceOf(SourceError);
    await expect(searchGooglePlaces(query, { apiKey: "k", fetchImpl: jsonFetch({}, 500) })).rejects.toMatchObject({ kind: "provider_error" });
  });
});

describe("Companies House", () => {
  const json = { items: [{ title: "BRIGHT PATH LOGISTICS LIMITED", company_number: "01234567", company_status: "active", address_snippet: "1 High Street, Leeds" }, { title: "BRIGHT PATHWAYS LTD", company_number: "07654321", company_status: "dissolved" }] };

  it("maps search results and picks a close active match", () => {
    const companies = mapCompanySearch(json);
    expect(companies[0]).toMatchObject({ number: "01234567", url: "https://find-and-update.company-information.service.gov.uk/company/01234567" });
    expect(bestCompaniesHouseMatch("Bright Path Logistics Ltd", companies)?.number).toBe("01234567");
    expect(bestCompaniesHouseMatch("Sunrise Bakery", companies)).toBeUndefined();
  });

  it("uses basic auth with the key as the user name", async () => {
    const fetchImpl = jsonFetch(json);
    await searchCompaniesHouse("Bright Path", { apiKey: "abc", fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/search/companies?");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("abc:").toString("base64")}`);
  });
});

describe("PageSpeed", () => {
  it("maps category scores to 0 to 100", () => {
    const s = mapPageSpeed({ lighthouseResult: { categories: { performance: { score: 0.37 }, accessibility: { score: 0.9 }, "best-practices": { score: 1 }, seo: { score: 0.82 } } } });
    expect(s).toMatchObject({ performance: 37, accessibility: 90, bestPractices: 100, seo: 82 });
  });

  it("asks for the mobile strategy", async () => {
    const fetchImpl = jsonFetch({ lighthouseResult: { categories: {} } });
    await runPageSpeed("https://brightpath.ng/", { fetchImpl });
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("strategy=MOBILE");
    expect(url).toContain("url=https%3A%2F%2Fbrightpath.ng%2F");
  });
});
