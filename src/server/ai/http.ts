import { AiError } from "./types";
import type { AiProviderId } from "@/types/research";

/**
 * Small JSON over HTTP helper for the providers that are called without an SDK (Gemini and
 * OpenAI). It applies one overall time limit, retries rate limits and server errors with a
 * growing pause, and turns network failures into AiError. HTTP error bodies are returned to
 * the adapter, which knows how to read its provider's error format.
 */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface HttpJsonResult {
  status: number;
  json: unknown;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function retryAfterMs(res: Response): number | null {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

export async function postJson(input: {
  provider: AiProviderId;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  retries?: number;
  fetchImpl?: FetchLike;
  /** Base pause between retries. Tests set this to 0. */
  backoffMs?: number;
}): Promise<HttpJsonResult> {
  const doFetch: FetchLike = input.fetchImpl ?? ((url, init) => fetch(url, init));
  const retries = input.retries ?? 2;
  const backoff = input.backoffMs ?? 500;
  const deadline = Date.now() + input.timeoutMs;
  let last: HttpJsonResult | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    let res: Response;
    try {
      res = await doFetch(input.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...input.headers },
        body: JSON.stringify(input.body),
        signal: AbortSignal.timeout(remaining),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") throw new AiError("timeout", "The request took too long and was stopped.", { provider: input.provider, cause: err });
      if (attempt < retries) {
        await sleep(Math.min(backoff * 2 ** attempt, Math.max(0, deadline - Date.now())));
        continue;
      }
      throw new AiError("provider_error", "The provider could not be reached.", { provider: input.provider, cause: err });
    }

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    last = { status: res.status, json };
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === retries) return last;

    const wait = retryAfterMs(res) ?? backoff * 2 ** attempt;
    // A long wait is the provider saying to stop for now. Report it and let the caller decide.
    if (wait > 10_000 || Date.now() + wait >= deadline) return last;
    await sleep(wait);
  }

  if (last) return last;
  throw new AiError("timeout", "The request took too long and was stopped.", { provider: input.provider });
}

/** Reads error.message and error.code from the common { error: { ... } } body shape. */
export function readErrorBody(json: unknown): { message: string; code: string } {
  const error = typeof json === "object" && json !== null ? (json as { error?: unknown }).error : undefined;
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: unknown; code?: unknown; type?: unknown };
    return { message: typeof e.message === "string" ? e.message : "", code: typeof e.code === "string" ? e.code : typeof e.type === "string" ? e.type : "" };
  }
  return { message: "", code: "" };
}
