import { AI_PROVIDERS, type AiProviderId, type ModelPrice, type ResearchSettings } from "@/types/research";
import type { BilledTokens } from "./types";

/**
 * Prices and defaults for lead research. Pure functions, no database access.
 *
 * Prices were read from the official provider pages on 9 November 2026 and are editable in
 * the admin (Settings, Lead research, Prices), so a price change never needs a code change.
 * Sources are listed in docs/LEAD_GENERATION_ENHANCEMENT_PLAN.md.
 */
export const DEFAULT_PRICES: ModelPrice[] = [
  { provider: "anthropic", model: "claude-opus-5-5", inputPerMTok: 4, outputPerMTok: 20 },
  { provider: "anthropic", model: "claude-sonnet-5-5", inputPerMTok: 2, outputPerMTok: 10 },
  // Haiku 5.5 costs more for prompts above 100,000 tokens. Lead research prompts stay far below that.
  { provider: "anthropic", model: "claude-haiku-5-5", inputPerMTok: 0.1, outputPerMTok: 0.5 },
  // Claude may answer from one of these when the requested model declines a request.
  { provider: "anthropic", model: "claude-opus-5", inputPerMTok: 5, outputPerMTok: 25 },
  { provider: "anthropic", model: "claude-opus-4-8", inputPerMTok: 5, outputPerMTok: 25 },
  { provider: "anthropic", model: "claude-sonnet-5", inputPerMTok: 2, outputPerMTok: 10 },
  // Gemini 3.8 Flash doubles to 1.50 and 7.50 on 1 January 2027.
  { provider: "gemini", model: "gemini-3.8-flash", inputPerMTok: 0.75, outputPerMTok: 3.75 },
  { provider: "gemini", model: "gemini-3.5-flash-lite", inputPerMTok: 0.3, outputPerMTok: 2.5 },
  { provider: "gemini", model: "gemini-3.1-flash-lite", inputPerMTok: 0.25, outputPerMTok: 1.5 },
  { provider: "openai", model: "gpt-6.1-sol", inputPerMTok: 2, outputPerMTok: 10 },
  { provider: "openai", model: "gpt-6.1-terra", inputPerMTok: 1, outputPerMTok: 5 },
  { provider: "openai", model: "gpt-6-luna", inputPerMTok: 0.1, outputPerMTok: 0.5 },
];

export const DEFAULT_RESEARCH_SETTINGS: ResearchSettings = {
  providers: {
    // The owner's Claude plan includes monthly API credit, so Claude is the main AI.
    anthropic: {
      enabled: true,
      allowFallback: false,
      monthlyCapUsd: 5,
      models: { research: "claude-opus-5-5", extract: "claude-opus-5-5", analyse: "claude-opus-5-5", write: "claude-opus-5-5" },
    },
    gemini: {
      enabled: false,
      allowFallback: false,
      monthlyCapUsd: 5,
      models: { research: "gemini-3.8-flash", extract: "gemini-3.1-flash-lite", analyse: "gemini-3.1-flash-lite", write: "gemini-3.1-flash-lite" },
    },
    openai: {
      enabled: false,
      allowFallback: false,
      monthlyCapUsd: 5,
      models: { research: "gpt-6.1-terra", extract: "gpt-6-luna", analyse: "gpt-6-luna", write: "gpt-6-luna" },
    },
  },
  providerOrder: ["anthropic", "gemini", "openai"],
  budget: { monthlyCapUsd: 15, perSearchCapUsd: 1 },
  prices: DEFAULT_PRICES,
  searchPricePer1000: { anthropic: 10, gemini: 14, openai: 10 },
  crawl: { depth: 2, pagesPerSite: 8, timeoutSeconds: 10, retries: 2, delaySeconds: 1, maxPageKb: 2048, pagesPerDay: 500 },
  scoring: { websiteNeed: 30, industryFit: 20, size: 15, reachability: 15, decisionMaker: 10, hiring: 10 },
  // The sectors on the public Solutions page, plus the kinds of business that most often need a site or system.
  targeting: {
    industries: ["Education", "Healthcare", "Pharmacy", "Retail", "Distribution", "Logistics", "Hospitality", "Hotel", "Restaurant", "Real estate", "Finance", "Microfinance", "Insurance", "Manufacturing", "Professional services", "Legal", "Accounting", "Construction", "Agriculture"],
    countries: ["Nigeria", "United Kingdom"],
  },
  retentionMonths: 12,
  placesMonthlyLimit: 1000,
};

const intIn = (v: unknown, min: number, max: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : fallback);
const words = (v: unknown, fallback: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : fallback);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const amount = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback);
const modelName = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim() : fallback);

