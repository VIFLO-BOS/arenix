import { AI_PROVIDER_LABEL, type AiProviderId, type AiTask, type ResearchSettings } from "@/types/research";
import { checkBudget, type SpendSnapshot } from "./budget";
import { parseJsonAnswer, toProviderJsonSchema } from "./json";
import { costUsd, estimateCostUsd } from "./pricing";
import { AiError, type AiEffort, type GenerateOptions, type GenerateResult, type ProviderAdapter } from "./types";
import type { UsageEntry } from "./usage";

/**
 * The provider independent entry point for AI work. Feature code calls generate() with a
 * task and an answer schema and never talks to a provider directly.
 *
 * For each request it picks the provider and model from the settings, refuses the request
 * when a spending cap would be exceeded, asks for structured JSON, validates the answer
 * against the schema (one retry when it does not match), writes every attempt to the usage
 * ledger, and moves to the next provider only when the settings allow that provider as a
 * fallback.
 *
 * The dependencies are passed in so the rules can be unit tested without a database or a
 * network. src/server/ai/index.ts wires in the real ones.
 */
export interface GeneratorDeps {
  adapters: Record<AiProviderId, ProviderAdapter>;
  loadSettings: () => Promise<ResearchSettings>;
  loadSpend: (searchId?: string) => Promise<SpendSnapshot>;
  isPaused: (provider: AiProviderId) => Promise<boolean>;
  record: (entry: UsageEntry) => Promise<void>;
  now?: () => number;
}

/**
 * Output allowance, thinking depth and time limit per task. The allowance also bounds the
 * worst case cost used by the budget guard, so it is sized to the task and not left at the
 * maximum. It covers the model's thinking as well as the answer.
 */
export const TASK_DEFAULTS: Record<AiTask, { maxOutputTokens: number; effort: AiEffort; timeoutMs: number }> = {
  research: { maxOutputTokens: 12000, effort: "medium", timeoutMs: 120_000 },
  extract: { maxOutputTokens: 4000, effort: "low", timeoutMs: 45_000 },
  analyse: { maxOutputTokens: 8000, effort: "medium", timeoutMs: 90_000 },
  write: { maxOutputTokens: 8000, effort: "medium", timeoutMs: 90_000 },
};

/**
 * Providers to try, in order. The first enabled provider is the main one. Later providers
 * join only when they are enabled and marked as allowed fallbacks, so work never moves to
 * another provider, cheaper or dearer, without the owner having allowed it.
 */
export function providerChain(settings: ResearchSettings, forced?: AiProviderId): AiProviderId[] {
  if (forced) return [forced];
  const enabled = settings.providerOrder.filter((p) => settings.providers[p].enabled);
  const [main, ...rest] = enabled;
  return main ? [main, ...rest.filter((p) => settings.providers[p].allowFallback)] : [];
}

function combine(failures: AiError[]): AiError {
  const first = failures[0];
  if (!first) return new AiError("disabled", "No AI provider is switched on. Turn one on under Settings, Lead research.");
  if (failures.length === 1) return first;
  const message = failures.map((f) => `${f.provider ? AI_PROVIDER_LABEL[f.provider] : "AI"}: ${f.message}`).join(" ");
  return new AiError(first.kind, message, { provider: first.provider, status: first.status });
}

