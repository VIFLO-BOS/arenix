import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Lead research storage against a real MongoDB: merging results from several sources, the
 * Google Maps confirm only rule, opt outs, Add to Leads with duplicate detection and the
 * follow up sequence. Uses its own database, arenix_vitest_research, and is skipped when
 * no local MongoDB is running. Businesses here are fictional.
 */
const TEST_DB = "arenix_vitest_research";
vi.hoisted(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/arenix_vitest_research";
});

import mongoose, { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { connectDb } from "@/server/db/connect";
import { Lead, Organization } from "@/server/db/models/crm";
import { OutreachDraft, Prospect, ResearchTask, Suppression } from "@/server/db/models/research";
import { upsertCandidates } from "@/server/research/store";
import { refreshFromStored } from "@/server/research/pipeline";
import { addSuppression, addToLeads, dueFollowUps, markSent, optOutProspect, scheduleSequence } from "@/server/research/service";
import { enqueueTask, runWorker } from "@/server/research/queue";
import type { CurrentUser } from "@/server/auth/session";

let available = true;
try {
  await connectDb();
} catch {
  available = false;
}
const onTestDb = () => mongoose.connection.name === TEST_DB;

const actor: CurrentUser = { id: new Types.ObjectId().toString(), email: "tester@arenix.local", name: "Test User", role: "SUPER_ADMIN" };
const SEARCH = new Types.ObjectId().toString();
const src = (p: string) => [`https://directory.example.ng/${p}`];

describe.skipIf(!available)("lead research storage (local MongoDB)", () => {
  beforeAll(async () => {
    if (!onTestDb()) throw new Error("Refusing to run outside the test database.");
    await Promise.all([Prospect.init(), Suppression.init(), ResearchTask.init()]);
  });
  beforeEach(async () => {
    if (!onTestDb()) return;
    await Promise.all([Prospect.deleteMany({}), Suppression.deleteMany({}), Lead.deleteMany({}), Organization.deleteMany({}), OutreachDraft.deleteMany({}), ResearchTask.deleteMany({})]);
  });
  afterAll(async () => {
    if (onTestDb()) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("merges the same business found by two sources into one row with both badges", async () => {
    const a = await upsertCandidates(SEARCH, [{ name: "Bright Path Logistics", foundBy: "anthropic", phone: "0803 123 4567", city: "Ibadan", sourceUrls: src("bp") }, { name: "Okafor Haulage", foundBy: "anthropic", city: "Ibadan", sourceUrls: src("ok") }], "Nigeria");
    expect(a.created).toBe(2);
    const b = await upsertCandidates(SEARCH, [{ name: "Bright Path Logistics Ltd", foundBy: "openstreetmap", phone: "+234 803 123 4567", website: "https://brightpath.ng", city: "Ibadan", sourceUrls: ["https://www.openstreetmap.org/node/1"], osmId: "node/1" }], "Nigeria");
    expect(b).toMatchObject({ created: 0, merged: 1 });
    expect(await Prospect.countDocuments({})).toBe(2);
    const p = await Prospect.findOne({ osmId: "node/1" }).lean();
    expect(p?.foundBy.map((f) => f.provider).sort()).toEqual(["anthropic", "openstreetmap"]);
    expect(p).toMatchObject({ domain: "brightpath.ng", verification: "PARTLY_VERIFIED" });
    expect(p?.contacts.filter((c) => c.value === "+2348031234567")).toHaveLength(1);
  });

  it("lets Google Maps confirm known businesses but never create rows or store its details", async () => {
    await upsertCandidates(SEARCH, [{ name: "Okafor Haulage", foundBy: "anthropic", city: "Ibadan", sourceUrls: src("ok") }], "Nigeria");
    const r = await upsertCandidates(SEARCH, [
      { name: "Okafor Haulage", foundBy: "google_places", city: "Ibadan", phone: "+2348011112222", address: "4 Ring Road", googlePlaceId: "place-ok", sourceUrls: ["https://www.google.com/maps/place/?q=place_id:place-ok"], listsNoWebsite: true },
      { name: "Only On Google Ltd", foundBy: "google_places", city: "Ibadan", googlePlaceId: "place-x", sourceUrls: ["https://www.google.com/maps/place/?q=place_id:place-x"] },
    ], "Nigeria");
    expect(r).toMatchObject({ created: 0, merged: 1, notKept: 1 });
    expect(await Prospect.countDocuments({})).toBe(1);
    const p = await Prospect.findOne({}).lean();
    expect(p?.googlePlaceId).toBe("place-ok");
    expect(p?.foundBy.map((f) => f.provider)).toContain("google_places");
    expect(p?.website.noWebsiteSources).toEqual(["Google Maps"]);
    expect(p?.address).toBeUndefined();
    expect(p?.contacts).toHaveLength(0);
  });

  it("calls a business NO_WEBSITE_FOUND only after two sources list none, and scores it", async () => {
    await upsertCandidates(SEARCH, [{ name: "Okafor Haulage", foundBy: "anthropic", city: "Ibadan", sourceUrls: src("ok"), listsNoWebsite: true }], "Nigeria");
    const p1 = await Prospect.findOne({}).lean();
    await refreshFromStored(p1!._id.toString());
    expect((await Prospect.findById(p1!._id).lean())?.website.status).toBe("WEBSITE_STATUS_UNKNOWN");
    await upsertCandidates(SEARCH, [{ name: "Okafor Haulage", foundBy: "gemini", city: "Ibadan", sourceUrls: src("ok2"), listsNoWebsite: true }], "Nigeria");
    await refreshFromStored(p1!._id.toString());
    const p2 = await Prospect.findById(p1!._id).lean();
    expect(p2?.website.status).toBe("NO_WEBSITE_FOUND");
    expect(p2?.score?.breakdown.websiteNeed).toBe(30);
  });

  it("skips opted out domains and removes stored details when a business opts out", async () => {
    await addSuppression(actor, "DOMAIN", "https://www.noted.ng/contact", "Asked by email");
    const r = await upsertCandidates(SEARCH, [{ name: "Noted Ltd", foundBy: "anthropic", website: "noted.ng", sourceUrls: src("noted") }], "Nigeria");
    expect(r.skippedOptOut).toBe(1);

    await upsertCandidates(SEARCH, [{ name: "Bright Path Logistics", foundBy: "anthropic", website: "brightpath.ng", phone: "0803 123 4567", email: "hello@brightpath.ng", sourceUrls: src("bp") }], "Nigeria");
    const p = await Prospect.findOne({ domain: "brightpath.ng" }).lean();
    await optOutProspect(actor, p!._id.toString(), "Phoned to opt out");
    const after = await Prospect.findById(p!._id).lean();
    expect(after?.contacts).toEqual([]);
    expect(after?.optedOutAt).toBeDefined();
    expect(await Suppression.countDocuments({})).toBe(4);
    const stored = await Suppression.find({}).lean();
    expect(stored.some((s) => s.hint?.includes("hello@"))).toBe(false);
    await expect(addToLeads(actor, p!._id.toString())).rejects.toThrow(/not to be contacted/);
  });

  it("adds a business to Leads once and detects the duplicate", async () => {
    await upsertCandidates(SEARCH, [{ name: "Bright Path Logistics", foundBy: "anthropic", website: "brightpath.ng", phone: "0803 123 4567", city: "Ibadan", sourceUrls: src("bp") }], "Nigeria");
    const p = await Prospect.findOne({}).lean();
    const id = p!._id.toString();
    const first = await addToLeads(actor, id);
    expect(first.status).toBe("created");
    const lead = await Lead.findOne({}).lean();
    expect(lead).toMatchObject({ status: "NEW", source: "prospecting", title: "Bright Path Logistics" });
    expect(lead?.prospectId?.toString()).toBe(id);
    expect(lead?.activities[0]?.kind).toBe("SYSTEM");
    expect(await Organization.findOne({ domain: "brightpath.ng" }).lean()).not.toBeNull();

    const again = await addToLeads(actor, id);
    expect(again.status).toBe("duplicate");
    expect(await Lead.countDocuments({})).toBe(1);

    // A second research row for the same business, matched through the organisation's phone.
    const twin = await Prospect.create({ name: "BrightPath Couriers", normalisedName: "brightpath couriers", contacts: [{ kind: "PHONE", value: "+2348031234567", verification: "VERIFIED", seenAt: new Date() }], website: { status: "WEBSITE_STATUS_UNKNOWN", evidence: [], failures: [], noWebsiteSources: [] }, foundBy: [], research: { state: "IDLE" } });
    const dup = await addToLeads(actor, twin._id.toString());
    expect(dup).toMatchObject({ status: "duplicate" });
    if (dup.status === "duplicate") expect(dup.reason).toMatch(/phone/);
    const linked = await addToLeads(actor, twin._id.toString(), "update");
    expect(linked.status).toBe("updated");
    expect(await Lead.countDocuments({})).toBe(1);
    expect((await Prospect.findById(twin._id).lean())?.leadId?.toString()).toBe(lead?._id.toString());
  });

  it("runs a follow up sequence and stops it when the lead moves on", async () => {
    await upsertCandidates(SEARCH, [{ name: "Bright Path Logistics", foundBy: "anthropic", website: "brightpath.ng", sourceUrls: src("bp") }], "Nigeria");
    const p = await Prospect.findOne({}).lean();
    const added = await addToLeads(actor, p!._id.toString());
    const leadId = added.leadId;
    const sequenceId = randomUUID();
    await OutreachDraft.insertMany([0, 1, 2].map((step) => ({ prospectId: p!._id, leadId, channel: "EMAIL", kind: "email", step, sequenceId, to: "hello@brightpath.ng", subject: "Hello", body: `Message ${step}`, status: "DRAFT" })));

    await scheduleSequence(actor, sequenceId);
    const due = await dueFollowUps();
    expect(due.map((d) => d.step)).toEqual([0]);

    await markSent(actor, due[0]!._id.toString());
    const steps = await OutreachDraft.find({ sequenceId }).sort({ step: 1 }).lean();
    expect(steps.map((s) => s.status)).toEqual(["SENT", "APPROVED", "DRAFT"]);
    const gapDays = (steps[1]!.dueAt!.getTime() - steps[0]!.sentAt!.getTime()) / 86_400_000;
    expect(Math.round(gapDays)).toBe(4);
    const lead = await Lead.findById(leadId).lean();
    expect(lead?.status).toBe("CONTACTED");
    expect(lead?.activities.some((a) => a.kind === "EMAIL")).toBe(true);

    // Make the follow up due now, then move the lead on. Listing due follow ups stops the sequence.
    await OutreachDraft.updateOne({ sequenceId, step: 1 }, { $set: { dueAt: new Date() } });
    await Lead.updateOne({ _id: leadId }, { $set: { status: "QUALIFIED" } });
    expect(await dueFollowUps()).toEqual([]);
    const stopped = await OutreachDraft.find({ sequenceId, status: "ARCHIVED" }).lean();
    expect(stopped).toHaveLength(2);
    expect(stopped[0]?.stoppedReason).toMatch(/qualified/);
  });

  it("defers a task without using up an attempt", async () => {
    const { task } = await enqueueTask({ type: "later", dedupeKey: "later:1" });
    const until = new Date(Date.now() + 60 * 60_000);
    const report = await runWorker({ handlers: { later: async () => ({ defer: { until, reason: "Daily limit reached" } }) }, budgetMs: 5000 });
    expect(report.deferred).toBe(1);
    const t = await ResearchTask.findById(task._id).lean();
    expect(t).toMatchObject({ status: "PENDING", attempts: 0, error: "Daily limit reached" });
    expect(t?.runAfter.getTime()).toBe(until.getTime());
    expect(t?.activeKey).toBe("later:1");
  });
});
