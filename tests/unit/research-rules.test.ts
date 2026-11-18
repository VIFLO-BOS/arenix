import { describe, expect, it } from "vitest";
import { countryIso, domainOf, nameSimilarity, nameVariants, normaliseEmail, normaliseName, normalisePhone, normaliseWebsite, stableHash, suppressionHash, textMentionsBusiness, textMentionsName } from "@/server/research/normalise";
import { cleanCandidate, dedupeCandidates, findMatch, type MatchTarget } from "@/server/research/merge";
import { applyAiAdjustment, baseScore, industryMatch, scoreBand } from "@/server/research/score";
import { decideWebsiteStatus, outdatedSignals } from "@/server/research/website-status";
import { checkPublicUrl, isBlockedIp } from "@/server/research/net-guard";
import { buildEvidence, evidenceHash } from "@/server/research/evidence";
import type { SiteCheck } from "@/server/research/types";
import type { ScoringWeights } from "@/types/research";

describe("normalisers", () => {
  it("normalises business names and drops legal words", () => {
    expect(normaliseName("The Bright Path Logistics Ltd.")).toBe("bright path logistics");
    expect(normaliseName("Okafor & Sons Nig. Limited")).toBe("okafor and sons");
    expect(normaliseName("Ltd")).toBe("ltd");
  });

  it("scores similar names high and different names low", () => {
    expect(nameSimilarity("Bright Path Logistics Ltd", "Brightpath Logistics")).toBeGreaterThan(0.85);
    expect(nameSimilarity("Bright Path Logistics", "Sunrise Bakery")).toBeLessThan(0.3);
  });

  it("finds a business name in page text", () => {
    expect(textMentionsName("Welcome to Bright Path Logistics, Ibadan's courier.", "Bright Path Logistics Ltd")).toBe(true);
    expect(textMentionsName("brightpathlogistics.ng home", "Bright Path Logistics")).toBe(true);
    expect(textMentionsName("Sunrise Bakery opening hours", "Bright Path Logistics")).toBe(false);
  });

  it("matches branch style names to the business's own pages", () => {
    expect(nameVariants("Brightpath Ibadan", ["Ibadan", "Oyo", "Nigeria"])).toContain("brightpath");
    expect(nameVariants("Okafor Haulage (Ibadan)")).toContain("okafor haulage");
    expect(nameVariants("Sunrise Couriers Express - Ibadan", ["Ibadan"])).toContain("sunrise couriers express");
    // A name made only of generic words is too weak to confirm anything.
    expect(nameVariants("Logistics Services Ibadan", ["Ibadan"])).not.toContain("logistics services");
    expect(textMentionsBusiness("Welcome to Brightpath, your cargo partner", "Brightpath Ibadan", ["Ibadan"])).toBe(true);
    expect(textMentionsBusiness("Welcome to Sunrise Bakery", "Brightpath Ibadan", ["Ibadan"])).toBe(false);
  });

  it("reads websites and ignores platform pages", () => {
    expect(domainOf("https://www.brightpathlogistics.ng/about")).toBe("brightpathlogistics.ng");
    expect(domainOf("brightpath.com.ng")).toBe("brightpath.com.ng");
    expect(domainOf("https://facebook.com/brightpath")).toBeUndefined();
    expect(domainOf("https://business.site.google.com/x")).toBeUndefined();
    expect(domainOf("not a site")).toBeUndefined();
    expect(normaliseWebsite("http://WWW.Example-Firm.co.uk/contact")).toBe("http://www.example-firm.co.uk/");
  });

  it("normalises Nigerian and UK phone numbers to international format", () => {
    expect(normalisePhone("0803 123 4567", "Nigeria")).toBe("+2348031234567");
    expect(normalisePhone("+234 (0) 803 123 4567", "Nigeria")).toBe("+2348031234567");
    expect(normalisePhone("2348031234567", "NG")).toBe("+2348031234567");
    expect(normalisePhone("020 7946 0000", "United Kingdom")).toBe("+442079460000");
    expect(normalisePhone("tel:+44 7700 900000")).toBe("+447700900000");
    expect(normalisePhone("0803 123 4567")).toBeUndefined();
    expect(normalisePhone("2024")).toBeUndefined();
  });

  it("normalises emails and drops placeholders and image names", () => {
    expect(normaliseEmail("mailto:Info@BrightPath.ng?subject=Hi")).toBe("info@brightpath.ng");
    expect(normaliseEmail("you@example.com")).toBeUndefined();
    expect(normaliseEmail("logo@2x.png")).toBeUndefined();
    expect(normaliseEmail("not an email")).toBeUndefined();
  });

  it("maps countries", () => {
    expect(countryIso("Nigeria")).toBe("NG");
    expect(countryIso("UK")).toBe("GB");
    expect(countryIso("Atlantis")).toBeUndefined();
  });

  it("hashes stably", () => {
    expect(suppressionHash("EMAIL", "A@b.ng")).toBe(suppressionHash("EMAIL", "a@b.ng"));
    expect(suppressionHash("EMAIL", "a@b.ng")).not.toBe(suppressionHash("PHONE", "a@b.ng"));
    expect(stableHash({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(stableHash({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });
});

describe("merging", () => {
  const base = { foundBy: "anthropic", sourceUrls: ["https://directory.example.ng/bright-path"] };

  it("drops results without a name or a source", () => {
    expect(cleanCandidate({ ...base, name: "" })).toBeNull();
    expect(cleanCandidate({ name: "Bright Path", foundBy: "anthropic", sourceUrls: [] })).toBeNull();
    expect(cleanCandidate({ name: "Bright Path", foundBy: "anthropic", sourceUrls: ["javascript:alert(1)"] })).toBeNull();
  });

  it("cleans a candidate", () => {
    const c = cleanCandidate({ ...base, name: " Bright  Path Logistics Ltd ", website: "www.brightpathlogistics.ng", phone: "0803 123 4567", email: "INFO@brightpathlogistics.ng", city: "Ibadan", country: "nigeria" });
    expect(c).toMatchObject({ name: "Bright Path Logistics Ltd", normalisedName: "bright path logistics", domain: "brightpathlogistics.ng", phone: "+2348031234567", email: "info@brightpathlogistics.ng", country: "Nigeria", listsNoWebsite: false });
  });

  const targets: MatchTarget[] = [
    { id: "a", normalisedName: "bright path logistics", domain: "brightpathlogistics.ng", phones: [], city: "Ibadan" },
    { id: "b", normalisedName: "sunrise bakery", phones: ["+2348099990000"], city: "Ibadan" },
    { id: "c", normalisedName: "okafor and sons", phones: [], googlePlaceId: "place-1", city: "Lagos" },
  ];

  it("matches on domain, phone and place id", () => {
    expect(findMatch({ normalisedName: "something else", domain: "brightpathlogistics.ng" }, targets)).toBe("a");
    expect(findMatch({ normalisedName: "sunrise", phone: "+2348099990000" }, targets)).toBe("b");
    expect(findMatch({ normalisedName: "x", googlePlaceId: "place-1" }, targets)).toBe("c");
  });

  it("matches close names only in the same city", () => {
    expect(findMatch({ normalisedName: "brightpath logistics", city: "Ibadan" }, targets)).toBe("a");
    expect(findMatch({ normalisedName: "brightpath logistics", city: "Kano" }, targets)).toBeUndefined();
    expect(findMatch({ normalisedName: "the sunrise bakery", city: "ibadan" }, targets)).toBe("b");
    // Close but not close enough: kept apart rather than wrongly merged.
    expect(findMatch({ normalisedName: "sunrise bakeries", city: "Ibadan" }, targets)).toBeUndefined();
  });

  it("never merges two different known domains", () => {
    expect(findMatch({ normalisedName: "bright path logistics", domain: "other.ng", city: "Ibadan" }, targets)).toBeUndefined();
  });

  it("dedupes inside one batch and keeps the details of both", () => {
    const a = cleanCandidate({ ...base, name: "Bright Path Logistics", city: "Ibadan", phone: "+2348031234567" });
    const b = cleanCandidate({ ...base, name: "BrightPath Logistics Ltd", city: "Ibadan", website: "brightpathlogistics.ng", sourceUrls: ["https://news.example.ng/x"] });
    const out = dedupeCandidates([a!, b!]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ domain: "brightpathlogistics.ng", phone: "+2348031234567" });
    expect(out[0]?.sourceUrls).toHaveLength(2);
  });
});

const weights: ScoringWeights = { websiteNeed: 30, industryFit: 20, size: 15, reachability: 15, decisionMaker: 10, hiring: 10 };

describe("lead score", () => {
  it("scores a reachable logistics firm with no website high", () => {
    const s = baseScore(
      {
        websiteStatus: "NO_WEBSITE_FOUND",
        industry: "Logistics",
        hiringSignals: ["We are hiring a software developer"],
        contacts: [
          { kind: "EMAIL", verification: "VERIFIED" },
          { kind: "PHONE", verification: "VERIFIED" },
          { kind: "WHATSAPP", verification: "VERIFIED" },
        ],
        people: [{ title: "Managing Director", verification: "VERIFIED" }],
        sizeHint: "3 branches",
      },
      weights,
      ["Logistics", "Retail"],
    );
    expect(s.breakdown.websiteNeed).toBe(30);
    expect(s.breakdown.industryFit).toBe(20);
    expect(s.breakdown.reachability).toBe(15);
    expect(s.breakdown.hiring).toBe(10);
    expect(s.value).toBeGreaterThanOrEqual(80);
    expect(scoreBand(s.value)).toBe("HIGH_PRIORITY");
    expect(s.explanations.websiteNeed).toMatch(/No website/);
  });

  it("scores an unknown business with a working site low", () => {
    const s = baseScore({ websiteStatus: "HAS_WEBSITE", hiringSignals: [], contacts: [], people: [] }, weights, ["Logistics"]);
    expect(s.value).toBeLessThan(40);
    expect(scoreBand(s.value)).toBe("LOW_PRIORITY");
  });

  it("normalises when weights do not add up to 100", () => {
    const s = baseScore({ websiteStatus: "NO_WEBSITE_FOUND", hiringSignals: [], contacts: [], people: [] }, { websiteNeed: 10, industryFit: 0, size: 0, reachability: 0, decisionMaker: 0, hiring: 0 }, []);
    expect(s.value).toBe(100);
  });

  it("matches industries from the description", () => {
    expect(industryMatch({ industry: "Haulage and Logistics" }, ["Logistics"])).toBe("match");
    expect(industryMatch({ about: "We run three pharmacies" }, ["Pharmacy"])).toBe("match");
    expect(industryMatch({ industry: "Fashion" }, ["Logistics"])).toBe("none");
    expect(industryMatch({}, ["Logistics"])).toBe("unknown");
  });

  it("keeps the AI adjustment within 10 points and only with cited evidence", () => {
    const ids = new Set(["E1", "E2"]);
    expect(applyAiAdjustment(50, 25, [{ text: "Old site", evidence: ["E1"] }], ids)).toMatchObject({ value: 60, aiAdjustment: 10 });
    expect(applyAiAdjustment(50, -30, [{ text: "Closed", evidence: ["E2"] }], ids)).toMatchObject({ value: 40, aiAdjustment: -10 });
    expect(applyAiAdjustment(50, 8, [{ text: "Invented", evidence: ["E9"] }], ids)).toMatchObject({ value: 50, aiAdjustment: 0, reasons: [] });
    expect(applyAiAdjustment(50, 8, [{ text: "No evidence", evidence: [] }], ids).aiAdjustment).toBe(0);
    expect(applyAiAdjustment(95, 10, [{ text: "x", evidence: ["E1"] }], ids).value).toBe(100);
  });
});

const now = new Date("2026-11-17T12:00:00Z");
const okCheck = (over: Partial<SiteCheck> = {}): SiteCheck => ({ requestedUrl: "https://a.ng/", finalUrl: "https://a.ng/", ok: true, https: true, redirects: 0, hasViewport: true, copyrightYear: 2026, technology: [], legacyTechnology: [], nameMatches: true, checkedAt: now, ...over });

describe("website status rules", () => {
  it("needs two sources before saying no website exists", () => {
    expect(decideWebsiteStatus({ hasWebsite: false, previousFailures: [], noWebsiteSources: ["Google Maps"], now }).status).toBe("WEBSITE_STATUS_UNKNOWN");
    expect(decideWebsiteStatus({ hasWebsite: false, previousFailures: [], noWebsiteSources: ["Google Maps", "Google Maps"], now }).status).toBe("WEBSITE_STATUS_UNKNOWN");
    const d = decideWebsiteStatus({ hasWebsite: false, previousFailures: [], noWebsiteSources: ["Google Maps", "Claude"], now });
    expect(d.status).toBe("NO_WEBSITE_FOUND");
    expect(d.evidence).toHaveLength(2);
  });

  it("calls a working modern site HAS_WEBSITE", () => {
    expect(decideWebsiteStatus({ hasWebsite: true, check: okCheck(), previousFailures: [], noWebsiteSources: [], now }).status).toBe("HAS_WEBSITE");
  });

  it("needs two outdated signals", () => {
    expect(decideWebsiteStatus({ hasWebsite: true, check: okCheck({ hasViewport: false }), previousFailures: [], noWebsiteSources: [], now }).status).toBe("HAS_WEBSITE");
    const d = decideWebsiteStatus({ hasWebsite: true, check: okCheck({ hasViewport: false, copyrightYear: 2019 }), previousFailures: [], noWebsiteSources: [], now });
    expect(d.status).toBe("OUTDATED_WEBSITE");
    expect(d.evidence.join(" ")).toMatch(/2019/);
    expect(decideWebsiteStatus({ hasWebsite: true, check: okCheck({ https: false }), pagespeedPerformance: 25, previousFailures: [], noWebsiteSources: [], now }).status).toBe("OUTDATED_WEBSITE");
    expect(outdatedSignals(okCheck({ legacyTechnology: ["jQuery 1.12.4"] }), now)).toHaveLength(1);
  });

  it("uses the crawler's own speed check when there is no PageSpeed score", () => {
    const speed = { responseMs: 7200, htmlKb: 90, compressed: false, scripts: 30, styles: 8, images: 40, sampled: 10, sampledKb: 2400, estimatedPageKb: 7000 };
    const fast = { ...speed, responseMs: 900, estimatedPageKb: 1200 };
    expect(outdatedSignals(okCheck({ speed }), now).join(" ")).toMatch(/slow or heavy.*7\.2 seconds.*6\.8 MB/);
    expect(outdatedSignals(okCheck({ speed: fast }), now)).toHaveLength(0);
    // A real PageSpeed score takes priority over the rough check.
    expect(outdatedSignals(okCheck({ speed }), now, 80)).toHaveLength(0);
    expect(decideWebsiteStatus({ hasWebsite: true, check: okCheck({ speed, hasViewport: false }), previousFailures: [], noWebsiteSources: [], now }).status).toBe("OUTDATED_WEBSITE");
  });

  it("does not trust a site that never mentions the business", () => {
    expect(decideWebsiteStatus({ hasWebsite: true, check: okCheck({ nameMatches: false }), previousFailures: [], noWebsiteSources: [], now }).status).toBe("WEBSITE_STATUS_UNKNOWN");
  });

  it("calls a site broken only after two failures an hour apart", () => {
    const first = decideWebsiteStatus({ hasWebsite: true, check: okCheck({ ok: false, failure: "dns" }), previousFailures: [], noWebsiteSources: [], now });
    expect(first.status).toBe("WEBSITE_STATUS_UNKNOWN");
    expect(first.recheckAt).toBeDefined();
    expect(first.failures).toHaveLength(1);
    const soon = decideWebsiteStatus({ hasWebsite: true, check: okCheck({ ok: false, failure: "dns" }), previousFailures: first.failures, noWebsiteSources: [], now: new Date(now.getTime() + 10 * 60_000) });
    expect(soon.status).toBe("WEBSITE_STATUS_UNKNOWN");
    const later = decideWebsiteStatus({ hasWebsite: true, check: okCheck({ ok: false, failure: "tls" }), previousFailures: first.failures, noWebsiteSources: [], now: new Date(now.getTime() + 66 * 60_000) });
    expect(later.status).toBe("BROKEN_WEBSITE");
    expect(later.evidence).toHaveLength(2);
  });

  it("does not count being turned away as broken", () => {
    const d = decideWebsiteStatus({ hasWebsite: true, check: okCheck({ ok: false, failure: "blocked", httpStatus: 403 }), previousFailures: [{ at: new Date(now.getTime() - 2 * 3600_000), reason: "x" }], noWebsiteSources: [], now });
    expect(d.status).toBe("WEBSITE_STATUS_UNKNOWN");
    expect(d.recheckAt).toBeUndefined();
  });

  it("clears failures once the site works", () => {
    expect(decideWebsiteStatus({ hasWebsite: true, check: okCheck(), previousFailures: [{ at: now, reason: "x" }], noWebsiteSources: [], now }).failures).toEqual([]);
  });
});

describe("crawler address rules", () => {
  it("blocks private, loopback, link local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.5", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.1.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "224.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "102.89.1.1", "2606:4700::1111"]) expect(isBlockedIp(ip), ip).toBe(false);
  });

  it("refuses bad schemes, ports, credentials and internal names", () => {
    expect(checkPublicUrl("https://brightpath.ng/").ok).toBe(true);
    expect(checkPublicUrl("ftp://brightpath.ng/").ok).toBe(false);
    expect(checkPublicUrl("https://brightpath.ng:8080/").ok).toBe(false);
    expect(checkPublicUrl("https://user:pw@brightpath.ng/").ok).toBe(false);
    expect(checkPublicUrl("http://localhost/").ok).toBe(false);
    expect(checkPublicUrl("http://printer.local/").ok).toBe(false);
    expect(checkPublicUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(checkPublicUrl("http://[::1]/").ok).toBe(false);
    expect(checkPublicUrl("http://intranet/").ok).toBe(false);
  });
});

describe("evidence pack", () => {
  const prospect = {
    name: "Bright Path Logistics",
    location: { city: "Ibadan", country: "Nigeria" },
    industry: "Logistics",
    website: { url: "https://brightpathlogistics.ng/", status: "OUTDATED_WEBSITE" as const, evidence: ["No mobile viewport"], pagespeed: { performance: 22 } },
    contacts: [{ kind: "EMAIL", value: "info@brightpathlogistics.ng", verification: "VERIFIED" as const, sourceUrl: "https://brightpathlogistics.ng/contact" }],
    people: [{ name: "Ada Obi", title: "Managing Director", verification: "VERIFIED" as const }],
    socials: [],
    hiringSignals: [],
    technologyHints: ["jQuery 1.12.4"],
    foundBy: [{ provider: "anthropic", sourceUrls: ["https://directory.example.ng/x"], evidence: "Listed as a courier", confirmedUrls: ["https://directory.example.ng/x"] }],
  };

  it("numbers every item and carries its source", () => {
    const items = buildEvidence(prospect);
    expect(items[0]).toMatchObject({ id: "E1", text: "Business name is Bright Path Logistics." });
    expect(items.map((i) => i.id)).toEqual(items.map((_, i) => `E${i + 1}`));
    expect(items.some((i) => i.text.includes("info@brightpathlogistics.ng") && i.source === "https://brightpathlogistics.ng/contact")).toBe(true);
    expect(items.some((i) => i.text.includes("Performance 22"))).toBe(true);
  });

  it("changes its fingerprint when the research changes", () => {
    const a = evidenceHash(buildEvidence(prospect));
    expect(evidenceHash(buildEvidence({ ...prospect, industry: "Courier" }))).not.toBe(a);
    expect(evidenceHash(buildEvidence(prospect))).toBe(a);
  });
});
