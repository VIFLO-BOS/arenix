import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { ApiUsage, type ApiUsageDoc } from "@/server/db/models/research";
import { monthStartUtc, type SpendSnapshot } from "./budget";
import { TRANSIENT_KINDS, type AiErrorKind } from "./types";

/**
 * The usage ledger. Every AI request is written here with its estimated cost, whether it
 * worked or not, so the budget guard and the usage panel read from one place.
 */
export interface UsageEntry {
  provider: string;
  model?: string;
  requestedModel?: string;
  feature: string;
  inputTokens?: number;
  outputTokens?: number;
  searchCalls?: number;
  /** Pages fetched or requests made, for sources billed per request or not at all. */
  units?: number;
  costUsd?: number;
  ok: boolean;
  errorKind?: string;
  errorMessage?: string;
  durationMs?: number;
  userId?: string;
  searchId?: string;
  prospectId?: string;
}

const oid = (v?: string) => (v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : undefined);

/** Never throws. Losing a ledger row must not fail the work it describes, but it is logged. */
export async function recordUsage(entry: UsageEntry): Promise<void> {
  try {
    await connectDb();
    await ApiUsage.create({
      provider: entry.provider,
      model: entry.model,
      requestedModel: entry.requestedModel,
      feature: entry.feature,
      inputTokens: entry.inputTokens ?? 0,
      outputTokens: entry.outputTokens ?? 0,
      searchCalls: entry.searchCalls ?? 0,
      units: entry.units,
      costUsd: entry.costUsd ?? 0,
      ok: entry.ok,
      errorKind: entry.errorKind,
      errorMessage: entry.errorMessage?.slice(0, 500),
      durationMs: entry.durationMs,
      userId: oid(entry.userId),
      searchId: oid(entry.searchId),
      prospectId: oid(entry.prospectId),
    });
  } catch (err) {
    console.error("[ai usage] failed to record", entry.provider, entry.feature, err);
  }
}

/** Spend this calendar month (UTC), and on one business search when an id is given. */
export async function loadSpend(searchId?: string): Promise<SpendSnapshot> {
  await connectDb();
  const since = monthStartUtc();
  const rows = await ApiUsage.aggregate<{ _id: string; costUsd: number }>([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$provider", costUsd: { $sum: "$costUsd" } } }]);
  const monthByProvider: Record<string, number> = {};
  let monthTotalUsd = 0;
  for (const r of rows) {
    monthByProvider[r._id] = r.costUsd;
    monthTotalUsd += r.costUsd;
  }
  const snapshot: SpendSnapshot = { monthTotalUsd, monthByProvider };
  const sid = oid(searchId);
  if (sid) {
    const [row] = await ApiUsage.aggregate<{ costUsd: number }>([{ $match: { searchId: sid } }, { $group: { _id: null, costUsd: { $sum: "$costUsd" } } }]);
    snapshot.searchUsd = row?.costUsd ?? 0;
  }
  return snapshot;
}

/**
 * True when the provider's last three requests all failed for reasons on its side within
 * the last five minutes. generate() then skips it for a short while and does not keep
 * sending requests that are likely to fail.
 */
export async function isProviderPaused(provider: string): Promise<boolean> {
  await connectDb();
  const recent = await ApiUsage.find({ provider }).sort({ createdAt: -1 }).limit(3).select("ok errorKind createdAt").lean();
  if (recent.length < 3) return false;
  const cutoff = Date.now() - 5 * 60_000;
  return recent.every((r) => !r.ok && TRANSIENT_KINDS.has(r.errorKind as AiErrorKind) && new Date(r.createdAt).getTime() >= cutoff);
}

export interface UsageSummaryRow {
  provider: string;
  model: string;
  requests: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  searchCalls: number;
  costUsd: number;
}

/** Totals per provider and model since the given moment, most expensive first. */
export async function usageSummary(since: Date = monthStartUtc()): Promise<UsageSummaryRow[]> {
  await connectDb();
  const rows = await ApiUsage.aggregate<{ _id: { provider: string; model: string | null } } & Omit<UsageSummaryRow, "provider" | "model">>([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { provider: "$provider", model: "$model" },
        requests: { $sum: 1 },
        failed: { $sum: { $cond: ["$ok", 0, 1] } },
        inputTokens: { $sum: "$inputTokens" },
        outputTokens: { $sum: "$outputTokens" },
        searchCalls: { $sum: "$searchCalls" },
        costUsd: { $sum: "$costUsd" },
      },
    },
    { $sort: { costUsd: -1, requests: -1 } },
  ]);
  return rows.map(({ _id, ...rest }) => ({ provider: _id.provider, model: _id.model ?? "", ...rest }));
}

export type RecentUsageRow = Pick<ApiUsageDoc, "provider" | "model" | "feature" | "inputTokens" | "outputTokens" | "searchCalls" | "costUsd" | "ok" | "errorKind" | "errorMessage" | "durationMs" | "createdAt"> & { id: string };

export async function recentUsage(limit = 15): Promise<RecentUsageRow[]> {
  await connectDb();
  const rows = await ApiUsage.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    provider: r.provider,
    model: r.model,
    feature: r.feature,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    searchCalls: r.searchCalls,
    costUsd: r.costUsd,
    ok: r.ok,
    errorKind: r.errorKind,
    errorMessage: r.errorMessage,
    durationMs: r.durationMs,
    createdAt: r.createdAt,
  }));
}
