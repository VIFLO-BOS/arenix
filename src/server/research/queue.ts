import "server-only";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { ResearchTask, type ResearchTaskDoc } from "@/server/db/models/research";

/**
 * Background task queue stored in MongoDB. Long research jobs (discovery, crawling, AI
 * analysis) are split into small tasks so no single browser request has to finish them.
 *
 * How it stays correct with several workers and short lived serverless functions:
 *   - A worker claims one task at a time with a single atomic update and holds a lease on it.
 *     Two workers can never hold the same task.
 *   - A worker that dies simply stops renewing its lease. When the lease runs out the task
 *     can be claimed again.
 *   - A failed task is retried later with a growing pause, up to maxAttempts.
 *   - A dedupe key stops the same job being queued twice while it is pending or running.
 *
 * The handlers live in pipeline.ts. src/app/api/research/worker/route.ts runs the worker.
 */

export const DEFAULT_LEASE_MS = 120_000;
export const DEFAULT_MAX_ATTEMPTS = 3;

/** Pause before retry number `attempt` (1 based): 30 seconds, then doubling, capped at 15 minutes. */
export function backoffMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 15 * 60_000);
}

/** Thrown by a handler when retrying cannot help, for example when the input is invalid. */
export class PermanentTaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentTaskError";
  }
}

const oid = (v?: string) => (v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : undefined);
const isDuplicateKey = (err: unknown) => typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

export interface EnqueueInput {
  type: string;
  payload?: Record<string, unknown>;
  searchId?: string;
  prospectId?: string;
  /** While a task with this key is pending or running, queueing it again returns that task. */
  dedupeKey?: string;
  runAfter?: Date;
  maxAttempts?: number;
  createdBy?: string;
}

// The dedupe guarantee depends on the unique index, so make sure it exists before the first insert.
let indexesReady: Promise<unknown> | null = null;

export async function enqueueTask(input: EnqueueInput): Promise<{ task: ResearchTaskDoc; created: boolean }> {
  await connectDb();
  await (indexesReady ??= ResearchTask.init());
  try {
    const doc = await ResearchTask.create({
      type: input.type,
      payload: input.payload,
      searchId: oid(input.searchId),
      prospectId: oid(input.prospectId),
      activeKey: input.dedupeKey,
      runAfter: input.runAfter ?? new Date(),
      maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      createdBy: oid(input.createdBy),
    });
    return { task: doc.toObject(), created: true };
  } catch (err) {
    if (input.dedupeKey && isDuplicateKey(err)) {
      const existing = await ResearchTask.findOne({ activeKey: input.dedupeKey }).lean();
      if (existing) return { task: existing, created: false };
    }
    throw err;
  }
}

/**
 * Claims the next task that is due, or one whose lease has run out. Returns null when
 * nothing is ready. A task that has used all its attempts through expired leases is closed
 * as failed and the next one is tried.
 */
export async function claimNextTask(opts: { workerId: string; leaseMs?: number; types?: string[]; now?: Date }): Promise<ResearchTaskDoc | null> {
  await connectDb();
  const leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;
  for (;;) {
    const now = opts.now ?? new Date();
    const task = await ResearchTask.findOneAndUpdate(
      {
        ...(opts.types ? { type: { $in: opts.types } } : {}),
        $or: [
          { status: "PENDING", runAfter: { $lte: now } },
          { status: "RUNNING", lockedUntil: { $lt: now } },
        ],
      },
      { $set: { status: "RUNNING", lockedBy: opts.workerId, lockedUntil: new Date(now.getTime() + leaseMs), startedAt: now }, $inc: { attempts: 1 } },
      { sort: { runAfter: 1, createdAt: 1 }, returnDocument: "after" },
    ).lean();
    if (!task) return null;
    if (task.attempts <= task.maxAttempts) return task;
    await ResearchTask.updateOne({ _id: task._id, lockedBy: opts.workerId }, { $set: { status: "FAILED", error: "The task kept timing out and was stopped.", finishedAt: now }, $unset: { activeKey: 1, lockedBy: 1, lockedUntil: 1 } });
  }
}

