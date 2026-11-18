import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AiProviderId, ResearchSettings } from "@/types/research";
import type { SpendSnapshot } from "@/server/ai/budget";
import { createGenerator, providerChain } from "@/server/ai/generate";
import { DEFAULT_RESEARCH_SETTINGS } from "@/server/ai/pricing";
import { AiError, type ProviderAdapter, type ProviderRequest, type ProviderResponse } from "@/server/ai/types";
import type { UsageEntry } from "@/server/ai/usage";

const Answer = z.object({ name: z.string(), website: z.string().nullable() });
const GOOD = JSON.stringify({ name: "Acme Logistics", website: null });

type Impl = (req: ProviderRequest) => Promise<ProviderResponse>;
const reply = (model: string, text = GOOD, extra: Partial<ProviderResponse> = {}): ProviderResponse => ({ text, model, billed: [{ model, inputTokens: 1000, outputTokens: 100 }], searchCalls: 0, sources: [], ...extra });

function harness(over: { settings?: (s: ResearchSettings) => void; spend?: SpendSnapshot; paused?: AiProviderId[]; configured?: Partial<Record<AiProviderId, boolean>>; impl?: Partial<Record<AiProviderId, Impl>> } = {}) {
  const settings = structuredClone(DEFAULT_RESEARCH_SETTINGS);
  over.settings?.(settings);
  const calls: { provider: AiProviderId; req: ProviderRequest }[] = [];
  const records: UsageEntry[] = [];
  const adapter = (id: AiProviderId): ProviderAdapter => ({
    id,
    isConfigured: () => over.configured?.[id] ?? true,
    generate: async (req) => {
      calls.push({ provider: id, req });
      return (over.impl?.[id] ?? (async (r) => reply(r.model)))(req);
    },
  });
  const generate = createGenerator({
    adapters: { anthropic: adapter("anthropic"), gemini: adapter("gemini"), openai: adapter("openai") },
    loadSettings: async () => settings,
    loadSpend: async () => over.spend ?? { monthTotalUsd: 0, monthByProvider: {} },
    isPaused: async (p) => (over.paused ?? []).includes(p),
    record: async (e) => void records.push(e),
  });
  const ask = (extra: Record<string, unknown> = {}) => generate({ task: "analyse", system: "You analyse businesses.", input: "Acme Logistics, Lagos", schema: Answer, schemaName: "answer", ...extra });
  return { ask, calls, records, settings };
}

const kindOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "no error";
  } catch (err) {
    return err instanceof AiError ? err.kind : `other ${String(err)}`;
  }
};

describe("providerChain", () => {
  const s = () => structuredClone(DEFAULT_RESEARCH_SETTINGS);
  it("uses only the main provider when no fallback is allowed", () => {
    const settings = s();
    settings.providers.gemini.enabled = true;
    expect(providerChain(settings)).toEqual(["anthropic"]);
  });
  it("adds later providers only when they are enabled and allowed as fallbacks", () => {
    const settings = s();
    settings.providers.gemini.enabled = true;
    settings.providers.gemini.allowFallback = true;
    settings.providers.openai.allowFallback = true; // allowed but switched off
    expect(providerChain(settings)).toEqual(["anthropic", "gemini"]);
  });
  it("follows the saved order and skips providers that are off", () => {
    const settings = s();
    settings.providerOrder = ["openai", "gemini", "anthropic"];
    settings.providers.gemini.enabled = true;
    expect(providerChain(settings)).toEqual(["gemini"]);
  });
  it("is empty when everything is off, and a single provider when one is named", () => {
    const settings = s();
    settings.providers.anthropic.enabled = false;
    expect(providerChain(settings)).toEqual([]);
    expect(providerChain(settings, "openai")).toEqual(["openai"]);
  });
});

