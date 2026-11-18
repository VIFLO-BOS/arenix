import "server-only";
import { env } from "@/lib/env";
import { postJson, readErrorBody, type FetchLike } from "../http";
import { AiError, type AiSource, type ProviderAdapter, type ProviderRequest, type ProviderResponse } from "../types";

/**
 * OpenAI (the models behind ChatGPT), through the Responses API over plain HTTP.
 *
 * NOT YET TESTED AGAINST THE LIVE API. No OpenAI key existed when this was written, so it
 * follows the official documentation as read on 17 November 2026 and is covered by unit
 * tests that use the documented response shape. Run the provider test in the admin after
 * adding OPENAI_API_KEY, before relying on it.
 *
 * The documentation read for this adapter shows no setting that caps how many searches one
 * request runs, so the budget estimate assumes the number asked for.
 */
const ENDPOINT = "https://api.openai.com/v1/responses";

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Turns a finished response into the shared result shape. Exported for tests. */
export function mapOpenAiResponse(model: string, json: unknown): ProviderResponse {
  const provider = "openai" as const;
  if (!isObj(json)) throw new AiError("provider_error", "OpenAI returned an unreadable response.", { provider });

  const usage = isObj(json.usage) ? json.usage : {};
  // Billed under the model that was asked for. The response can name a dated snapshot of it.
  const billed = [{ model, inputTokens: num(usage.input_tokens), outputTokens: num(usage.output_tokens) }];

  const sources = new Map<string, AiSource>();
  let text = "";
  let refusal = "";
  let searchCalls = 0;
  // Do not assume the answer is the first item. Searches and reasoning come before it.
  for (const item of arr(json.output)) {
    if (!isObj(item)) continue;
    if (item.type === "web_search_call") {
      const action = isObj(item.action) ? item.action : {};
      if (action.type === "search" || action.type === undefined) searchCalls += 1;
      for (const s of arr(action.sources)) if (isObj(s) && typeof s.url === "string" && !sources.has(s.url)) sources.set(s.url, { url: s.url, title: typeof s.title === "string" ? s.title : undefined });
      continue;
    }
    if (item.type !== "message") continue;
    let itemText = "";
    for (const part of arr(item.content)) {
      if (!isObj(part)) continue;
      if (part.type === "refusal" && typeof part.refusal === "string") refusal = part.refusal;
      if (part.type !== "output_text" || typeof part.text !== "string") continue;
      itemText += part.text;
      for (const a of arr(part.annotations)) {
        if (isObj(a) && a.type === "url_citation" && typeof a.url === "string" && !sources.has(a.url)) sources.set(a.url, { url: a.url, title: typeof a.title === "string" ? a.title : undefined });
      }
    }
    if (itemText) text = itemText;
  }
  const partial = { model, billed, searchCalls };

  const status = typeof json.status === "string" ? json.status : "";
  if (status === "incomplete") {
    const reason = isObj(json.incomplete_details) && typeof json.incomplete_details.reason === "string" ? json.incomplete_details.reason : "";
    if (reason === "content_filter") throw new AiError("refused", "OpenAI declined this request.", { provider, partial });
    throw new AiError("truncated", "OpenAI ran out of room before finishing the answer.", { provider, partial });
  }
  if (status !== "completed") {
    const detail = isObj(json.error) && typeof json.error.message === "string" ? json.error.message.slice(0, 300) : `status ${status || "unknown"}`;
    throw new AiError("provider_error", `OpenAI did not complete the request. ${detail}`, { provider, partial });
  }
  if (refusal && !text.trim()) throw new AiError("refused", "OpenAI declined this request.", { provider, partial });
  if (!text.trim()) throw new AiError("invalid_output", "OpenAI returned no answer text.", { provider, partial });

  return { text, model, billed, searchCalls, sources: [...sources.values()] };
}

function httpError(status: number, json: unknown): AiError {
  const provider = "openai" as const;
  const { message, code } = readErrorBody(json);
  const detail = message.slice(0, 300);
  if (status === 401 || status === 403) return new AiError("auth", "OpenAI rejected the API key. Check OPENAI_API_KEY.", { provider, status });
  if (status === 429 && code === "insufficient_quota") return new AiError("quota", "The OpenAI account has no credit left.", { provider, status });
  if (status === 429) return new AiError("rate_limited", "OpenAI is rate limiting requests. Try again shortly.", { provider, status });
  if (status >= 500) return new AiError("provider_error", `OpenAI reported a problem. ${detail}`, { provider, status });
  return new AiError("bad_request", `OpenAI did not accept the request. ${detail}`, { provider, status });
}

export function createOpenAiAdapter(deps: { apiKey?: () => string; fetchImpl?: FetchLike; backoffMs?: number } = {}): ProviderAdapter {
  const apiKey = deps.apiKey ?? (() => env.openaiApiKey);
  return {
    id: "openai",
    isConfigured: () => apiKey().length > 0,

    async generate(req: ProviderRequest): Promise<ProviderResponse> {
      const { status, json } = await postJson({
        provider: "openai",
        url: ENDPOINT,
        headers: { authorization: `Bearer ${apiKey()}` },
        body: {
          model: req.model,
          instructions: req.system,
          input: req.input,
          // The API minimum is 16. The limit covers the answer and the model's reasoning.
          max_output_tokens: Math.max(16, req.maxOutputTokens),
          reasoning: { effort: req.effort },
          text: { format: { type: "json_schema", name: req.schemaName, schema: req.jsonSchema, strict: true } },
          ...(req.webSearch ? { tools: [{ type: "web_search" }] } : {}),
          // OpenAI stores responses by default. Lead research does not need that.
          store: false,
        },
        timeoutMs: req.timeoutMs,
        fetchImpl: deps.fetchImpl,
        backoffMs: deps.backoffMs,
      });
      if (status < 200 || status >= 300) throw httpError(status, json);
      return mapOpenAiResponse(req.model, json);
    },
  };
}

export const openAiAdapter = createOpenAiAdapter();
