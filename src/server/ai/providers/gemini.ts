import "server-only";
import { env } from "@/lib/env";
import { postJson, readErrorBody, type FetchLike } from "../http";
import { AiError, type AiSource, type ProviderAdapter, type ProviderRequest, type ProviderResponse } from "../types";

/**
 * Google Gemini, through the Interactions API over plain HTTP.
 *
 * NOT YET TESTED AGAINST THE LIVE API. No Gemini key existed when this was written, so it
 * follows the official documentation as read on 17 November 2026 and is covered by unit
 * tests that use the documented response shape. Run the provider test in the admin after
 * adding GEMINI_API_KEY, before relying on it.
 *
 * Two limits to know about. Gemini has no setting that caps how many searches one request
 * runs, so the budget estimate assumes the number asked for. And web search is not offered
 * on the free tier for current models.
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Turns a finished interaction into the shared result shape. Exported for tests. */
export function mapGeminiInteraction(model: string, json: unknown): ProviderResponse {
  const provider = "gemini" as const;
  if (!isObj(json)) throw new AiError("provider_error", "Gemini returned an unreadable response.", { provider });

  const usage = isObj(json.usage) ? json.usage : {};
  // Thinking tokens are billed as output. Tool use tokens are counted as input.
  const billed = [{ model, inputTokens: num(usage.total_input_tokens) + num(usage.total_tool_use_tokens), outputTokens: num(usage.total_output_tokens) + num(usage.total_thought_tokens) }];

  const sources = new Map<string, AiSource>();
  let text = "";
  let queries = 0;
  for (const step of arr(json.steps)) {
    if (!isObj(step)) continue;
    if (step.type === "google_search_call" && isObj(step.arguments)) queries += arr(step.arguments.queries).length;
    if (step.type !== "model_output") continue;
    let stepText = "";
    for (const part of arr(step.content)) {
      if (!isObj(part) || part.type !== "text" || typeof part.text !== "string") continue;
      stepText += part.text;
      for (const a of arr(part.annotations)) {
        if (isObj(a) && a.type === "url_citation" && typeof a.url === "string" && !sources.has(a.url)) sources.set(a.url, { url: a.url, title: typeof a.title === "string" ? a.title : undefined });
      }
    }
    if (stepText) text = stepText; // the answer is the last model output
  }

  // Google bills each search query. Prefer its own count and fall back to counting queries.
  const counted = arr(usage.grounding_tool_count).reduce<number>((sum, g) => (isObj(g) && typeof g.type === "string" && g.type.includes("google_search") ? sum + num(g.count) : sum), 0);
  const searchCalls = counted || queries;
  const partial = { model, billed, searchCalls };

  const status = typeof json.status === "string" ? json.status : "";
  if (status === "incomplete") throw new AiError("truncated", "Gemini ran out of room before finishing the answer.", { provider, partial });
  if (status !== "completed") throw new AiError("provider_error", `Gemini did not complete the request (status ${status || "unknown"}).`, { provider, partial });
  if (!text.trim()) throw new AiError("invalid_output", "Gemini returned no answer text.", { provider, partial });

  return { text, model, billed, searchCalls, sources: [...sources.values()] };
}

function httpError(status: number, json: unknown): AiError {
  const provider = "gemini" as const;
  const { message, code } = readErrorBody(json);
  const detail = message.slice(0, 300);
  if (status === 401 || status === 403) return new AiError("auth", "Gemini rejected the API key. Check GEMINI_API_KEY.", { provider, status });
  if (status === 429 && code === "quota_exceeded") return new AiError("quota", "The Gemini quota for today is used up.", { provider, status });
  if (status === 429) return new AiError("rate_limited", "Gemini is rate limiting requests. Try again shortly.", { provider, status });
  if (status >= 500) return new AiError("provider_error", `Gemini reported a problem. ${detail}`, { provider, status });
  return new AiError("bad_request", `Gemini did not accept the request. ${detail}`, { provider, status });
}

export function createGeminiAdapter(deps: { apiKey?: () => string; fetchImpl?: FetchLike; backoffMs?: number } = {}): ProviderAdapter {
  const apiKey = deps.apiKey ?? (() => env.geminiApiKey);
  return {
    id: "gemini",
    isConfigured: () => apiKey().length > 0,

    async generate(req: ProviderRequest): Promise<ProviderResponse> {
      const { status, json } = await postJson({
        provider: "gemini",
        url: ENDPOINT,
        headers: { "x-goog-api-key": apiKey(), "api-revision": API_REVISION },
        body: {
          model: req.model,
          input: req.input,
          system_instruction: req.system,
          generation_config: { max_output_tokens: req.maxOutputTokens, thinking_level: req.effort },
          response_format: { type: "text", mime_type: "application/json", schema: req.jsonSchema },
          ...(req.webSearch ? { tools: [{ type: "google_search" }] } : {}),
          // Google stores interactions by default. Lead research does not need that.
          store: false,
        },
        timeoutMs: req.timeoutMs,
        fetchImpl: deps.fetchImpl,
        backoffMs: deps.backoffMs,
      });
      if (status < 200 || status >= 300) throw httpError(status, json);
      return mapGeminiInteraction(req.model, json);
    },
  };
}

export const geminiAdapter = createGeminiAdapter();
