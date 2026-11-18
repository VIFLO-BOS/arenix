import { AI_PROVIDER_LABEL, type AiProviderId, type ResearchSettings } from "@/types/research";

/**
 * The budget guard. Pure, so the rules are easy to test. generate() calls it before every
 * AI request with the worst case cost of that request, and refuses the request when any cap
 * would be exceeded. Nothing ever falls through to an unchecked call.
 *
 * Caps cover a calendar month in UTC. Several requests checked at the same moment can
 * together pass a cap by the cost of the requests in flight, which is cents at most.
 */
export interface SpendSnapshot {
  /** Estimated spend this month across every provider and data source. */
  monthTotalUsd: number;
  monthByProvider: Partial<Record<string, number>>;
  /** Spend so far on the business search this call belongs to, when it belongs to one. */
  searchUsd?: number;
}

export type BudgetDecision = { ok: true } | { ok: false; reason: string };

const usd = (n: number) => `$${n.toFixed(2)}`;

export function checkBudget(input: { settings: Pick<ResearchSettings, "budget" | "providers">; spend: SpendSnapshot; provider: AiProviderId; estimateUsd: number }): BudgetDecision {
  const { settings, spend, provider, estimateUsd } = input;
  const label = AI_PROVIDER_LABEL[provider];

  const totalCap = settings.budget.monthlyCapUsd;
  if (spend.monthTotalUsd + estimateUsd > totalCap) {
    return { ok: false, reason: `The monthly budget of ${usd(totalCap)} would be exceeded. ${usd(spend.monthTotalUsd)} is already used and this request may cost up to ${usd(estimateUsd)}.` };
  }

  const providerCap = settings.providers[provider].monthlyCapUsd;
  const providerSpend = spend.monthByProvider[provider] ?? 0;
  if (providerSpend + estimateUsd > providerCap) {
    return { ok: false, reason: `The ${label} budget of ${usd(providerCap)} for this month would be exceeded. ${usd(providerSpend)} is already used and this request may cost up to ${usd(estimateUsd)}.` };
  }

  if (spend.searchUsd !== undefined) {
    const searchCap = settings.budget.perSearchCapUsd;
    if (spend.searchUsd + estimateUsd > searchCap) {
      return { ok: false, reason: `The limit of ${usd(searchCap)} for one search would be exceeded. ${usd(spend.searchUsd)} is already used and this request may cost up to ${usd(estimateUsd)}.` };
    }
  }

  return { ok: true };
}

/** First moment of the calendar month in UTC. Budgets and the usage panel share this window. */
export function monthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
