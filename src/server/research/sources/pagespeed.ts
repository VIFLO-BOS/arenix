import type { PageSpeedScores } from "../types";
import { asNumber, asRecord, requestJson } from "./errors";

/**
 * PageSpeed Insights API v5. Runs Lighthouse on Google's servers and returns category
 * scores. A key is optional; without one Google applies a small shared quota, so production
 * calls should pass a key. A run often takes 15 to 40 seconds, hence the long default timeout.
 *
 * Parameters per developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed:
 * url, strategy (MOBILE or DESKTOP), category repeated (PERFORMANCE, ACCESSIBILITY,
 * BEST_PRACTICES, SEO) and key.
 */

export const PAGESPEED_SOURCE = "pagespeed";
export const PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const DEFAULT_TIMEOUT_MS = 60_000;
const CATEGORIES = ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"];

export interface PageSpeedOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  strategy?: "mobile" | "desktop";
}

/** Request URL for one run. The key goes last so logs that cut long URLs are less likely to show it. */
export function pageSpeedRequestUrl(url: string, opts: Pick<PageSpeedOptions, "apiKey" | "strategy"> = {}): string {
  const params = new URLSearchParams({ url, strategy: (opts.strategy ?? "mobile").toUpperCase() });
  for (const category of CATEGORIES) params.append("category", category);
  if (opts.apiKey) params.set("key", opts.apiKey);
  return `${PAGESPEED_URL}?${params.toString()}`;
}

/** Lighthouse gives scores from 0 to 1, or null when a category could not be scored. */
function score(categories: Record<string, unknown> | undefined, id: string): number | undefined {
  const value = asNumber(asRecord(categories?.[id])?.score);
  return value === undefined ? undefined : Math.round(Math.min(1, Math.max(0, value)) * 100);
}

/** Category scores from a runPagespeed response, 0 to 100. Missing categories stay undefined. */
export function mapPageSpeed(json: unknown): PageSpeedScores {
  const categories = asRecord(asRecord(asRecord(json)?.lighthouseResult)?.categories);
  const scores: PageSpeedScores = { fetchedAt: new Date() };
  const performance = score(categories, "performance");
  const accessibility = score(categories, "accessibility");
  const bestPractices = score(categories, "best-practices");
  const seo = score(categories, "seo");
  if (performance !== undefined) scores.performance = performance;
  if (accessibility !== undefined) scores.accessibility = accessibility;
  if (bestPractices !== undefined) scores.bestPractices = bestPractices;
  if (seo !== undefined) scores.seo = seo;
  return scores;
}

/** Runs PageSpeed Insights for one page. Throws SourceError; an unreachable page comes back as bad_request or provider_error from Google. */
export async function runPageSpeed(url: string, opts: PageSpeedOptions = {}): Promise<PageSpeedScores> {
  const json = await requestJson(PAGESPEED_SOURCE, pageSpeedRequestUrl(url, opts), { method: "GET", headers: { Accept: "application/json" } }, { fetchImpl: opts.fetchImpl, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  return mapPageSpeed(json);
}
