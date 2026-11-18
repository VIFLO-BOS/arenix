import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { Prospect, Suppression, type ProspectDoc } from "@/server/db/models/research";
import { getResearchSettings } from "@/server/ai/settings";
import { SOURCE_LABEL, type VerificationLevel } from "@/types/research";
import { cleanCandidate, dedupeCandidates, findMatch, type CleanCandidate, type MatchTarget } from "./merge";
import { emailDomain, suppressionHash } from "./normalise";
import { applyAiAdjustment, baseScore, scoreBand } from "./score";
import { decideWebsiteStatus } from "./website-status";
import type { DiscoveryCandidate, SiteCheck } from "./types";

/** Database side of merging, opt outs and scoring for prospects. */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* -------------------------------- Opt outs ------------------------------- */

export interface SuppressionCheck {
  domain?: string;
  emails?: string[];
  phones?: string[];
}

/** Hashes on the opt out list among the given values. */
export async function suppressedSet(values: SuppressionCheck): Promise<Set<string>> {
  const hashes: string[] = [];
  if (values.domain) hashes.push(suppressionHash("DOMAIN", values.domain));
  for (const e of values.emails ?? []) {
    hashes.push(suppressionHash("EMAIL", e));
    hashes.push(suppressionHash("DOMAIN", emailDomain(e)));
  }
  for (const p of values.phones ?? []) hashes.push(suppressionHash("PHONE", p));
  if (!hashes.length) return new Set();
  await connectDb();
  const rows = await Suppression.find({ valueHash: { $in: hashes } }).select("valueHash").lean();
  return new Set(rows.map((r) => r.valueHash));
}

export const isDomainSuppressed = (set: Set<string>, domain?: string) => !!domain && set.has(suppressionHash("DOMAIN", domain));
export const isEmailSuppressed = (set: Set<string>, email: string) => set.has(suppressionHash("EMAIL", email)) || set.has(suppressionHash("DOMAIN", emailDomain(email)));
export const isPhoneSuppressed = (set: Set<string>, phone: string) => set.has(suppressionHash("PHONE", phone));

/* --------------------------------- Merging -------------------------------- */

function toTarget(p: Pick<ProspectDoc, "_id" | "normalisedName" | "domain" | "contacts" | "googlePlaceId" | "osmId" | "registration" | "location">): MatchTarget {
  return {
    id: p._id.toString(),
    normalisedName: p.normalisedName,
    domain: p.domain,
    phones: p.contacts.filter((c) => c.kind === "PHONE" || c.kind === "WHATSAPP").map((c) => c.value),
    googlePlaceId: p.googlePlaceId,
    osmId: p.osmId,
    registryNumber: p.registration?.number,
    city: p.location?.city,
  };
}

async function matchStored(c: CleanCandidate): Promise<string | undefined> {
  const or: Record<string, unknown>[] = [];
  if (c.domain) or.push({ domain: c.domain });
  if (c.googlePlaceId) or.push({ googlePlaceId: c.googlePlaceId });
  if (c.osmId) or.push({ osmId: c.osmId });
  if (c.phone) or.push({ "contacts.value": c.phone });
  if (c.registry?.number) or.push({ "registration.number": c.registry.number });
  const first = c.normalisedName.split(" ")[0];
  if (first) or.push({ normalisedName: new RegExp(`^${escapeRe(first)}`) });
  const rows = await Prospect.find({ $or: or }).select("normalisedName domain contacts googlePlaceId osmId registration location").limit(60).lean();
  return findMatch(c, rows.map(toTarget));
}

export interface UpsertReport {
  created: number;
  merged: number;
  skippedOptOut: number;
  /** Google Maps results that matched no business from another source, so were not kept. */
  notKept: number;
  prospectIds: string[];
}

/**
 * Google's Places policies allow place IDs to be stored indefinitely but prohibit copying and
 * saving business names and addresses. So a Google Maps result only confirms a business that
 * another source found: it adds its Found by badge, the place ID and the "lists no website"
 * signal, and never creates a row or stores Google's details.
 * https://developers.google.com/maps/documentation/places/web-service/policies
 */