/** Keeps a long running task claimed. Returns false when the worker no longer holds it. */
export async function extendLease(taskId: string, workerId: string, leaseMs = DEFAULT_LEASE_MS): Promise<boolean> {
  await connectDb();
  const res = await ResearchTask.updateOne({ _id: taskId, status: "RUNNING", lockedBy: workerId }, { $set: { lockedUntil: new Date(Date.now() + leaseMs) } });
  return res.modifiedCount === 1;
}

type Outcome =
  | { status: "DONE"; result?: Record<string, unknown> }
  | { status: "SKIPPED"; reason: string }
  | { status: "FAILED"; error: string; retry: boolean }
  // Not a failure. The task runs again later without using up an attempt, for example after a daily limit resets.
  | { status: "DEFERRED"; until: Date; reason: string };

/**
 * Closes a task the worker holds. Returns the status it ended in, or null when the worker
 * no longer holds the task (its lease ran out and another worker took over), in which case
 * nothing is changed.
 */
export async function finishTask(taskId: string, workerId: string, outcome: Outcome, now: Date = new Date()): Promise<ResearchTaskDoc["status"] | "DEFERRED" | null> {
  await connectDb();
  const task = await ResearchTask.findOne({ _id: taskId, status: "RUNNING", lockedBy: workerId }).lean();
  if (!task) return null;
  const release = { $unset: { lockedBy: 1 as const, lockedUntil: 1 as const } };
  const close = { $unset: { ...release.$unset, activeKey: 1 as const } };

  // A cancel request wins over whatever the handler produced.
  if (task.cancelRequested) {
    await ResearchTask.updateOne({ _id: task._id, lockedBy: workerId }, { $set: { status: "CANCELLED", finishedAt: now }, ...close });
    return "CANCELLED";
  }
  if (outcome.status === "DONE") {
    await ResearchTask.updateOne({ _id: task._id, lockedBy: workerId }, { $set: { status: "DONE", result: outcome.result, finishedAt: now }, $unset: { ...close.$unset, error: 1 } });
    return "DONE";
  }
  if (outcome.status === "SKIPPED") {
    await ResearchTask.updateOne({ _id: task._id, lockedBy: workerId }, { $set: { status: "SKIPPED", error: outcome.reason, finishedAt: now }, ...close });
    return "SKIPPED";
  }
  if (outcome.status === "DEFERRED") {
    await ResearchTask.updateOne({ _id: task._id, lockedBy: workerId }, { $set: { status: "PENDING", error: outcome.reason.slice(0, 1000), runAfter: outcome.until }, $inc: { attempts: -1 }, ...release });
    return "DEFERRED";
  }
  if (outcome.retry && task.attempts < task.maxAttempts) {
    await ResearchTask.updateOne({ _id: task._id, lockedBy: workerId }, { $set: { status: "PENDING", error: outcome.error.slice(0, 1000), runAfter: new Date(now.getTime() + backoffMs(task.attempts)) }, ...release });
    return "PENDING";
  }
  await ResearchTask.updateOne({ _id: task._id, lockedBy: workerId }, { $set: { status: "FAILED", error: outcome.error.slice(0, 1000), finishedAt: now }, ...close });
  return "FAILED";
}

/**
 * Cancels the tasks of one business search. Pending tasks are cancelled at once. Running
 * tasks are flagged and close as cancelled when their handler returns.
 */
export async function cancelTasks(filter: { searchId: string }): Promise<{ cancelled: number; flagged: number }> {
  await connectDb();
  const searchId = oid(filter.searchId);
  if (!searchId) return { cancelled: 0, flagged: 0 };
  const now = new Date();
  const pending = await ResearchTask.updateMany({ searchId, status: "PENDING" }, { $set: { status: "CANCELLED", cancelRequested: true, finishedAt: now }, $unset: { activeKey: 1 } });
  const running = await ResearchTask.updateMany({ searchId, status: "RUNNING" }, { $set: { cancelRequested: true } });
  return { cancelled: pending.modifiedCount, flagged: running.modifiedCount };
}

export async function isCancelRequested(taskId: string): Promise<boolean> {
  await connectDb();
  const task = await ResearchTask.findById(taskId).select("cancelRequested").lean();
  return !task || task.cancelRequested;
}

export interface TaskContext {
  task: ResearchTaskDoc;
  /** Time by which the handler should return so the worker can stop cleanly. */
  deadline: number;
  extendLease: () => Promise<boolean>;
  isCancelled: () => Promise<boolean>;
}