/**
 * Lays the stored settings over the defaults. Anything missing or malformed falls back to
 * its default, so a setting added in a later release needs no database migration.
 */
export function mergeResearchSettings(stored: unknown): ResearchSettings {
  const d = DEFAULT_RESEARCH_SETTINGS;
  const s = isObj(stored) ? stored : {};
  const sp = isObj(s.providers) ? s.providers : {};

  const providers = {} as ResearchSettings["providers"];
  for (const id of AI_PROVIDERS) {
    const base = d.providers[id];
    const got = isObj(sp[id]) ? (sp[id] as Record<string, unknown>) : {};
    const gm = isObj(got.models) ? got.models : {};
    providers[id] = {
      enabled: typeof got.enabled === "boolean" ? got.enabled : base.enabled,
      allowFallback: typeof got.allowFallback === "boolean" ? got.allowFallback : base.allowFallback,
      monthlyCapUsd: amount(got.monthlyCapUsd, base.monthlyCapUsd),
      models: {
        research: modelName(gm.research, base.models.research),
        extract: modelName(gm.extract, base.models.extract),
        analyse: modelName(gm.analyse, base.models.analyse),
        write: modelName(gm.write, base.models.write),
      },
    };
  }

  const order = Array.isArray(s.providerOrder) ? s.providerOrder.filter((p): p is AiProviderId => (AI_PROVIDERS as readonly unknown[]).includes(p)) : [];
  const providerOrder = order.length === AI_PROVIDERS.length && new Set(order).size === AI_PROVIDERS.length ? order : d.providerOrder;

  const sb = isObj(s.budget) ? s.budget : {};
  const prices = Array.isArray(s.prices)
    ? s.prices.filter((p): p is ModelPrice => isObj(p) && (AI_PROVIDERS as readonly unknown[]).includes(p.provider) && typeof p.model === "string" && typeof p.inputPerMTok === "number" && typeof p.outputPerMTok === "number").map((p) => ({ provider: p.provider, model: p.model, inputPerMTok: p.inputPerMTok, outputPerMTok: p.outputPerMTok }))
    : [];
  const ss = isObj(s.searchPricePer1000) ? s.searchPricePer1000 : {};
  const sc = isObj(s.crawl) ? s.crawl : {};
  const sw = isObj(s.scoring) ? s.scoring : {};
  const st = isObj(s.targeting) ? s.targeting : {};
  const dc = d.crawl;
  const dw = d.scoring;

  return {
    crawl: {
      depth: intIn(sc.depth, 0, 4, dc.depth),
      pagesPerSite: intIn(sc.pagesPerSite, 1, 30, dc.pagesPerSite),
      timeoutSeconds: intIn(sc.timeoutSeconds, 3, 30, dc.timeoutSeconds),
      retries: intIn(sc.retries, 0, 4, dc.retries),
      delaySeconds: intIn(sc.delaySeconds, 1, 30, dc.delaySeconds),
      maxPageKb: intIn(sc.maxPageKb, 100, 10240, dc.maxPageKb),
      pagesPerDay: intIn(sc.pagesPerDay, 0, 20000, dc.pagesPerDay),
    },
    scoring: {
      websiteNeed: intIn(sw.websiteNeed, 0, 100, dw.websiteNeed),
      industryFit: intIn(sw.industryFit, 0, 100, dw.industryFit),
      size: intIn(sw.size, 0, 100, dw.size),
      reachability: intIn(sw.reachability, 0, 100, dw.reachability),
      decisionMaker: intIn(sw.decisionMaker, 0, 100, dw.decisionMaker),
      hiring: intIn(sw.hiring, 0, 100, dw.hiring),
    },
    targeting: { industries: words(st.industries, d.targeting.industries), countries: words(st.countries, d.targeting.countries) },
    retentionMonths: intIn(s.retentionMonths, 1, 60, d.retentionMonths),
    placesMonthlyLimit: intIn(s.placesMonthlyLimit, 0, 100000, d.placesMonthlyLimit),
    providers,
    providerOrder,
    budget: { monthlyCapUsd: amount(sb.monthlyCapUsd, d.budget.monthlyCapUsd), perSearchCapUsd: amount(sb.perSearchCapUsd, d.budget.perSearchCapUsd) },
    prices: prices.length ? prices : d.prices,
    searchPricePer1000: {
      anthropic: amount(ss.anthropic, d.searchPricePer1000.anthropic),
      gemini: amount(ss.gemini, d.searchPricePer1000.gemini),
      openai: amount(ss.openai, d.searchPricePer1000.openai),
    },
  };
}