const CONFIRM_ONLY = new Set(["google_places"]);

/**
 * Adds a source's results to the prospects. A business already known gets the new Found by
 * badge and any details it was missing. Opted out domains are skipped entirely, and opted
 * out email addresses and numbers are never stored.
 */
export async function upsertCandidates(searchId: string, raw: DiscoveryCandidate[], fallbackCountry?: string): Promise<UpsertReport> {
  await connectDb();
  const clean = dedupeCandidates(raw.map((r) => cleanCandidate(r, fallbackCountry)).filter((c): c is CleanCandidate => !!c));
  const report: UpsertReport = { created: 0, merged: 0, skippedOptOut: 0, notKept: 0, prospectIds: [] };
  const sid = new Types.ObjectId(searchId);
  const now = new Date();

  for (const c of clean) {
    if (CONFIRM_ONLY.has(c.foundBy)) {
      // Google's website and phone are used here for matching only. They are not stored.
      const matchId = await matchStored(c);
      const label = SOURCE_LABEL[c.foundBy] ?? c.foundBy;
      if (!matchId) {
        report.notKept += 1;
        continue;
      }
      const update: Record<string, unknown> = { $set: { googlePlaceId: c.googlePlaceId } };
      const already = await Prospect.exists({ _id: matchId, foundBy: { $elemMatch: { provider: c.foundBy, searchId: sid } } });
      update.$push = already ? undefined : { foundBy: { provider: c.foundBy, searchId: sid, sourceUrls: c.sourceUrls, evidence: "Listed on Google Maps", at: now } };
      if (c.listsNoWebsite) update.$addToSet = { "website.noWebsiteSources": label };
      if (!update.$push) delete update.$push;
      await Prospect.updateOne({ _id: matchId }, update);
      report.merged += 1;
      report.prospectIds.push(matchId);
      continue;
    }
    const blocked = await suppressedSet({ domain: c.domain, emails: c.email ? [c.email] : [], phones: c.phone ? [c.phone] : [] });
    if (isDomainSuppressed(blocked, c.domain)) {
      report.skippedOptOut += 1;
      continue;
    }
    // Directory and registry listings are real records. An AI answer is unverified until its source is checked.
    const level: VerificationLevel = c.foundBy === "anthropic" || c.foundBy === "gemini" || c.foundBy === "openai" ? "UNVERIFIED" : "PARTLY_VERIFIED";
    const contacts = [
      ...(c.phone && !isPhoneSuppressed(blocked, c.phone) ? [{ kind: "PHONE" as const, value: c.phone, verification: level, sourceUrl: c.sourceUrls[0], seenAt: now }] : []),
      ...(c.email && !isEmailSuppressed(blocked, c.email) ? [{ kind: "EMAIL" as const, value: c.email, verification: level, sourceUrl: c.sourceUrls[0], seenAt: now }] : []),
    ];
    const foundBy = { provider: c.foundBy, searchId: sid, sourceUrls: c.sourceUrls, evidence: c.evidence, at: now };
    const label = SOURCE_LABEL[c.foundBy] ?? c.foundBy;

    const matchId = await matchStored(c);
    if (!matchId) {
      const doc = await Prospect.create({
        name: c.name,
        normalisedName: c.normalisedName,
        domain: c.domain,
        location: { country: c.country, region: c.region, city: c.city },
        address: c.address,
        industry: c.industry,
        registration: c.registry ? { registry: c.registry.name, number: c.registry.number, companyStatus: c.registry.status, status: "VERIFIED", sourceUrl: c.sourceUrls[0], checkedAt: now } : { status: "NOT_CHECKED" },
        website: { url: c.website, status: "WEBSITE_STATUS_UNKNOWN", evidence: [], failures: [], noWebsiteSources: c.listsNoWebsite ? [label] : [] },
        contacts,
        foundBy: [foundBy],
        verification: level,
        googlePlaceId: c.googlePlaceId,
        osmId: c.osmId,
        research: { state: "IDLE" },
      });
      report.created += 1;
      report.prospectIds.push(doc._id.toString());
      continue;
    }

    const doc = await Prospect.findById(matchId);
    if (!doc) continue;
    const already = doc.foundBy.some((f) => f.provider === c.foundBy && f.searchId?.toString() === searchId);
    if (!already) doc.foundBy.push(foundBy);
    if (!doc.website.url && c.website) {
      doc.website.url = c.website;
      doc.domain = c.domain;
    }
    doc.location.city ??= c.city;
    doc.location.region ??= c.region;
    doc.location.country ??= c.country;
    doc.address ??= c.address;
    doc.industry ??= c.industry;
    doc.googlePlaceId ??= c.googlePlaceId;
    doc.osmId ??= c.osmId;
    if (c.registry && doc.registration.status !== "VERIFIED") {
      doc.registration = { registry: c.registry.name, number: c.registry.number, companyStatus: c.registry.status, status: "VERIFIED", sourceUrl: c.sourceUrls[0], checkedAt: now };
    }
    for (const contact of contacts) if (!doc.contacts.some((x) => x.value === contact.value)) doc.contacts.push(contact);
    if (c.listsNoWebsite && !doc.website.noWebsiteSources.includes(label)) doc.website.noWebsiteSources.push(label);
    if (doc.verification === "UNVERIFIED" && level === "PARTLY_VERIFIED") doc.verification = level;
    await doc.save();
    report.merged += 1;
    report.prospectIds.push(doc._id.toString());
  }
  report.prospectIds = [...new Set(report.prospectIds)];
  return report;
}

