/**
 * Errors and request helpers shared by the discovery and site check data sources. Every
 * source client takes its key, User-Agent and fetch function from the caller, so these
 * helpers never read the environment and the clients stay unit testable.
 */

export type SourceErrorKind = "auth" | "quota" | "rate_limited" | "bad_request" | "provider_error" | "timeout" | "not_found";

export class SourceError extends Error {
  readonly kind: SourceErrorKind;
  /** Source id, for example "openstreetmap" or "google_places". */
  readonly source: string;
  /** HTTP status when the error came from a response. */
  readonly status?: number;

  constructor(source: string, kind: SourceErrorKind, message: string, status?: number, options?: { cause?: unknown }) {
    super(`${source}: ${message}`, options);
    this.name = "SourceError";
    this.source = source;
    this.kind = kind;
    this.status = status;
  }
}

// Google and others answer 429 both for short bursts and for a spent daily allowance. Only the
// body tells them apart, and the caller should stop for the day on quota but retry on rate limits.
const QUOTA_WORDS = /quota|resource_exhausted|billing|daily limit|limit exceeded for the day/i;

/** Short, single line excerpt of a response body for error messages. Never includes the request URL, which may carry a key. */
function excerpt(body: string): string {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length > 200 ? `${t.slice(0, 200)}...` : t;
}

/** Maps a failed HTTP response to a SourceError: 401 and 403 auth, 404 not found, 429 rate limited or quota, other 4xx bad request, 5xx provider error. */
export function sourceErrorFromStatus(source: string, status: number, body = ""): SourceError {
  const detail = excerpt(body);
  const message = detail ? `HTTP ${status}: ${detail}` : `HTTP ${status}`;
  if (status === 401 || status === 403) return new SourceError(source, QUOTA_WORDS.test(body) && status === 403 ? "quota" : "auth", message, status);
  if (status === 404) return new SourceError(source, "not_found", message, status);
  if (status === 429) return new SourceError(source, QUOTA_WORDS.test(body) ? "quota" : "rate_limited", message, status);
  if (status === 408) return new SourceError(source, "timeout", message, status);
  if (status >= 400 && status < 500) return new SourceError(source, "bad_request", message, status);
  return new SourceError(source, "provider_error", message, status);
}

/** True for the errors fetch throws when an AbortSignal fires, including AbortSignal.timeout. */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

/** Maps an error thrown by fetch (or while reading the body) to a SourceError. Timeouts and aborts become "timeout", anything else "provider_error". */
export function sourceErrorFromException(source: string, err: unknown): SourceError {
  if (err instanceof SourceError) return err;
  if (isAbortError(err)) return new SourceError(source, "timeout", "request timed out", undefined, { cause: err });
  const message = err instanceof Error ? err.message : String(err);
  return new SourceError(source, "provider_error", `request failed: ${message}`, undefined, { cause: err });
}

export interface SourceRequestOptions {
  fetchImpl?: typeof fetch;
  timeoutMs: number;
}

/**
 * Sends one request with a timeout and returns the parsed JSON body. Every failure comes back
 * as a SourceError, so callers only ever handle one error type.
 */
export async function requestJson(source: string, url: string, init: RequestInit, opts: SourceRequestOptions): Promise<unknown> {
  const doFetch = opts.fetchImpl ?? fetch;
  let status = 0;
  let text: string;
  try {
    const res = await doFetch(url, { ...init, signal: AbortSignal.timeout(opts.timeoutMs) });
    status = res.status;
    // The body is read inside the try because a slow body can still trip the timeout.
    text = await res.text();
    if (!res.ok) throw sourceErrorFromStatus(source, res.status, text);
  } catch (err) {
    throw sourceErrorFromException(source, err);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    throw new SourceError(source, "provider_error", `response is not JSON: ${excerpt(text)}`, status, { cause: err });
  }
}

/* ------------------------------ JSON reading ------------------------------ */

// Responses are parsed as unknown and read through these, so a changed provider shape
// produces missing fields rather than a crash.

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Trimmed non empty string, or undefined. */
export function asString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t ? t : undefined;
}

/** Copy without undefined fields, so a merged row is never overwritten with undefined. */
export function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}
