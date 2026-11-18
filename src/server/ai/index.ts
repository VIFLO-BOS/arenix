import "server-only";
import { z } from "zod";
import { AI_PROVIDERS, AI_PROVIDER_LABEL, type AiProviderId } from "@/types/research";
import { createGenerator } from "./generate";
import { anthropicAdapter } from "./providers/anthropic";
import { geminiAdapter } from "./providers/gemini";
import { openAiAdapter } from "./providers/openai";
import { getResearchSettings } from "./settings";
import { AiError, type ProviderAdapter } from "./types";
import { isProviderPaused, loadSpend, recordUsage } from "./usage";

export { AiError } from "./types";
export type { GenerateOptions, GenerateResult, AiSource } from "./types";

export const adapters: Record<AiProviderId, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  openai: openAiAdapter,
};

/** The one way feature code asks an AI for something. See generate.ts for the rules it applies. */
export const generate = createGenerator({
  adapters,
  loadSettings: getResearchSettings,
  loadSpend,
  isPaused: isProviderPaused,
  record: recordUsage,
});

const TestAnswer = z.object({ ok: z.boolean(), note: z.string() });
const SearchTestAnswer = z.object({ found: z.boolean(), website: z.string().nullable() });

export interface ProviderTestResult {
  provider: AiProviderId;
  label: string;
  /** not_configured means there is no API key, so no request was made. */
  status: "ok" | "failed" | "not_configured";
  message: string;
  model?: string;
  costUsd?: number;
  durationMs?: number;
  searchCalls?: number;
}

/**
 * Sends one tiny real request to every provider that has an API key, and optionally one
 * request that makes a web search. Each request goes through generate(), so it is budget
 * checked and written to the usage ledger like any other.
 */
export async function testProviders(opts: { userId?: string; withWebSearch?: boolean }): Promise<ProviderTestResult[]> {
  const results: ProviderTestResult[] = [];
  for (const provider of AI_PROVIDERS) {
    const label = AI_PROVIDER_LABEL[provider];
    if (!adapters[provider].isConfigured()) {
      results.push({ provider, label, status: "not_configured", message: "No API key is configured." });
      continue;
    }
    try {
      const basic = await generate({
        task: "extract",
        provider,
        ignoreEnabled: true,
        system: "You are a connection test for a business research tool. Answer in the requested format.",
        input: "Confirm that the connection works. Set ok to true and write a note of five words or fewer.",
        schema: TestAnswer,
        schemaName: "connection_test",
        maxOutputTokens: 1000,
        effort: "low",
        timeoutMs: 45_000,
        context: { feature: "provider_test", userId: opts.userId },
      });
      let costUsd = basic.costUsd;
      let durationMs = basic.durationMs;
      let searchCalls = 0;
      let message = `Replied in ${(basic.durationMs / 1000).toFixed(1)} seconds.`;
      if (opts.withWebSearch) {
        const search = await generate({
          task: "research",
          provider,
          ignoreEnabled: true,
          system: "You are a connection test for a business research tool. Search the web and report only what the results show. Never guess.",
          input: "Find the official website of the Corporate Affairs Commission of Nigeria.",
          schema: SearchTestAnswer,
          schemaName: "web_search_test",
          webSearch: { maxUses: 2 },
          maxOutputTokens: 4000,
          effort: "medium",
          timeoutMs: 90_000,
          context: { feature: "provider_test", userId: opts.userId },
        });
        costUsd += search.costUsd;
        durationMs += search.durationMs;
        searchCalls = search.searchCalls;
        message += search.searchCalls > 0 ? ` Web search worked (${search.searchCalls} ${search.searchCalls === 1 ? "search" : "searches"}, ${search.sources.length} sources).` : " The web search request finished, but no search was made.";
      }
      results.push({ provider, label, status: "ok", message, model: basic.model, costUsd, durationMs, searchCalls });
    } catch (err) {
      const message = err instanceof AiError ? err.message : err instanceof Error ? err.message : "Unknown error";
      results.push({ provider, label, status: "failed", message });
    }
  }
  return results;
}
