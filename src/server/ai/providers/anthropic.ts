import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { AiError, type AiSource, type BilledTokens, type ProviderAdapter, type ProviderRequest, type ProviderResponse } from "../types";

/**
 * Claude, through the official Anthropic SDK. The SDK retries rate limits and server
 * errors by itself (two retries with a growing pause), so there is no retry loop here.
 *
 * Verified against the live API on 17 November 2026: structured output works together with
 * the refusal fallback option and with web search, on Claude Opus 5.5 and Claude Haiku 5.5.
 */
type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BetaContentBlockParam = Anthropic.Beta.Messages.BetaContentBlockParam;

/**
 * When a model's safety checks decline a request, this beta lets the API rerun it on the
 * model Anthropic recommends for that case, inside the same call. The fallback model is
 * billed at its own price, which the usage ledger records.
 */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Models that take the refusal fallback option. Claude Haiku 5.5 has no server side fallback. */
export function supportsRefusalFallback(model: string): boolean {
  return /^claude-(opus-5(-5)?|sonnet-5-5|fable-5-[12]|mythos-5-[12])$/.test(model);
}

/**
 * The newer web search tool filters results with code before the model reads them. Claude
 * Haiku does not support it and uses the basic tool.
 */
function webSearchTool(model: string, maxUses: number) {
  const name = "web_search" as const;
  return /^claude-haiku-/.test(model) ? { type: "web_search_20250305" as const, name, max_uses: maxUses } : { type: "web_search_20260209" as const, name, max_uses: maxUses };
}

/** A long web search turn can pause. Each pause is resumed by sending the turn back, up to this many times. */
const MAX_TURNS = 4;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

function addBilled(into: Map<string, BilledTokens>, model: string, inputTokens: number, outputTokens: number) {
  const row = into.get(model) ?? { model, inputTokens: 0, outputTokens: 0 };
  row.inputTokens += inputTokens;
  row.outputTokens += outputTokens;
  into.set(model, row);
}

/** Tokens, searches and sources for one or more responses of the same turn. */
function accountFor(parts: BetaMessage[]): Pick<ProviderResponse, "billed" | "searchCalls" | "sources"> {
  const billed = new Map<string, BilledTokens>();
  const sources = new Map<string, AiSource>();
  let searchCalls = 0;
  for (const part of parts) {
    const usage = part.usage;
    const iterations = usage.iterations ?? [];
    if (iterations.length) {
      // One entry per model step. This is the source of truth when a fallback model ran,
      // because the top level numbers then cover only the model that answered.
      for (const it of iterations) {
        const model = ("model" in it && it.model) || part.model;
        addBilled(billed, model, it.input_tokens + it.cache_creation_input_tokens + it.cache_read_input_tokens, it.output_tokens);
      }
    } else {
      addBilled(billed, part.model, usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0), usage.output_tokens);
    }
    searchCalls += usage.server_tool_use?.web_search_requests ?? 0;
    for (const block of part.content) {
      // On success the content is a list of results. On failure it is a single error object.
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (!sources.has(r.url)) sources.set(r.url, { url: r.url, title: r.title });
      }
    }
  }
  return { billed: [...billed.values()], searchCalls, sources: [...sources.values()] };
}

/** Turns the responses of one turn into the shared result shape. Exported for tests. */
export function mapAnthropicMessages(parts: BetaMessage[]): ProviderResponse {
  const last = parts[parts.length - 1];
  if (!last) throw new AiError("provider_error", "Claude returned no response.", { provider: "anthropic" });
  const account = accountFor(parts);
  const partial = { model: last.model, billed: account.billed, searchCalls: account.searchCalls };

  // Check why the model stopped before reading the content. A refusal can have no content.
  if (last.stop_reason === "refusal") {
    const category = last.stop_details?.category;
    throw new AiError("refused", `Claude declined this request${category ? ` (${category})` : ""}.`, { provider: "anthropic", partial });
  }
  if (last.stop_reason === "max_tokens") throw new AiError("truncated", "Claude ran out of room before finishing the answer.", { provider: "anthropic", partial });
  if (last.stop_reason === "pause_turn") throw new AiError("provider_error", "Claude did not finish the web search in time.", { provider: "anthropic", partial });
  if (last.stop_reason === "model_context_window_exceeded") throw new AiError("bad_request", "The request was too long for the model.", { provider: "anthropic", partial });

  // With structured output the answer is the final text block.
  let text = "";
  for (const block of last.content) if (block.type === "text") text = block.text;
  if (!text.trim()) throw new AiError("invalid_output", "Claude returned no answer text.", { provider: "anthropic", partial });

  return { text, model: last.model, ...account };
}

function mapError(err: unknown, parts: BetaMessage[]): AiError {
  if (err instanceof AiError) return err;
  const provider = "anthropic" as const;
  const account = parts.length ? accountFor(parts) : null;
  const lastPart = parts[parts.length - 1];
  const partial = account && lastPart ? { model: lastPart.model, billed: account.billed, searchCalls: account.searchCalls } : undefined;
  const detail = err instanceof Error ? err.message.slice(0, 300) : "Unknown error";
  // Most specific first. The timeout class extends the connection class.
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new AiError("timeout", "Claude took too long to answer.", { provider, partial, cause: err });
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return new AiError("auth", "Claude rejected the API key. Check ANTHROPIC_API_KEY.", { provider, status: err.status, partial, cause: err });
  if (err instanceof Anthropic.RateLimitError) return new AiError("rate_limited", "Claude is rate limiting requests. Try again shortly.", { provider, status: err.status, partial, cause: err });
  if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.NotFoundError || err instanceof Anthropic.UnprocessableEntityError) return new AiError("bad_request", `Claude did not accept the request. ${detail}`, { provider, status: err.status, partial, cause: err });
  if (err instanceof Anthropic.APIConnectionError) return new AiError("provider_error", "Claude could not be reached.", { provider, partial, cause: err });
  if (err instanceof Anthropic.APIError) return new AiError("provider_error", `Claude reported a problem. ${detail}`, { provider, status: err.status, partial, cause: err });
  return new AiError("provider_error", `Claude request failed. ${detail}`, { provider, partial, cause: err });
}

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  isConfigured: () => env.anthropicApiKey.length > 0,

  async generate(req: ProviderRequest): Promise<ProviderResponse> {
    const first: BetaMessageParam = { role: "user", content: req.input };
    const messages: BetaMessageParam[] = [first];
    const parts: BetaMessage[] = [];
    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const res = await getClient().beta.messages.create(
          {
            model: req.model,
            max_tokens: req.maxOutputTokens,
            system: req.system,
            messages,
            // Current Claude models decide for themselves how much to think. Effort sets the depth.
            thinking: { type: "adaptive" },
            output_config: { effort: req.effort, format: zodOutputFormat(req.schema) },
            ...(req.webSearch ? { tools: [webSearchTool(req.model, req.webSearch.maxUses)] } : {}),
            ...(supportsRefusalFallback(req.model) ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
          },
          { timeout: req.timeoutMs },
        );
        parts.push(res);
        if (res.stop_reason !== "pause_turn") break;
        // Send the paused turn back unchanged and the server carries on from where it stopped.
        messages.push({ role: "assistant", content: res.content as BetaContentBlockParam[] });
      }
    } catch (err) {
      throw mapError(err, parts);
    }
    return mapAnthropicMessages(parts);
  },
};