/**
 * A handler returns a result, a reason to skip, or a time to run again. Throwing means
 * failed (retried unless PermanentTaskError).
 */
export type TaskHandler = (ctx: TaskContext) => Promise<{ result?: Record<string, unknown> } | { skip: string } | { defer: { until: Date; reason: string } } | void>;

export interface WorkerReport {
  processed: number;
  done: number;
  failed: number;
  retried: number;
  skipped: number;
  cancelled: number;
  deferred: number;
  /** Search ids touched by this run, so their progress can be refreshed. */
  searchIds: string[];
  prospectIds: string[];
}

/**
 * Runs due tasks one at a time until none are ready or the time budget is used. A
 * serverless function calls this with a budget that fits inside its own time limit, and is
 * called again while work remains.
 */
export async function runWorker(opts: {
  handlers: Record<string, TaskHandler>;
  budgetMs?: number;
  leaseMs?: number;
  workerId?: string;
  maxTasks?: number;
  /** Called after each task closes, for example to refresh a search's progress. */
  afterTask?: (task: ResearchTaskDoc, ended: string | null) => Promise<void>;
}): Promise<WorkerReport> {
  const workerId = opts.workerId ?? randomUUID();
  const leaseMs = opts.leaseMs ?? DEFAULT_LEASE_MS;
  const deadline = Date.now() + (opts.budgetMs ?? 40_000);
  const report: WorkerReport = { processed: 0, done: 0, failed: 0, retried: 0, skipped: 0, cancelled: 0, deferred: 0, searchIds: [], prospectIds: [] };

  while (Date.now() < deadline && report.processed < (opts.maxTasks ?? Infinity)) {
    const task = await claimNextTask({ workerId, leaseMs });
    if (!task) break;
    report.processed += 1;
    const id = task._id.toString();
    const handler = opts.handlers[task.type];

    let outcome: Outcome;
    if (!handler) {
      outcome = { status: "FAILED", error: `No handler is registered for task type ${task.type}.`, retry: false };
    } else {
      try {
        const out = await handler({ task, deadline, extendLease: () => extendLease(id, workerId, leaseMs), isCancelled: () => isCancelRequested(id) });
        if (out && "skip" in out) outcome = { status: "SKIPPED", reason: out.skip };
        else if (out && "defer" in out) outcome = { status: "DEFERRED", until: out.defer.until, reason: out.defer.reason };
        else outcome = { status: "DONE", result: out ? out.result : undefined };
      } catch (err) {
        outcome = { status: "FAILED", error: err instanceof Error ? err.message : "Unknown error", retry: !(err instanceof PermanentTaskError) };
      }
    }

    const ended = await finishTask(id, workerId, outcome);
    if (ended === "DONE") report.done += 1;
    else if (ended === "SKIPPED") report.skipped += 1;
    else if (ended === "CANCELLED") report.cancelled += 1;
    else if (ended === "PENDING") report.retried += 1;
    else if (ended === "FAILED") report.failed += 1;
    else if (ended === "DEFERRED") report.deferred += 1;
    if (task.searchId) report.searchIds = [...new Set([...report.searchIds, task.searchId.toString()])];
    if (task.prospectId) report.prospectIds = [...new Set([...report.prospectIds, task.prospectId.toString()])];
    if (opts.afterTask) {
      try {
        await opts.afterTask(task, ended);
      } catch (err) {
        console.error("[research worker] afterTask failed", err);
      }
    }
  }
  return report;
}

/** True while any task is waiting or running, optionally for one search or one prospect. */
export async function hasOpenTasks(filter: { searchId?: string; prospectId?: string } = {}): Promise<boolean> {
  await connectDb();
  const q: Record<string, unknown> = { status: { $in: ["PENDING", "RUNNING"] } };
  if (filter.searchId) q.searchId = oid(filter.searchId);
  if (filter.prospectId) q.prospectId = oid(filter.prospectId);
  return !!(await ResearchTask.exists(q));
}

/** Counts per status, optionally for one business search. Used for progress display. */
export async function taskCounts(searchId?: string): Promise<Record<string, number>> {
  await connectDb();
  const sid = oid(searchId);
  const rows = await ResearchTask.aggregate<{ _id: string; n: number }>([...(sid ? [{ $match: { searchId: sid } }] : []), { $group: { _id: "$status", n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}