describe("generate", () => {
  it("runs the task on the main provider with the model from the settings and records the cost", async () => {
    const h = harness();
    const out = await h.ask({ context: { userId: "u1" } });
    expect(out.data).toEqual({ name: "Acme Logistics", website: null });
    expect(out.provider).toBe("anthropic");
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]?.req.model).toBe("claude-opus-5-5");
    expect(h.calls[0]?.req.jsonSchema.additionalProperties).toBe(false);
    // 1000 input tokens at 4 per million plus 100 output tokens at 20 per million
    expect(out.costUsd).toBeCloseTo(0.006, 6);
    expect(h.records).toHaveLength(1);
    expect(h.records[0]).toMatchObject({ provider: "anthropic", model: "claude-opus-5-5", feature: "analyse", ok: true, inputTokens: 1000, outputTokens: 100, userId: "u1" });
    expect(h.records[0]?.requestedModel).toBeUndefined();
  });

  it("does not move to another provider that is not allowed as a fallback", async () => {
    const h = harness({
      settings: (s) => void (s.providers.gemini.enabled = true),
      impl: { anthropic: async () => Promise.reject(new AiError("rate_limited", "busy", { provider: "anthropic" })) },
    });
    expect(await kindOf(h.ask())).toBe("rate_limited");
    expect(h.calls.map((c) => c.provider)).toEqual(["anthropic"]);
  });

  it("moves to an allowed fallback when the main provider fails, and records both attempts", async () => {
    const h = harness({
      settings: (s) => {
        s.providers.gemini.enabled = true;
        s.providers.gemini.allowFallback = true;
      },
      impl: { anthropic: async () => Promise.reject(new AiError("provider_error", "down", { provider: "anthropic" })) },
    });
    const out = await h.ask();
    expect(out.provider).toBe("gemini");
    expect(out.model).toBe("gemini-3.1-flash-lite");
    expect(h.records.map((r) => [r.provider, r.ok, r.errorKind])).toEqual([
      ["anthropic", false, "provider_error"],
      ["gemini", true, undefined],
    ]);
  });

  it("refuses a request that would pass the monthly budget, without calling the provider", async () => {
    const h = harness({ spend: { monthTotalUsd: 14.99, monthByProvider: { anthropic: 1 } } });
    expect(await kindOf(h.ask())).toBe("budget");
    expect(h.calls).toHaveLength(0);
    expect(h.records).toHaveLength(0);
  });

  it("uses an allowed fallback when the main provider's own budget is used up", async () => {
    const h = harness({
      settings: (s) => {
        s.providers.openai.enabled = true;
        s.providers.openai.allowFallback = true;
      },
      spend: { monthTotalUsd: 5, monthByProvider: { anthropic: 5 } },
    });
    const out = await h.ask();
    expect(out.provider).toBe("openai");
    expect(h.calls.map((c) => c.provider)).toEqual(["openai"]);
  });

  it("applies the limit for one search when the request belongs to a search", async () => {
    const h = harness({ spend: { monthTotalUsd: 1, monthByProvider: { anthropic: 1 }, searchUsd: 0.99 } });
    expect(await kindOf(h.ask({ context: { searchId: "64b7f0c2a1d2e3f4a5b6c7d8" } }))).toBe("budget");
  });

  it("retries once when the answer does not match the schema, and records the wasted attempt", async () => {
    let n = 0;
    const h = harness({ impl: { anthropic: async (r) => reply(r.model, ++n === 1 ? '{"name": 42}' : GOOD) } });
    const out = await h.ask();
    expect(out.data.name).toBe("Acme Logistics");
    expect(h.calls).toHaveLength(2);
    expect(h.records.map((r) => [r.ok, r.errorKind])).toEqual([
      [false, "invalid_output"],
      [true, undefined],
    ]);
    expect(h.records[0]?.costUsd).toBeCloseTo(0.006, 6);
  });

  it("gives up after two answers that do not match the schema", async () => {
    const h = harness({ impl: { anthropic: async (r) => reply(r.model, "not json at all") } });
    expect(await kindOf(h.ask())).toBe("invalid_output");
    expect(h.calls).toHaveLength(2);
    expect(h.records.every((r) => !r.ok)).toBe(true);
  });

  it("does not retry a provider error on the same provider", async () => {
    const h = harness({ impl: { anthropic: async () => Promise.reject(new AiError("auth", "bad key", { provider: "anthropic" })) } });
    expect(await kindOf(h.ask())).toBe("auth");
    expect(h.calls).toHaveLength(1);
  });

  it("records what a refused request still cost", async () => {
    const h = harness({
      impl: { anthropic: async (r) => Promise.reject(new AiError("refused", "declined", { provider: "anthropic", partial: { model: r.model, billed: [{ model: r.model, inputTokens: 500, outputTokens: 0 }], searchCalls: 1 } })) },
    });
    expect(await kindOf(h.ask())).toBe("refused");
    expect(h.records[0]).toMatchObject({ ok: false, errorKind: "refused", inputTokens: 500, searchCalls: 1 });
    expect(h.records[0]?.costUsd).toBeCloseTo(0.002 + 0.01, 6);
  });

  it("records the model that answered when a fallback model served the request", async () => {
    const h = harness({ impl: { anthropic: async () => reply("claude-opus-4-8") } });
    const out = await h.ask();
    expect(out.model).toBe("claude-opus-4-8");
    expect(h.records[0]).toMatchObject({ model: "claude-opus-4-8", requestedModel: "claude-opus-5-5" });
    // billed at the price of the model that answered, 5 and 25 per million
    expect(out.costUsd).toBeCloseTo(0.005 + 0.0025, 6);
  });

  it("runs only the named provider, and respects the off switch unless told otherwise", async () => {
    const h = harness();
    expect(await kindOf(h.ask({ provider: "gemini" }))).toBe("disabled");
    expect(h.calls).toHaveLength(0);
    const out = await h.ask({ provider: "gemini", ignoreEnabled: true });
    expect(out.provider).toBe("gemini");
    expect(h.calls.map((c) => c.provider)).toEqual(["gemini"]);
  });

  it("reports a provider with no API key without calling it", async () => {
    const h = harness({ configured: { anthropic: false } });
    expect(await kindOf(h.ask())).toBe("not_configured");
    expect(h.calls).toHaveLength(0);
  });

  it("refuses a model that has no price, because its cost could not be capped", async () => {
    const h = harness({ settings: (s) => void (s.providers.anthropic.models.analyse = "claude-unpriced") });
    expect(await kindOf(h.ask())).toBe("no_price");
    expect(h.calls).toHaveLength(0);
  });

  it("skips a paused provider in automatic routing but still tries it when it is named", async () => {
    const h = harness({ paused: ["anthropic"] });
    expect(await kindOf(h.ask())).toBe("paused");
    expect(h.calls).toHaveLength(0);
    const out = await h.ask({ provider: "anthropic" });
    expect(out.provider).toBe("anthropic");
  });

  it("says so when no provider is switched on", async () => {
    const h = harness({ settings: (s) => void (s.providers.anthropic.enabled = false) });
    expect(await kindOf(h.ask())).toBe("disabled");
  });

  it("rejects a schema with optional fields before making any request", async () => {
    const h = harness();
    await expect(h.ask({ schema: z.object({ name: z.string().optional() }) })).rejects.toThrow(/not strict/);
    expect(h.calls).toHaveLength(0);
  });

  it("passes the web search allowance through and counts searches in the cost", async () => {
    const h = harness({ impl: { anthropic: async (r) => reply(r.model, GOOD, { searchCalls: 2, sources: [{ url: "https://example.com", title: "Example" }] }) } });
    const out = await h.ask({ task: "research", webSearch: { maxUses: 3 } });
    expect(h.calls[0]?.req.webSearch).toEqual({ maxUses: 3 });
    expect(out.searchCalls).toBe(2);
    expect(out.sources).toHaveLength(1);
    expect(out.costUsd).toBeCloseTo(0.006 + 0.02, 6);
  });
});
