import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AI_PROVIDERS, AI_TASKS } from "@/types/research";
import { checkBudget, monthStartUtc } from "@/server/ai/budget";
import { parseJsonAnswer, strictSchemaProblems, toProviderJsonSchema } from "@/server/ai/json";
import { DEFAULT_RESEARCH_SETTINGS, costUsd, estimateCostUsd, findPrice, formatPriceLines, mergeResearchSettings, parsePriceLines } from "@/server/ai/pricing";

const settings = () => structuredClone(DEFAULT_RESEARCH_SETTINGS);

describe("default lead research settings", () => {
  it("has a price for every default model, so every default can be budget checked", () => {
    const s = settings();
    for (const p of AI_PROVIDERS) for (const t of AI_TASKS) expect(findPrice(s.prices, p, s.providers[p].models[t]), `${p} ${t}`).toBeDefined();
  });
  it("switches on Claude only and lists each provider once in the order", () => {
    const s = settings();
    expect(s.providers.anthropic.enabled).toBe(true);
    expect(s.providers.gemini.enabled).toBe(false);
    expect(s.providers.openai.enabled).toBe(false);
    expect([...s.providerOrder].sort()).toEqual([...AI_PROVIDERS].sort());
  });
});

describe("costUsd", () => {
  it("prices tokens per million and searches per thousand", () => {
    const out = costUsd({ settings: settings(), provider: "anthropic", billed: [{ model: "claude-opus-5-5", inputTokens: 1_000_000, outputTokens: 100_000 }], searchCalls: 3 });
    // 4.00 input + 2.00 output + 0.03 for three searches
    expect(out.costUsd).toBeCloseTo(6.03, 6);
    expect(out.unpriced).toEqual([]);
  });
  it("bills each model at its own price when a fallback model served part of the request", () => {
    const out = costUsd({
      settings: settings(),
      provider: "anthropic",
      billed: [
        { model: "claude-opus-5-5", inputTokens: 1000, outputTokens: 0 },
        { model: "claude-opus-4-8", inputTokens: 1000, outputTokens: 1000 },
      ],
      searchCalls: 0,
    });
    expect(out.costUsd).toBeCloseTo(0.004 + 0.005 + 0.025, 6);
  });
  it("bills an unknown model at the provider's highest price and reports it", () => {
    const out = costUsd({ settings: settings(), provider: "anthropic", billed: [{ model: "claude-future", inputTokens: 1_000_000, outputTokens: 1_000_000 }], searchCalls: 0 });
    expect(out.unpriced).toEqual(["claude-future"]);
    expect(out.costUsd).toBeCloseTo(5 + 25, 6);
  });
});

describe("estimateCostUsd", () => {
  it("assumes the full output allowance and every allowed search", () => {
    const s = settings();
    const plain = estimateCostUsd({ settings: s, provider: "anthropic", model: "claude-opus-5-5", promptText: "x".repeat(3000), maxOutputTokens: 1000, maxSearches: 0 });
    // 1000 prompt tokens at 4 per million plus 1000 output tokens at 20 per million
    expect(plain).toBeCloseTo(0.004 + 0.02, 6);
    const withSearch = estimateCostUsd({ settings: s, provider: "anthropic", model: "claude-opus-5-5", promptText: "", maxOutputTokens: 0, maxSearches: 2 });
    // Two searches at the measured allowance of 20,000 input tokens each, plus the search fee.
    expect(withSearch).toBeCloseTo((40000 / 1e6) * 4 + 0.02, 6);
  });
  it("returns null for a model with no price", () => {
    expect(estimateCostUsd({ settings: settings(), provider: "openai", model: "gpt-unknown", promptText: "hi", maxOutputTokens: 10, maxSearches: 0 })).toBeNull();
  });
});

describe("price list editing", () => {
  it("round trips the default prices", () => {
    const s = settings();
    const parsed = parsePriceLines(formatPriceLines(s.prices));
    expect(parsed.errors).toEqual([]);
    expect(parsed.prices).toEqual(s.prices);
  });
  it("reports bad lines without accepting them", () => {
    const parsed = parsePriceLines(["anthropic, claude-opus-5-5, 4, 20", "nobody, model-x, 1, 2", "gemini, gemini-3.8-flash, cheap, 3", "openai, gpt-6-luna, 0.1", "anthropic, claude-opus-5-5, 4, 20"].join("\n"));
    expect(parsed.prices).toHaveLength(1);
    expect(parsed.errors).toHaveLength(4);
  });
});