/* --------------------------- Website status, score -------------------------- */

/** Recomputes the website status from what is stored. Returns when a recheck is needed. */
export function websiteDecision(p: Pick<ProspectDoc, "website">, check?: SiteCheck, now = new Date()) {
  return decideWebsiteStatus({
    hasWebsite: !!p.website.url,
    check,
    previousFailures: p.website.failures ?? [],
    pagespeedPerformance: p.website.pagespeed?.performance,
    noWebsiteSources: p.website.noWebsiteSources ?? [],
    now,
  });
}

/** Recomputes the base score and keeps the last AI adjustment. Plain code, no AI and no cost. */
export async function rescore(prospectId: string): Promise<void> {
  await connectDb();
  const p = await Prospect.findById(prospectId).lean();
  if (!p) return;
  const settings = await getResearchSettings();
  const about = [p.description, ...(p.offerings ?? []).slice(0, 15)].filter(Boolean).join(". ");
  const base = baseScore(
    {
      websiteStatus: p.website.status,
      industry: p.industry,
      about,
      sizeHint: p.sizeHint,
      hiringSignals: p.hiringSignals ?? [],
      contacts: p.contacts.map((c) => ({ kind: c.kind, verification: c.verification })),
      people: p.people.map((x) => ({ title: x.title, verification: x.verification })),
    },
    settings.scoring,
    settings.targeting.industries,
  );
  const adj = p.score?.aiAdjustment ?? 0;
  const value = Math.max(0, Math.min(100, base.value + adj));
  await Prospect.updateOne(
    { _id: p._id },
    { $set: { score: { value, band: scoreBand(value), base: base.value, breakdown: base.breakdown, explanations: base.explanations, aiAdjustment: adj, reasons: p.score?.reasons ?? [], scoredAt: new Date() } } },
  );
}

/** Stores an AI adjustment on top of a fresh base score. */
export async function storeAiScore(prospectId: string, adjustment: number, reasons: { text: string; evidence: string[] }[], evidenceIds: Set<string>): Promise<void> {
  await rescore(prospectId);
  const p = await Prospect.findById(prospectId).select("score").lean();
  if (!p?.score) return;
  const base = p.score.base ?? p.score.value - p.score.aiAdjustment;
  const applied = applyAiAdjustment(base, adjustment, reasons, evidenceIds);
  await Prospect.updateOne({ _id: prospectId }, { $set: { "score.value": applied.value, "score.band": applied.band, "score.aiAdjustment": applied.aiAdjustment, "score.reasons": applied.reasons, "score.scoredAt": new Date() } });
}
