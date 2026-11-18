import { describe, expect, it } from "vitest";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { postJson, type FetchLike } from "@/server/ai/http";
import { toProviderJsonSchema } from "@/server/ai/json";
import { mapAnthropicMessages, supportsRefusalFallback } from "@/server/ai/providers/anthropic";
import { createGeminiAdapter, mapGeminiInteraction } from "@/server/ai/providers/gemini";
import { createOpenAiAdapter, mapOpenAiResponse } from "@/server/ai/providers/openai";
import { AiError, type ProviderRequest } from "@/server/ai/types";

/**
 * The Gemini and OpenAI payloads below follow the shapes in the official documentation as
 * read on 17 November 2026. They are not recordings of live calls, because no key existed
 * for either provider. The Claude payloads follow what the live API returned that day.
 */

const Answer = z.object({ name: z.string(), website: z.string().nullable() });
const request = (over: Partial<ProviderRequest> = {}): ProviderRequest => ({ model: "test-model", system: "Research businesses.", input: "Acme, Lagos", schema: Answer, jsonSchema: toProviderJsonSchema(Answer), schemaName: "answer", maxOutputTokens: 2000, effort: "medium", timeoutMs: 5000, ...over });

const kindOf = (fn: () => unknown) => {
  try {
    fn();
    return "no error";
  } catch (err) {
    return err instanceof AiError ? err.kind : `other ${String(err)}`;
  }
};
const kindOfAsync = async (p: Promise<unknown>) => {
  try {
    await p;
    return "no error";
  } catch (err) {
    return err instanceof AiError ? err.kind : `other ${String(err)}`;
  }
};

function fakeFetch(responses: { status: number; body: unknown; headers?: Record<string, string> }[]) {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)]!;
    return new Response(JSON.stringify(next.body), { status: next.status, headers: next.headers });
  };
  return { fetchImpl, calls };
}

/* --------------------------------- Claude -------------------------------- */

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
const iteration = (type: string, model: string | null, input: number, output: number) => ({ type, model, input_tokens: input, output_tokens: output, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, cache_creation: null });
function claudeMessage(over: Record<string, unknown> = {}, usage: Record<string, unknown> = {}): BetaMessage {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_details: null,
    content: [{ type: "text", text: '{"name":"Acme","website":null}', citations: null }],
    usage: { input_tokens: 236, output_tokens: 19, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: null, iterations: [iteration("message", null, 236, 19)], ...usage },
    ...over,
  } as unknown as BetaMessage;
}