export function createGenerator(deps: GeneratorDeps) {
  const now = deps.now ?? (() => Date.now());

  return async function generate<T>(opts: GenerateOptions<T> & { ignoreEnabled?: boolean }): Promise<GenerateResult<T>> {
    const settings = await deps.loadSettings();
    const jsonSchema = toProviderJsonSchema(opts.schema);
    const defaults = TASK_DEFAULTS[opts.task];
    const maxOutputTokens = opts.maxOutputTokens ?? defaults.maxOutputTokens;
    const effort = opts.effort ?? defaults.effort;
    const timeoutMs = opts.timeoutMs ?? defaults.timeoutMs;
    const feature = opts.context?.feature ?? opts.task;
    const failures: AiError[] = [];

    for (const provider of providerChain(settings, opts.provider)) {
      const adapter = deps.adapters[provider];
      const label = AI_PROVIDER_LABEL[provider];
      const ps = settings.providers[provider];
      const model = ps.models[opts.task];

      // Gates. None of these makes a paid request, so none is written to the ledger.
      if (!ps.enabled && !opts.ignoreEnabled) {
        failures.push(new AiError("disabled", `${label} is switched off in the lead research settings.`, { provider }));
        continue;
      }
      if (!adapter.isConfigured()) {
        failures.push(new AiError("not_configured", `${label} has no API key configured.`, { provider }));
        continue;
      }
      const estimate = estimateCostUsd({ settings, provider, model, promptText: opts.system + opts.input, maxOutputTokens, maxSearches: opts.webSearch?.maxUses ?? 0 });
      if (estimate === null) {
        failures.push(new AiError("no_price", `No price is set for the model ${model}, so its cost cannot be capped. Add it to the price list.`, { provider }));
        continue;
      }
      const budget = checkBudget({ settings, spend: await deps.loadSpend(opts.context?.searchId), provider, estimateUsd: estimate });
      if (!budget.ok) {
        failures.push(new AiError("budget", budget.reason, { provider }));
        continue;
      }
      // A provider chosen by name is always tried. The pause only protects automatic routing.
      if (!opts.provider && (await deps.isPaused(provider))) {
        failures.push(new AiError("paused", `${label} is paused for a few minutes after repeated failures.`, { provider }));
        continue;
      }

      const base = { provider, feature, userId: opts.context?.userId, searchId: opts.context?.searchId, prospectId: opts.context?.prospectId };
      let failure: AiError | null = null;

      // Two attempts at most. The second happens only when the answer did not match the schema.
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (attempt > 1) {
          // The first attempt was paid for, so check the caps again before paying for another.
          const again = checkBudget({ settings, spend: await deps.loadSpend(opts.context?.searchId), provider, estimateUsd: estimate });
          if (!again.ok) {
            failure = new AiError("budget", again.reason, { provider });
            break;
          }
        }
        const started = now();
        try {
          const res = await adapter.generate({ model, system: opts.system, input: opts.input, schema: opts.schema, jsonSchema, schemaName: opts.schemaName, webSearch: opts.webSearch, maxOutputTokens, effort, timeoutMs });
          const durationMs = now() - started;
          const cost = costUsd({ settings, provider, billed: res.billed, searchCalls: res.searchCalls });
          const inputTokens = res.billed.reduce((n, b) => n + b.inputTokens, 0);
          const outputTokens = res.billed.reduce((n, b) => n + b.outputTokens, 0);
          const usage = { ...base, model: res.model, requestedModel: res.model === model ? undefined : model, inputTokens, outputTokens, searchCalls: res.searchCalls, costUsd: cost.costUsd, durationMs };

          let parsed: ReturnType<typeof opts.schema.safeParse>;
          try {
            parsed = opts.schema.safeParse(parseJsonAnswer(res.text));
          } catch (err) {
            parsed = { success: false, error: err } as ReturnType<typeof opts.schema.safeParse>;
          }
          if (parsed.success) {
            await deps.record({ ...usage, ok: true });
            return { data: parsed.data, provider, model: res.model, inputTokens, outputTokens, searchCalls: res.searchCalls, costUsd: cost.costUsd, sources: res.sources, durationMs };
          }
          // The request was paid for even though the answer is unusable.
          failure = new AiError("invalid_output", `${label} returned an answer that did not match the expected format.`, { provider });
          await deps.record({ ...usage, ok: false, errorKind: failure.kind, errorMessage: failure.message });
        } catch (err) {
          failure = err instanceof AiError ? err : new AiError("provider_error", err instanceof Error ? err.message : "Unknown error", { provider, cause: err });
          const partial = failure.partial;
          const cost = partial ? costUsd({ settings, provider, billed: partial.billed, searchCalls: partial.searchCalls }).costUsd : 0;
          await deps.record({
            ...base,
            model: partial?.model ?? model,
            inputTokens: partial?.billed.reduce((n, b) => n + b.inputTokens, 0) ?? 0,
            outputTokens: partial?.billed.reduce((n, b) => n + b.outputTokens, 0) ?? 0,
            searchCalls: partial?.searchCalls ?? 0,
            costUsd: cost,
            durationMs: now() - started,
            ok: false,
            errorKind: failure.kind,
            errorMessage: failure.message,
          });
          break; // only a format mismatch is retried on the same provider
        }
      }
      if (failure) failures.push(failure);
    }

    throw combine(failures);
  };
}
