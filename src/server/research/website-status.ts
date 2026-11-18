import type { WebsiteStatus } from "@/types/research";
import type { SiteCheck } from "./types";

/**
 * The website status rules from the plan (section 11). Pure, so every rule is unit tested.
 * Every decision comes with the evidence that led to it, and the evidence is stored.
 *
 *   HAS_WEBSITE              reachable and the content matches the business
 *   OUTDATED_WEBSITE         reachable and at least two outdated signals
 *   BROKEN_WEBSITE           a known domain failed twice, at least an hour apart
 *   NO_WEBSITE_FOUND         at least two independent sources list no website
 *   WEBSITE_STATUS_UNKNOWN   not enough evidence for any of the above
 */

/** Failures that mean the site itself is down, as opposed to the crawler being turned away. */
const BREAKING = new Set<NonNullable<SiteCheck["failure"]>>(["dns", "connection", "tls", "timeout", "http_error", "parked"]);

const FAILURE_TEXT: Record<NonNullable<SiteCheck["failure"]>, string> = {
  dns: "The domain does not resolve",
  connection: "The server could not be reached",
  tls: "The secure connection failed (certificate problem)",
  timeout: "The site did not answer in time",
  http_error: "The site answered with an error",
  blocked: "The site refused automated visits",
  robots: "The site's robots.txt asks crawlers not to read it",
  parked: "The domain shows a parked, default or suspended page",
  too_large: "The home page was too large to read",
  not_html: "The address does not serve a web page",
};

export const RECHECK_AFTER_MS = 65 * 60_000;
/** Limits for the crawler's own speed check, used when there is no PageSpeed score. */
export const SLOW_MS = 5000;
export const HEAVY_KB = 5 * 1024;
const BROKEN_GAP_MS = 60 * 60_000;
const FAILURE_MEMORY_MS = 14 * 24 * 60 * 60_000;

export interface StatusInput {
  /** True when a website address is known for the business. */
  hasWebsite: boolean;
  /** The latest visit, when one was made. */
  check?: SiteCheck;
  /** Earlier failed visits, oldest first. */
  previousFailures: { at: Date; reason: string }[];
  pagespeedPerformance?: number;
  /** Sources that were checked and list no website for the business. */
  noWebsiteSources: string[];
  now: Date;
}

export interface StatusDecision {
  status: WebsiteStatus;
  evidence: string[];
  /** Failures to store. Cleared once the site works. */
  failures: { at: Date; reason: string }[];
  /** When a second visit is needed before the site can be called broken. */
  recheckAt?: Date;
  /** The outdated signals found, also used by the score. */
  outdatedSignals: string[];
}

export function outdatedSignals(check: SiteCheck, now: Date, pagespeedPerformance?: number): string[] {
  const out: string[] = [];
  if (check.hasViewport === false) out.push("No mobile viewport, so the site is not built for phones");
  if (!check.https) out.push("The site does not use HTTPS");
  if (check.copyrightYear && check.copyrightYear < now.getUTCFullYear() - 3) out.push(`The copyright year is ${check.copyrightYear}`);
  if (pagespeedPerformance !== undefined && pagespeedPerformance < 40) out.push(`PageSpeed mobile performance is ${pagespeedPerformance} out of 100`);
  // Without PageSpeed, the crawler's own measurement stands in, with generous limits because it is taken from a server abroad.
  const sp = check.speed;
  if (pagespeedPerformance === undefined && sp && (sp.responseMs > SLOW_MS || sp.estimatedPageKb > HEAVY_KB)) {
    out.push(`The home page is slow or heavy (it took ${(sp.responseMs / 1000).toFixed(1)} seconds to arrive and weighs about ${(sp.estimatedPageKb / 1024).toFixed(1)} MB)`);
  }
  if (check.legacyTechnology.length) out.push(`Legacy technology in use (${check.legacyTechnology.join(", ")})`);
  return out;
}

export function decideWebsiteStatus(input: StatusInput): StatusDecision {
  const { check, now } = input;
  const sources = [...new Set(input.noWebsiteSources)];

  if (!input.hasWebsite) {
    if (sources.length >= 2) return { status: "NO_WEBSITE_FOUND", evidence: sources.map((s) => `${s} lists no website`), failures: [], outdatedSignals: [] };
    const evidence = sources.length === 1 ? [`${sources[0]} lists no website. A second source is needed before saying none exists.`] : ["No website address is known yet."];
    return { status: "WEBSITE_STATUS_UNKNOWN", evidence, failures: [], outdatedSignals: [] };
  }

  if (!check) return { status: "WEBSITE_STATUS_UNKNOWN", evidence: ["The website has not been checked yet."], failures: input.previousFailures, outdatedSignals: [] };

  const httpNote = check.httpStatus ? ` (HTTP ${check.httpStatus})` : "";

  if (!check.ok) {
    const failure = check.failure ?? "connection";
    const reason = `${FAILURE_TEXT[failure]}${httpNote}`;
    if (!BREAKING.has(failure)) {
      // Being turned away says nothing about whether the site works.
      return { status: "WEBSITE_STATUS_UNKNOWN", evidence: [reason], failures: input.previousFailures, outdatedSignals: [] };
    }
    const recent = input.previousFailures.filter((f) => now.getTime() - new Date(f.at).getTime() <= FAILURE_MEMORY_MS);
    const failures = [...recent, { at: now, reason }].slice(-5);
    const earlier = recent.find((f) => now.getTime() - new Date(f.at).getTime() >= BROKEN_GAP_MS);
    if (earlier) {
      return {
        status: "BROKEN_WEBSITE",
        evidence: [`${new Date(earlier.at).toISOString().slice(0, 16).replace("T", " ")} UTC. ${earlier.reason}`, `${now.toISOString().slice(0, 16).replace("T", " ")} UTC. ${reason}`],
        failures,
        outdatedSignals: [],
      };
    }
    return { status: "WEBSITE_STATUS_UNKNOWN", evidence: [`${reason}. The site is checked again in about an hour before it is called broken.`], failures, recheckAt: new Date(now.getTime() + RECHECK_AFTER_MS), outdatedSignals: [] };
  }

  const signals = outdatedSignals(check, now, input.pagespeedPerformance);
  if (check.nameMatches === false) {
    return { status: "WEBSITE_STATUS_UNKNOWN", evidence: ["The site loads, but its pages do not mention the business name, so it may not be this business's site."], failures: [], outdatedSignals: signals };
  }
  if (signals.length >= 2) return { status: "OUTDATED_WEBSITE", evidence: signals, failures: [], outdatedSignals: signals };
  const evidence = [`The site loads${check.https ? " over HTTPS" : ""} and mentions the business`];
  if (signals.length === 1) evidence.push(`One outdated signal was found, and two are needed to call it outdated. ${signals[0]}`);
  return { status: "HAS_WEBSITE", evidence, failures: [], outdatedSignals: signals };
}