export function findPrice(prices: ModelPrice[], provider: AiProviderId, model: string): ModelPrice | undefined {
  return prices.find((p) => p.provider === provider && p.model === model);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Cost of a finished call. A model without a price (possible when a fallback model served
 * the request) is billed at the provider's most expensive known price, so the ledger never
 * understates spend. unpriced lists those models so the caller can flag them.
 */
export function costUsd(input: { settings: Pick<ResearchSettings, "prices" | "searchPricePer1000">; provider: AiProviderId; billed: BilledTokens[]; searchCalls: number }): { costUsd: number; unpriced: string[] } {
  const own = input.settings.prices.filter((p) => p.provider === input.provider);
  const ceiling: ModelPrice | undefined = own.length
    ? { provider: input.provider, model: "", inputPerMTok: Math.max(...own.map((p) => p.inputPerMTok)), outputPerMTok: Math.max(...own.map((p) => p.outputPerMTok)) }
    : undefined;
  const unpriced: string[] = [];
  let total = 0;
  for (const b of input.billed) {
    let price = findPrice(input.settings.prices, input.provider, b.model);
    if (!price) {
      unpriced.push(b.model);
      price = ceiling;
    }
    if (!price) continue;
    total += (b.inputTokens / 1e6) * price.inputPerMTok + (b.outputTokens / 1e6) * price.outputPerMTok;
  }
  total += (input.searchCalls / 1000) * (input.settings.searchPricePer1000[input.provider] ?? 0);
  return { costUsd: round6(total), unpriced };
}

/** Rough token count for text that has not been sent yet. Errs on the high side. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

/**
 * Search results come back as input tokens. This is the allowance per search for estimates.
 * One Claude web search measured about 18,000 input tokens on 17 November 2026.
 */
export const TOKENS_PER_SEARCH_ESTIMATE = 20000;

/**
 * Upper estimate of what a call may cost, used by the budget guard before the call is made.
 * It assumes the full output allowance and every allowed search are used. Returns null when
 * the model has no price, because a call that cannot be priced cannot be capped.
 */
export function estimateCostUsd(input: { settings: Pick<ResearchSettings, "prices" | "searchPricePer1000">; provider: AiProviderId; model: string; promptText: string; maxOutputTokens: number; maxSearches: number }): number | null {
  const price = findPrice(input.settings.prices, input.provider, input.model);
  if (!price) return null;
  const inputTokens = estimateTokens(input.promptText) + input.maxSearches * TOKENS_PER_SEARCH_ESTIMATE;
  const tokens = (inputTokens / 1e6) * price.inputPerMTok + (input.maxOutputTokens / 1e6) * price.outputPerMTok;
  const searches = (input.maxSearches / 1000) * (input.settings.searchPricePer1000[input.provider] ?? 0);
  return round6(tokens + searches);
}

/** Parses the admin price list, one "provider, model, input price, output price" per line. */
export function parsePriceLines(text: string): { prices: ModelPrice[]; errors: string[] } {
  const prices: ModelPrice[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(",").map((s) => s.trim());
    const [provider, model, inputRaw, outputRaw] = parts;
    const inputPerMTok = Number(inputRaw);
    const outputPerMTok = Number(outputRaw);
    if (parts.length !== 4 || !provider || !model) return void errors.push(`Line ${i + 1} needs four values separated by commas.`);
    if (!(AI_PROVIDERS as readonly string[]).includes(provider)) return void errors.push(`Line ${i + 1} has an unknown provider. Use ${AI_PROVIDERS.join(", ")}.`);
    if (!/^[A-Za-z0-9._:-]{2,80}$/.test(model)) return void errors.push(`Line ${i + 1} has an invalid model name.`);
    if (!Number.isFinite(inputPerMTok) || !Number.isFinite(outputPerMTok) || inputPerMTok < 0 || outputPerMTok < 0 || inputPerMTok > 1000 || outputPerMTok > 1000) return void errors.push(`Line ${i + 1} needs two prices between 0 and 1000.`);
    const key = `${provider}/${model}`;
    if (seen.has(key)) return void errors.push(`Line ${i + 1} repeats ${model}.`);
    seen.add(key);
    prices.push({ provider: provider as AiProviderId, model, inputPerMTok, outputPerMTok });
  });
  return { prices, errors };
}

export function formatPriceLines(prices: ModelPrice[]): string {
  return prices.map((p) => `${p.provider}, ${p.model}, ${p.inputPerMTok}, ${p.outputPerMTok}`).join("\n");
}
