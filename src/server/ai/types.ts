import type { z } from "zod";
import type { AiProviderId, AiTask } from "@/types/research";

export type AiEffort = "low" | "medium" | "high";

export interface AiSource {
  url: string;
  title?: string;
}

/** Tokens billed to one model. A request served by a fallback model has more than one entry. */
export interface BilledTokens {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** What every provider adapter receives. Built by generate(), never by feature code. */
export interface ProviderRequest {
  model: string;
  system: string;
  input: string;
  /** The answer must match this schema. Adapters ask the provider for structured JSON. */
  schema: z.ZodType;
  /** The same schema as JSON Schema, for providers that take it over HTTP. */
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  webSearch?: { maxUses: number };
  maxOutputTokens: number;
  effort: AiEffort;
  timeoutMs: number;
}

export interface ProviderResponse {
  /** Raw JSON text of the answer. generate() parses and validates it. */
  text: string;
  /** The model that produced the answer. Differs from the request when a fallback served it. */
  model: string;
  billed: BilledTokens[];
  searchCalls: number;
  sources: AiSource[];
}

export interface ProviderAdapter {
  id: AiProviderId;
  isConfigured(): boolean;
  generate(req: ProviderRequest): Promise<ProviderResponse>;
}

export type AiErrorKind =
  | "not_configured" // no API key in the environment
  | "disabled" // switched off in settings
  | "budget" // a spending cap would be exceeded
  | "paused" // repeated failures, short pause
  | "no_price" // the model has no price, so its cost cannot be capped
  | "auth" // key rejected
  | "quota" // the provider account has no credit or quota left
  | "rate_limited"
  | "timeout"
  | "provider_error" // provider side failure
  | "bad_request" // the provider rejected the request
  | "refused" // the model declined
  | "truncated" // hit the output limit
  | "invalid_output"; // the answer did not match the schema

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly provider?: AiProviderId;
  readonly status?: number;
  /** What the failed attempt still cost, when the provider reported usage. */
  readonly partial?: Pick<ProviderResponse, "model" | "billed" | "searchCalls">;

  constructor(kind: AiErrorKind, message: string, opts: { provider?: AiProviderId; status?: number; partial?: AiError["partial"]; cause?: unknown } = {}) {
    super(message, opts.cause === undefined ? undefined : { cause: opts.cause });
    this.name = "AiError";
    this.kind = kind;
    this.provider = opts.provider;
    this.status = opts.status;
    this.partial = opts.partial;
  }
}

/** Failures where the same request may work on another provider or a little later. */
export const TRANSIENT_KINDS: ReadonlySet<AiErrorKind> = new Set(["rate_limited", "timeout", "provider_error"]);

export interface GenerateOptions<T> {
  task: AiTask;
  system: string;
  input: string;
  schema: z.ZodType<T>;
  /** Short name for the schema, letters, digits and underscores. */
  schemaName: string;
  webSearch?: { maxUses: number };
  maxOutputTokens?: number;
  effort?: AiEffort;
  timeoutMs?: number;
  /** Run on this provider only, with no fallback. Used to ask every AI the same question. */
  provider?: AiProviderId;
  /** Recorded in the usage ledger. feature defaults to the task name. */
  context?: { feature?: string; userId?: string; searchId?: string; prospectId?: string };
}

export interface GenerateResult<T> {
  data: T;
  provider: AiProviderId;
  /** The model that answered. */
  model: string;
  inputTokens: number;
  outputTokens: number;
  searchCalls: number;
  costUsd: number;
  sources: AiSource[];
  durationMs: number;
}
