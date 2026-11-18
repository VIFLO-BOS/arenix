import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task queue tests against a real MongoDB, because the queue's guarantees (one worker per
 * task, no duplicate jobs) come from atomic database updates and a unique index.
 *
 * They use their own database, arenix_vitest, on the local MongoDB server and never touch
 * the application database. When no local MongoDB is running the whole file is skipped.
 */
const TEST_DB = "arenix_vitest";
vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/arenix_vitest";
});

import mongoose from "mongoose";
import { connectDb } from "@/server/db/connect";
import { ResearchTask } from "@/server/db/models/research";
import { PermanentTaskError, backoffMs, cancelTasks, claimNextTask, enqueueTask, extendLease, finishTask, runWorker, taskCounts } from "@/server/research/queue";

let available = true;
try {
  await connectDb();
} catch {
  available = false;
}
const onTestDb = () => mongoose.connection.name === TEST_DB;

const SEARCH = "64b7f0c2a1d2e3f4a5b6c7d8";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const statusOf = async (id: unknown) => (await ResearchTask.findById(id).lean())?.status;

describe("backoffMs", () => {
  it("starts at 30 seconds, doubles and stops at 15 minutes", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(20)).toBe(15 * 60_000);
  });
});

describe.skipIf(!available)("research task queue (local MongoDB)", () => {
  beforeAll(async () => {
    if (!onTestDb()) throw new Error("Refusing to run queue tests outside the test database.");
    await ResearchTask.init();
  });
  beforeEach(async () => {
    if (onTestDb()) await ResearchTask.deleteMany({});
  });
  afterAll(async () => {
    if (onTestDb()) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("queues a job once while it is active, and again after it has finished", async () => {
    const a = await enqueueTask({ type: "crawl", dedupeKey: "crawl:acme.example" });
    const b = await enqueueTask({ type: "crawl", dedupeKey: "crawl:acme.example" });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.task._id.toString()).toBe(a.task._id.toString());
    expect(await ResearchTask.countDocuments({})).toBe(1);

    const claimed = await claimNextTask({ workerId: "w1" });
    expect(await finishTask(claimed!._id.toString(), "w1", { status: "DONE" })).toBe("DONE");
    const c = await enqueueTask({ type: "crawl", dedupeKey: "crawl:acme.example" });
    expect(c.created).toBe(true);
  });

  it("queues jobs without a dedupe key freely", async () => {
    await enqueueTask({ type: "crawl" });
    await enqueueTask({ type: "crawl" });
    expect(await ResearchTask.countDocuments({})).toBe(2);
  });

  it("gives each due task to one worker only, oldest first, and leaves future tasks alone", async () => {
    const first = await enqueueTask({ type: "discover", runAfter: new Date(Date.now() - 2000) });
    const second = await enqueueTask({ type: "discover", runAfter: new Date(Date.now() - 1000) });
    await enqueueTask({ type: "discover", runAfter: new Date(Date.now() + 60_000) });

    const [x, y, z] = await Promise.all([claimNextTask({ workerId: "w1" }), claimNextTask({ workerId: "w2" }), claimNextTask({ workerId: "w3" })]);
    const got = [x, y, z].filter(Boolean).map((t) => t!._id.toString());
    expect(got.sort()).toEqual([first.task._id.toString(), second.task._id.toString()].sort());
    expect(new Set(got).size).toBe(2);
    expect([x, y, z].filter((t) => t === null)).toHaveLength(1);
  });

  it("can claim only the task types asked for", async () => {
    await enqueueTask({ type: "crawl" });
    expect(await claimNextTask({ workerId: "w1", types: ["analyse"] })).toBeNull();
    expect((await claimNextTask({ workerId: "w1", types: ["crawl"] }))?.type).toBe("crawl");
  });

  it("lets another worker take over when a lease runs out, and ignores the late worker", async () => {
    const { task } = await enqueueTask({ type: "crawl" });
    const id = task._id.toString();
    const mine = await claimNextTask({ workerId: "slow", leaseMs: 5 });
    expect(mine?.attempts).toBe(1);
    await wait(30);
    const theirs = await claimNextTask({ workerId: "fast" });
    expect(theirs?._id.toString()).toBe(id);
    expect(theirs?.attempts).toBe(2);

    expect(await finishTask(id, "slow", { status: "DONE" })).toBeNull();
    expect(await extendLease(id, "slow")).toBe(false);
    expect(await statusOf(id)).toBe("RUNNING");
    expect(await extendLease(id, "fast")).toBe(true);
    expect(await finishTask(id, "fast", { status: "DONE", result: { pages: 3 } })).toBe("DONE");
    expect((await ResearchTask.findById(id).lean())?.result).toEqual({ pages: 3 });
  });

  it("does not hand out a task whose lease is still running", async () => {
    await enqueueTask({ type: "crawl" });
    expect(await claimNextTask({ workerId: "w1" })).not.toBeNull();
    expect(await claimNextTask({ workerId: "w2" })).toBeNull();
  });

  it("retries a failed task later, then fails it for good after the last attempt", async () => {
    const { task } = await enqueueTask({ type: "crawl", maxAttempts: 2, dedupeKey: "k" });
    const id = task._id.toString();
    await claimNextTask({ workerId: "w1" });
    const before = Date.now();
    expect(await finishTask(id, "w1", { status: "FAILED", error: "site down", retry: true })).toBe("PENDING");
    const waiting = await ResearchTask.findById(id).lean();
    expect(waiting?.error).toBe("site down");
    expect(waiting!.runAfter.getTime()).toBeGreaterThanOrEqual(before + 29_000);
    expect(await claimNextTask({ workerId: "w1" })).toBeNull(); // not due yet

    await ResearchTask.updateOne({ _id: id }, { $set: { runAfter: new Date() } });
    await claimNextTask({ workerId: "w1" });
    expect(await finishTask(id, "w1", { status: "FAILED", error: "site still down", retry: true })).toBe("FAILED");
    const dead = await ResearchTask.findById(id).lean();
    expect(dead?.status).toBe("FAILED");
    expect(dead?.activeKey).toBeUndefined(); // the job can be queued again
  });

  it("fails a task that keeps timing out and does not hand it out again", async () => {
    const { task } = await enqueueTask({ type: "crawl", maxAttempts: 1 });
    await claimNextTask({ workerId: "w1", leaseMs: 5 });
    await wait(30);
    expect(await claimNextTask({ workerId: "w2" })).toBeNull();
    const dead = await ResearchTask.findById(task._id).lean();
    expect(dead?.status).toBe("FAILED");
    expect(dead?.error).toMatch(/timing out/);
  });

  it("cancels pending tasks at once and running tasks when they return", async () => {
    const running = await enqueueTask({ type: "crawl", searchId: SEARCH, runAfter: new Date(Date.now() - 1000) });
    const pending = await enqueueTask({ type: "crawl", searchId: SEARCH, dedupeKey: "p" });
    const other = await enqueueTask({ type: "crawl", runAfter: new Date(Date.now() + 60_000) });
    const claimed = await claimNextTask({ workerId: "w1" });
    expect(claimed?._id.toString()).toBe(running.task._id.toString());

    expect(await cancelTasks({ searchId: SEARCH })).toEqual({ cancelled: 1, flagged: 1 });
    expect(await statusOf(pending.task._id)).toBe("CANCELLED");
    expect(await statusOf(other.task._id)).toBe("PENDING");
    expect(await finishTask(running.task._id.toString(), "w1", { status: "DONE" })).toBe("CANCELLED");
    expect(await taskCounts(SEARCH)).toEqual({ CANCELLED: 2 });
  });

  it("runs handlers until the queue is empty and reports what happened", async () => {
    await enqueueTask({ type: "ok", payload: { n: 1 } });
    await enqueueTask({ type: "skip" });
    await enqueueTask({ type: "flaky" });
    await enqueueTask({ type: "broken" });
    await enqueueTask({ type: "unknown" });
    const seen: unknown[] = [];

    const report = await runWorker({
      workerId: "w1",
      handlers: {
        ok: async ({ task }) => {
          seen.push(task.payload);
          return { result: { done: true } };
        },
        skip: async () => ({ skip: "Already researched this week." }),
        flaky: async () => {
          throw new Error("temporary");
        },
        broken: async () => {
          throw new PermanentTaskError("bad input");
        },
      },
    });

    expect(report).toMatchObject({ processed: 5, done: 1, skipped: 1, retried: 1, failed: 2, cancelled: 0, deferred: 0 });
    expect(seen).toEqual([{ n: 1 }]);
    expect(await taskCounts()).toEqual({ DONE: 1, SKIPPED: 1, PENDING: 1, FAILED: 2 });
    const unknown = await ResearchTask.findOne({ type: "unknown" }).lean();
    expect(unknown?.error).toMatch(/No handler/);
    const broken = await ResearchTask.findOne({ type: "broken" }).lean();
    expect(broken?.attempts).toBe(1);
  });

  it("stops when its time budget is used, leaving the rest for the next run", async () => {
    await enqueueTask({ type: "slow" });
    await enqueueTask({ type: "slow" });
    await enqueueTask({ type: "slow" });
    const report = await runWorker({ workerId: "w1", budgetMs: 60, handlers: { slow: async () => void (await wait(80)) } });
    expect(report.processed).toBe(1);
    expect(await taskCounts()).toEqual({ DONE: 1, PENDING: 2 });
  });

  it("lets a handler see a cancel request and keeps its lease alive", async () => {
    await enqueueTask({ type: "long", searchId: SEARCH });
    let sawCancel = false;
    let extended = false;
    const report = await runWorker({
      workerId: "w1",
      handlers: {
        long: async (ctx) => {
          extended = await ctx.extendLease();
          await cancelTasks({ searchId: SEARCH });
          sawCancel = await ctx.isCancelled();
        },
      },
    });
    expect(extended).toBe(true);
    expect(sawCancel).toBe(true);
    expect(report.cancelled).toBe(1);
  });
});