describe("Claude response mapping", () => {
  it("reads the answer, the tokens and the model", () => {
    const out = mapAnthropicMessages([claudeMessage()]);
    expect(out.text).toBe('{"name":"Acme","website":null}');
    expect(out.model).toBe("claude-opus-5-5");
    expect(out.billed).toEqual([{ model: "claude-opus-5-5", inputTokens: 236, outputTokens: 19 }]);
    expect(out.searchCalls).toBe(0);
  });

  it("collects web search results as sources once each, takes the last text block and counts searches", () => {
    const out = mapAnthropicMessages([
      claudeMessage(
        {
          content: [
            { type: "server_tool_use", id: "t1", name: "web_search", input: { query: "acme lagos" } },
            { type: "web_search_tool_result", tool_use_id: "t1", content: [
              { type: "web_search_result", url: "https://acme.example", title: "Acme", encrypted_content: "x", page_age: null },
              { type: "web_search_result", url: "https://acme.example", title: "Acme again", encrypted_content: "x", page_age: null },
              { type: "web_search_result", url: "https://dir.example/acme", title: "Directory", encrypted_content: "x", page_age: null },
            ] },
            { type: "web_search_tool_result", tool_use_id: "t2", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
            { type: "text", text: "Looking at the results.", citations: null },
            { type: "text", text: '{"name":"Acme","website":"https://acme.example"}', citations: null },
          ],
        },
        { input_tokens: 11419, output_tokens: 332, server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 }, iterations: [iteration("message", null, 5456, 127), iteration("message", null, 5963, 205)] },
      ),
    ]);
    expect(out.text).toBe('{"name":"Acme","website":"https://acme.example"}');
    expect(out.sources.map((s) => s.url)).toEqual(["https://acme.example", "https://dir.example/acme"]);
    expect(out.searchCalls).toBe(1);
    expect(out.billed).toEqual([{ model: "claude-opus-5-5", inputTokens: 11419, outputTokens: 332 }]);
  });

  it("uses the top level usage when the response lists no steps, as Claude Haiku does", () => {
    const out = mapAnthropicMessages([claudeMessage({ model: "claude-haiku-5-5" }, { input_tokens: 10190, output_tokens: 147, iterations: [] })]);
    expect(out.billed).toEqual([{ model: "claude-haiku-5-5", inputTokens: 10190, outputTokens: 147 }]);
  });

  it("bills each model separately when a fallback model served the request", () => {
    const out = mapAnthropicMessages([
      claudeMessage({ model: "claude-opus-4-8" }, { input_tokens: 300, output_tokens: 40, iterations: [iteration("message", "claude-opus-5-5", 250, 0), iteration("fallback_message", "claude-opus-4-8", 300, 40)] }),
    ]);
    expect(out.model).toBe("claude-opus-4-8");
    expect(out.billed).toEqual([
      { model: "claude-opus-5-5", inputTokens: 250, outputTokens: 0 },
      { model: "claude-opus-4-8", inputTokens: 300, outputTokens: 40 },
    ]);
  });

  it("adds up the parts of a turn that paused and resumed", () => {
    const paused = claudeMessage({ stop_reason: "pause_turn", content: [{ type: "server_tool_use", id: "t1", name: "web_search", input: {} }] }, { input_tokens: 1000, output_tokens: 50, server_tool_use: { web_search_requests: 2, web_fetch_requests: 0 }, iterations: [iteration("message", null, 1000, 50)] });
    const out = mapAnthropicMessages([paused, claudeMessage({}, { server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 } })]);
    expect(out.searchCalls).toBe(3);
    expect(out.billed).toEqual([{ model: "claude-opus-5-5", inputTokens: 1236, outputTokens: 69 }]);
  });

  it("checks the stop reason before reading content, and keeps the cost of the failed attempt", () => {
    const refused = claudeMessage({ stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber", explanation: null }, content: [] });
    try {
      mapAnthropicMessages([refused]);
      expect.unreachable("a refusal must throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AiError);
      expect((err as AiError).kind).toBe("refused");
      expect((err as AiError).message).toContain("cyber");
      expect((err as AiError).partial?.billed).toEqual([{ model: "claude-opus-5-5", inputTokens: 236, outputTokens: 19 }]);
    }
    expect(kindOf(() => mapAnthropicMessages([claudeMessage({ stop_reason: "max_tokens" })]))).toBe("truncated");
    expect(kindOf(() => mapAnthropicMessages([claudeMessage({ stop_reason: "pause_turn" })]))).toBe("provider_error");
    expect(kindOf(() => mapAnthropicMessages([claudeMessage({ content: [] })]))).toBe("invalid_output");
    expect(kindOf(() => mapAnthropicMessages([]))).toBe("provider_error");
  });

  it("sends the refusal fallback option only to models that support it", () => {
    for (const m of ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"]) expect(supportsRefusalFallback(m), m).toBe(true);
    for (const m of ["claude-haiku-5-5", "claude-opus-4-8", "claude-sonnet-5", "claude-haiku-4-5"]) expect(supportsRefusalFallback(m), m).toBe(false);
  });
});

/* --------------------------------- Gemini -------------------------------- */

const geminiDone = {
  id: "int_1",
  object: "interaction",
  status: "completed",
  model: "gemini-3.8-flash",
  steps: [
    { type: "thought" },
    { type: "google_search_call", id: "c1", arguments: { queries: ["acme logistics lagos", "acme logistics website"] } },
    { type: "google_search_result", call_id: "c1", result: [{ search_suggestions: "<div></div>" }] },
    { type: "model_output", content: [{ type: "text", text: '{"name":"Acme","website":"https://acme.example"}', annotations: [{ type: "url_citation", url: "https://acme.example", title: "Acme", start_index: 0, end_index: 10 }, { type: "url_citation", url: "https://acme.example", title: "Acme", start_index: 11, end_index: 20 }] }] },
  ],
  usage: { total_input_tokens: 700, total_output_tokens: 23, total_thought_tokens: 49, total_tool_use_tokens: 300, total_tokens: 1072, total_cached_tokens: 0, grounding_tool_count: [{ type: "google_search", count: 2 }] },
};

describe("Gemini adapter (written from the documentation, not tested live)", () => {
  it("sends the documented request shape", async () => {
    const { fetchImpl, calls } = fakeFetch([{ status: 200, body: geminiDone }]);
    const adapter = createGeminiAdapter({ apiKey: () => "g-key", fetchImpl });
    expect(adapter.isConfigured()).toBe(true);
    await adapter.generate(request({ model: "gemini-3.8-flash", webSearch: { maxUses: 3 } }));
    const call = calls[0]!;
    expect(call.url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect(call.headers["x-goog-api-key"]).toBe("g-key");
    expect(call.body).toMatchObject({ model: "gemini-3.8-flash", input: "Acme, Lagos", system_instruction: "Research businesses.", generation_config: { max_output_tokens: 2000, thinking_level: "medium" }, tools: [{ type: "google_search" }], store: false });
    expect(call.body.response_format).toMatchObject({ type: "text", mime_type: "application/json", schema: { type: "object", additionalProperties: false } });
  });

  it("leaves the search tool out when web search is not asked for", async () => {
    const { fetchImpl, calls } = fakeFetch([{ status: 200, body: geminiDone }]);
    await createGeminiAdapter({ apiKey: () => "g-key", fetchImpl }).generate(request());
    expect(calls[0]!.body.tools).toBeUndefined();
  });

  it("reads the answer, sources, searches and tokens, billing thinking as output", () => {
    const out = mapGeminiInteraction("gemini-3.8-flash", geminiDone);
    expect(out.text).toBe('{"name":"Acme","website":"https://acme.example"}');
    expect(out.sources).toEqual([{ url: "https://acme.example", title: "Acme" }]);
    expect(out.searchCalls).toBe(2);
    expect(out.billed).toEqual([{ model: "gemini-3.8-flash", inputTokens: 1000, outputTokens: 72 }]);
  });

  it("counts search queries itself when Google gives no count", () => {
    const { grounding_tool_count: _dropped, ...usage } = geminiDone.usage;
    void _dropped;
    expect(mapGeminiInteraction("gemini-3.8-flash", { ...geminiDone, usage }).searchCalls).toBe(2);
  });

  it("turns unfinished or empty interactions into errors", () => {
    expect(kindOf(() => mapGeminiInteraction("m", { ...geminiDone, status: "incomplete" }))).toBe("truncated");
    expect(kindOf(() => mapGeminiInteraction("m", { ...geminiDone, status: "failed" }))).toBe("provider_error");
    expect(kindOf(() => mapGeminiInteraction("m", { ...geminiDone, steps: [] }))).toBe("invalid_output");
    expect(kindOf(() => mapGeminiInteraction("m", "nonsense"))).toBe("provider_error");
  });

  it("maps HTTP errors, retrying rate limits and server errors first", async () => {
    const make = (responses: Parameters<typeof fakeFetch>[0]) => {
      const f = fakeFetch(responses);
      return { ...f, adapter: createGeminiAdapter({ apiKey: () => "g-key", fetchImpl: f.fetchImpl, backoffMs: 0 }) };
    };
    const auth = make([{ status: 401, body: { error: { code: "authentication", message: "The API key is missing, invalid, or expired" } } }]);
    expect(await kindOfAsync(auth.adapter.generate(request()))).toBe("auth");
    expect(auth.calls).toHaveLength(1);

    const limited = make([{ status: 429, body: { error: { code: "rate_limit_exceeded", message: "slow down" } } }]);
    expect(await kindOfAsync(limited.adapter.generate(request()))).toBe("rate_limited");
    expect(limited.calls).toHaveLength(3);

    const quota = make([{ status: 429, body: { error: { code: "quota_exceeded", message: "daily quota" } } }]);
    expect(await kindOfAsync(quota.adapter.generate(request()))).toBe("quota");

    const bad = make([{ status: 400, body: { error: { code: "invalid_request", message: "bad schema" } } }]);
    expect(await kindOfAsync(bad.adapter.generate(request()))).toBe("bad_request");

    const recovered = make([{ status: 503, body: { error: { code: "unavailable", message: "try later" } } }, { status: 200, body: geminiDone }]);
    expect((await recovered.adapter.generate(request())).text).toContain("Acme");
    expect(recovered.calls).toHaveLength(2);
  });

  it("is not configured without a key", () => {
    expect(createGeminiAdapter({ apiKey: () => "" }).isConfigured()).toBe(false);
  });
});

/* --------------------------------- OpenAI -------------------------------- */

const openAiDone = {
  id: "resp_1",
  object: "response",
  status: "completed",
  model: "gpt-6.1-terra-2026-09-01",
  output: [
    { id: "rs_1", type: "reasoning", summary: [] },
    { id: "ws_1", type: "web_search_call", status: "completed", action: { type: "search", query: "acme logistics lagos", sources: [{ type: "url", url: "https://dir.example/acme" }] } },
    { id: "ws_2", type: "web_search_call", status: "completed", action: { type: "open_page", url: "https://acme.example" } },
    { id: "msg_1", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: '{"name":"Acme","website":"https://acme.example"}', annotations: [{ type: "url_citation", url: "https://acme.example", title: "Acme", start_index: 0, end_index: 5 }] }] },
  ],
  usage: { input_tokens: 5200, output_tokens: 410, output_tokens_details: { reasoning_tokens: 256 }, input_tokens_details: { cached_tokens: 0 } },
};

describe("OpenAI adapter (written from the documentation, not tested live)", () => {
  it("sends the documented request shape with a strict schema", async () => {
    const { fetchImpl, calls } = fakeFetch([{ status: 200, body: openAiDone }]);
    const adapter = createOpenAiAdapter({ apiKey: () => "o-key", fetchImpl });
    await adapter.generate(request({ model: "gpt-6.1-terra", webSearch: { maxUses: 3 }, maxOutputTokens: 8 }));
    const call = calls[0]!;
    expect(call.url).toBe("https://api.openai.com/v1/responses");
    expect(call.headers.authorization).toBe("Bearer o-key");
    expect(call.body).toMatchObject({ model: "gpt-6.1-terra", instructions: "Research businesses.", input: "Acme, Lagos", max_output_tokens: 16, reasoning: { effort: "medium" }, tools: [{ type: "web_search" }], store: false });
    expect(call.body.text).toMatchObject({ format: { type: "json_schema", name: "answer", strict: true, schema: { type: "object", additionalProperties: false, required: ["name", "website"] } } });
  });

  it("finds the answer among the output items and counts only search actions", () => {
    const out = mapOpenAiResponse("gpt-6.1-terra", openAiDone);
    expect(out.text).toBe('{"name":"Acme","website":"https://acme.example"}');
    expect(out.searchCalls).toBe(1);
    expect(out.sources.map((s) => s.url)).toEqual(["https://dir.example/acme", "https://acme.example"]);
    // billed under the requested model name, not the dated snapshot in the response
    expect(out.billed).toEqual([{ model: "gpt-6.1-terra", inputTokens: 5200, outputTokens: 410 }]);
    expect(out.model).toBe("gpt-6.1-terra");
  });

  it("turns unfinished, refused or empty responses into errors", () => {
    expect(kindOf(() => mapOpenAiResponse("m", { ...openAiDone, status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }))).toBe("truncated");
    expect(kindOf(() => mapOpenAiResponse("m", { ...openAiDone, status: "incomplete", incomplete_details: { reason: "content_filter" } }))).toBe("refused");
    expect(kindOf(() => mapOpenAiResponse("m", { ...openAiDone, status: "failed", error: { code: "server_error", message: "boom" } }))).toBe("provider_error");
    expect(kindOf(() => mapOpenAiResponse("m", { ...openAiDone, output: [{ type: "message", content: [{ type: "refusal", refusal: "I cannot help with that." }] }] }))).toBe("refused");
    expect(kindOf(() => mapOpenAiResponse("m", { ...openAiDone, output: [] }))).toBe("invalid_output");
  });

  it("maps HTTP errors", async () => {
    const make = (responses: Parameters<typeof fakeFetch>[0]) => createOpenAiAdapter({ apiKey: () => "o-key", fetchImpl: fakeFetch(responses).fetchImpl, backoffMs: 0 });
    expect(await kindOfAsync(make([{ status: 401, body: { error: { message: "Incorrect API key", type: "invalid_request_error", code: "invalid_api_key" } } }]).generate(request()))).toBe("auth");
    expect(await kindOfAsync(make([{ status: 429, body: { error: { message: "You exceeded your current quota", type: "insufficient_quota", code: "insufficient_quota" } } }]).generate(request()))).toBe("quota");
    expect(await kindOfAsync(make([{ status: 429, body: { error: { message: "Rate limit reached", type: "requests", code: "rate_limit_exceeded" } } }]).generate(request()))).toBe("rate_limited");
    expect(await kindOfAsync(make([{ status: 400, body: { error: { message: "Invalid schema", type: "invalid_request_error", code: null } } }]).generate(request()))).toBe("bad_request");
    expect(await kindOfAsync(make([{ status: 500, body: { error: { message: "oops" } } }]).generate(request()))).toBe("provider_error");
  });
});

/* ---------------------------------- HTTP --------------------------------- */

describe("postJson", () => {
  const base = { provider: "openai" as const, url: "https://example.test/x", headers: {}, body: {}, timeoutMs: 2000, backoffMs: 0 };

  it("reports a timeout as a timeout", async () => {
    const fetchImpl: FetchLike = async () => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    };
    expect(await kindOfAsync(postJson({ ...base, fetchImpl }))).toBe("timeout");
  });

  it("retries a network failure and then reports the provider as unreachable", async () => {
    let n = 0;
    const fetchImpl: FetchLike = async () => {
      n += 1;
      throw new TypeError("fetch failed");
    };
    expect(await kindOfAsync(postJson({ ...base, fetchImpl }))).toBe("provider_error");
    expect(n).toBe(3);
  });

  it("returns at once when the provider asks for a long wait", async () => {
    const f = fakeFetch([{ status: 429, body: { error: { message: "wait" } }, headers: { "retry-after": "120" } }]);
    const out = await postJson({ ...base, fetchImpl: f.fetchImpl });
    expect(out.status).toBe(429);
    expect(f.calls).toHaveLength(1);
  });

  it("does not retry a client error", async () => {
    const f = fakeFetch([{ status: 400, body: { error: { message: "bad" } } }]);
    expect((await postJson({ ...base, fetchImpl: f.fetchImpl })).status).toBe(400);
    expect(f.calls).toHaveLength(1);
  });
});