describe("mergeResearchSettings", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(mergeResearchSettings(null)).toEqual(DEFAULT_RESEARCH_SETTINGS);
  });
  it("keeps stored values and fills the gaps with defaults", () => {
    const merged = mergeResearchSettings({ providers: { gemini: { enabled: true, models: { research: "gemini-3.6-flash" } } }, budget: { monthlyCapUsd: 40 }, providerOrder: ["gemini", "anthropic", "openai"] });
    expect(merged.providers.gemini.enabled).toBe(true);
    expect(merged.providers.gemini.models.research).toBe("gemini-3.6-flash");
    expect(merged.providers.gemini.models.write).toBe(DEFAULT_RESEARCH_SETTINGS.providers.gemini.models.write);
    expect(merged.providers.anthropic).toEqual(DEFAULT_RESEARCH_SETTINGS.providers.anthropic);
    expect(merged.budget).toEqual({ monthlyCapUsd: 40, perSearchCapUsd: DEFAULT_RESEARCH_SETTINGS.budget.perSearchCapUsd });
    expect(merged.providerOrder).toEqual(["gemini", "anthropic", "openai"]);
  });
  it("ignores a malformed order and negative amounts", () => {
    const merged = mergeResearchSettings({ providerOrder: ["gemini", "gemini", "openai"], budget: { monthlyCapUsd: -5 } });
    expect(merged.providerOrder).toEqual(DEFAULT_RESEARCH_SETTINGS.providerOrder);
    expect(merged.budget.monthlyCapUsd).toBe(DEFAULT_RESEARCH_SETTINGS.budget.monthlyCapUsd);
  });
});

describe("checkBudget", () => {
  const base = () => ({ settings: settings(), provider: "anthropic" as const });
  it("allows a request that fits under every cap", () => {
    expect(checkBudget({ ...base(), spend: { monthTotalUsd: 1, monthByProvider: { anthropic: 1 } }, estimateUsd: 0.5 })).toEqual({ ok: true });
  });
  it("refuses when the monthly total would be passed", () => {
    const out = checkBudget({ ...base(), spend: { monthTotalUsd: 14.8, monthByProvider: { anthropic: 1 } }, estimateUsd: 0.5 });
    expect(out.ok).toBe(false);
    expect(out.ok ? "" : out.reason).toContain("monthly budget of $15.00");
  });
  it("refuses when the provider's own cap would be passed", () => {
    const out = checkBudget({ ...base(), spend: { monthTotalUsd: 4.9, monthByProvider: { anthropic: 4.9 } }, estimateUsd: 0.5 });
    expect(out.ok ? "" : out.reason).toContain("Claude budget of $5.00");
  });
  it("applies the limit for one search only when the request belongs to a search", () => {
    const spend = { monthTotalUsd: 1, monthByProvider: { anthropic: 1 } };
    expect(checkBudget({ ...base(), spend, estimateUsd: 0.5 }).ok).toBe(true);
    const out = checkBudget({ ...base(), spend: { ...spend, searchUsd: 0.8 }, estimateUsd: 0.5 });
    expect(out.ok ? "" : out.reason).toContain("limit of $1.00 for one search");
  });
  it("counts spend by other providers and data sources against the monthly total", () => {
    const out = checkBudget({ ...base(), spend: { monthTotalUsd: 14.9, monthByProvider: { gemini: 10, google_places: 4.9 } }, estimateUsd: 0.2 });
    expect(out.ok).toBe(false);
  });
  it("starts the month at midnight UTC on the first", () => {
    expect(monthStartUtc(new Date("2026-11-17T22:30:00Z")).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("answer schemas and JSON parsing", () => {
  it("accepts a strict schema and drops the dialect marker", () => {
    const schema = toProviderJsonSchema(z.object({ name: z.string(), website: z.string().nullable(), tags: z.array(z.object({ label: z.string() })) }));
    expect(schema.$schema).toBeUndefined();
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["name", "website", "tags"]);
  });
  it("rejects optional fields, including nested ones, and tells the developer what to do", () => {
    expect(() => toProviderJsonSchema(z.object({ name: z.string(), website: z.string().optional() }))).toThrow(/optional fields \(website\)/);
    expect(() => toProviderJsonSchema(z.object({ items: z.array(z.object({ a: z.string().optional() })) }))).toThrow(/Use nullable/);
  });
  it("rejects a schema that is not an object at the top", () => {
    expect(() => toProviderJsonSchema(z.array(z.string()))).toThrow(/object at the top level/);
  });
  it("flags objects that allow extra fields", () => {
    expect(strictSchemaProblems({ type: "object", properties: { a: { type: "string" } }, required: ["a"] })).toHaveLength(1);
  });
  it("parses clean JSON, fenced JSON and JSON inside a sentence", () => {
    expect(parseJsonAnswer('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonAnswer('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(parseJsonAnswer('Here is the result: {"ok":true} as requested.')).toEqual({ ok: true });
  });
  it("throws when there is no JSON", () => {
    expect(() => parseJsonAnswer("")).toThrow(/empty/);
    expect(() => parseJsonAnswer("I could not find anything.")).toThrow(/not valid JSON/);
  });
});
