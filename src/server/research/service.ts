import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { Client, Lead, Organization, type LeadPriority } from "@/server/db/models/crm";
import { OutreachDraft, Prospect, ProspectSearch, ResearchTask, Suppression, type OutreachDraftDoc, type ProspectDoc } from "@/server/db/models/research";
import { recordAudit } from "@/server/services/audit";
import { addLeadActivity } from "@/server/services/crm";
import type { CurrentUser } from "@/server/auth/session";
import { adapters } from "@/server/ai";
import { estimateCostUsd } from "@/server/ai/pricing";
import { getResearchSettings } from "@/server/ai/settings";
import { loadSpend } from "@/server/ai/usage";
import { TASK_DEFAULTS } from "@/server/ai/generate";
import { integrations } from "@/lib/env";
import {
  AI_PROVIDERS,
  AI_PROVIDER_LABEL,
  SCORE_BAND_LABEL,
  SOURCE_LABEL,
  WEBSITE_STATUS_LABEL,
  REGISTRATION_LABEL,
  VERIFICATION_LABEL,
  type AiProviderId,
  type RegistrationStatus,
  type ScoreBand,
  type SuppressionKind,
  type VerificationLevel,
  type WebsiteStatus,
} from "@/types/research";
import { discoveryPrompt, parseRequest, searchesFor } from "./ai-discovery";
import { cancelTasks, enqueueTask } from "./queue";
import { domainOf, normaliseEmail, normaliseName, normalisePhone, stableHash, suppressionHash } from "./normalise";
import { queueResearch, type StoredFilters } from "./pipeline";

/** What the lead research screens read and change. Every function checks nothing about the user; actions do. */

const PAGE_SIZE = 25;
const DAY_MS = 24 * 60 * 60_000;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* --------------------------------- Sources -------------------------------- */

export interface SourceOption {
  id: string;
  label: string;
  kind: "ai" | "directory";
  available: boolean;
  /** Why it cannot be chosen, or what it costs. */
  note: string;
  /** Worst case cost for one search, for AI sources. */
  estimateUsd?: number;
}

export async function sourceOptions(maxResults = 20): Promise<SourceOption[]> {
  const settings = await getResearchSettings();
  const out: SourceOption[] = [];
  const query = { text: "x".repeat(200), keywords: [], websiteFilter: "any" as const, maxResults };
  for (const p of settings.providerOrder) {
    const ps = settings.providers[p];
    const configured = adapters[p].isConfigured();
    const estimate = estimateCostUsd({ settings, provider: p, model: ps.models.research, promptText: discoveryPrompt(query) + "x".repeat(1500), maxOutputTokens: TASK_DEFAULTS.research.maxOutputTokens, maxSearches: searchesFor(maxResults) });
    out.push({
      id: p,
      label: AI_PROVIDER_LABEL[p],
      kind: "ai",
      available: configured && ps.enabled && estimate !== null,
      note: !configured ? "No API key" : !ps.enabled ? "Switched off in settings" : estimate === null ? "Model has no price" : `Up to about $${estimate.toFixed(2)} a search with ${ps.models.research}`,
      estimateUsd: estimate ?? undefined,
    });
  }
  out.push({ id: "google_places", label: "Google Maps", kind: "directory", available: integrations.research.googlePlaces.configured, note: integrations.research.googlePlaces.configured ? `Confirms businesses the other sources find. Google's terms do not allow saving its business details. Free up to ${settings.placesMonthlyLimit} requests a month` : "No API key" });
  out.push({ id: "openstreetmap", label: "OpenStreetMap", kind: "directory", available: true, note: "Free open map data" });
  out.push({ id: "companies_house", label: "Companies House", kind: "directory", available: integrations.research.companiesHouse.configured, note: integrations.research.companiesHouse.configured ? "Free, United Kingdom only" : "No API key, United Kingdom only" });
  return out;
}

/* --------------------------------- Searches -------------------------------- */

export interface SearchInput {
  text: string;
  industry?: string;
  keywords?: string;
  country?: string;
  region?: string;
  city?: string;
  websiteFilter: "any" | "none" | "has";
  maxResults: number;
  sources: string[];
  autoResearch: boolean;
  refresh: boolean;
}

export async function createSearch(actor: CurrentUser, input: SearchInput): Promise<{ searchId: string; reused: boolean }> {
  await connectDb();
  const options = await sourceOptions(input.maxResults);
  const sources = [...new Set(input.sources)];
  if (!sources.length) throw new Error("Choose at least one AI or data source.");
  if (sources.every((s) => s === "google_places")) throw new Error("Google Maps only confirms businesses that another source finds. Choose at least one other source too.");
  for (const s of sources) {
    const o = options.find((x) => x.id === s);
    if (!o) throw new Error(`Unknown source ${s}.`);
    if (!o.available) throw new Error(`${o.label} cannot be used right now. ${o.note}.`);
  }

  const filters: StoredFilters = {
    text: input.text.trim(),
    industry: input.industry?.trim() || undefined,
    keywords: (input.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 8),
    country: input.country?.trim() || undefined,
    region: input.region?.trim() || undefined,
    city: input.city?.trim() || undefined,
    websiteFilter: input.websiteFilter,
    maxResults: input.maxResults,
    autoResearch: input.autoResearch,
  };

  // Only fill in what the form left empty, and only when an AI is available to read the request.
  const needsParsing = !filters.industry && !filters.keywords.length && !filters.city && !filters.country;
  if (needsParsing && options.some((o) => o.kind === "ai" && o.available)) {
    try {
      const parsed = await parseRequest(filters.text, { userId: actor.id });
      filters.industry ??= parsed.industry ?? undefined;
      filters.keywords = filters.keywords.length ? filters.keywords : parsed.keywords.slice(0, 5);
      filters.city ??= parsed.city ?? undefined;
      filters.region ??= parsed.region ?? undefined;
      filters.country ??= parsed.country ?? undefined;
      if (filters.websiteFilter === "any") filters.websiteFilter = parsed.websiteFilter;
    } catch {
      // The search still runs on the typed text.
    }
  }
  if (sources.some((s) => s === "openstreetmap" || s === "google_places") && !filters.city && !filters.region && !filters.country) {
    throw new Error("Add a city, state or country so the map sources know where to look.");
  }

  const queryHash = stableHash({ ...filters, text: normaliseName(filters.text), sources: [...sources].sort() });
  if (!input.refresh) {
    const recent = await ProspectSearch.findOne({ queryHash, createdAt: { $gte: new Date(Date.now() - DAY_MS) }, status: { $nin: ["FAILED", "CANCELLED"] } }).sort({ createdAt: -1 }).select("_id").lean();
    if (recent) return { searchId: recent._id.toString(), reused: true };
  }

  // Cost check before anything is queued.
  const settings = await getResearchSettings();
  const spend = await loadSpend();
  const aiSources = sources.filter((s): s is AiProviderId => (AI_PROVIDERS as readonly string[]).includes(s));
  const estimate = aiSources.reduce((n, s) => n + (options.find((o) => o.id === s)?.estimateUsd ?? 0), 0);
  if (estimate > settings.budget.perSearchCapUsd * Math.max(1, aiSources.length)) {
    throw new Error(`This search may cost up to $${estimate.toFixed(2)}, above the limit of $${settings.budget.perSearchCapUsd.toFixed(2)} for one search per AI. Choose fewer businesses or raise the limit in settings.`);
  }
  const remaining = settings.budget.monthlyCapUsd - spend.monthTotalUsd;
  if (estimate > remaining) throw new Error(`This search may cost up to $${estimate.toFixed(2)} and only $${Math.max(0, remaining).toFixed(2)} of this month's budget is left.`);
  for (const s of aiSources) {
    const left = settings.providers[s].monthlyCapUsd - (spend.monthByProvider[s] ?? 0);
    const est = options.find((o) => o.id === s)?.estimateUsd ?? 0;
    if (est > left) throw new Error(`${AI_PROVIDER_LABEL[s]} may cost up to $${est.toFixed(2)} and only $${Math.max(0, left).toFixed(2)} of its monthly budget is left.`);
  }

  const search = await ProspectSearch.create({
    query: filters.text,
    filters: filters as unknown as Record<string, unknown>,
    providers: sources,
    status: "QUEUED",
    progress: { total: sources.length, done: 0, failed: 0 },
    estimatedCostUsd: estimate,
    queryHash,
    createdBy: new Types.ObjectId(actor.id),
  });
  const searchId = search._id.toString();
  for (const source of sources) await enqueueTask({ type: "discover", searchId, payload: { source }, dedupeKey: `discover:${searchId}:${source}`, createdBy: actor.id, maxAttempts: 2 });
  await recordAudit({ actor, action: "lead_research.search", entityType: "ProspectSearch", entityId: searchId, metadata: { sources, estimate } });
  return { searchId, reused: false };
}

export async function cancelSearch(actor: CurrentUser, searchId: string): Promise<void> {
  await connectDb();
  await ProspectSearch.updateOne({ _id: searchId }, { $set: { cancelRequested: true, status: "CANCELLED", finishedAt: new Date() } });
  await cancelTasks({ searchId });
  await recordAudit({ actor, action: "lead_research.search_cancel", entityType: "ProspectSearch", entityId: searchId });
}

export async function listSearches(limit = 30) {
  await connectDb();
  return ProspectSearch.find({}).sort({ createdAt: -1 }).limit(limit).populate("createdBy", "name").lean();
}

export async function getSearch(searchId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(searchId)) return null;
  const search = await ProspectSearch.findById(searchId).populate("createdBy", "name").lean();
  if (!search) return null;
  const tasks = await ResearchTask.find({ searchId: search._id, type: "discover" }).select("status payload result error attempts").lean();
  const open = await ResearchTask.countDocuments({ searchId: search._id, status: { $in: ["PENDING", "RUNNING"] } });
  return {
    search,
    open,
    sources: tasks.map((t) => ({
      source: String(t.payload?.source ?? ""),
      status: t.status,
      found: Number(t.result?.found ?? 0),
      created: Number(t.result?.created ?? 0),
      merged: Number(t.result?.merged ?? 0),
      notes: String(t.result?.notes ?? ""),
      error: t.error,
    })),
  };
}

/* ------------------------------ Unified table ------------------------------ */

export interface ProspectFilter {
  searchId?: string;
  q?: string;
  foundBy?: string;
  websiteStatus?: string;
  band?: string;
  verification?: string;
  location?: string;
  industry?: string;
  inLeads?: "yes" | "no";
  show?: "active" | "dismissed";
  sort?: "score" | "newest" | "name";
  page?: number;
}

export interface FieldValue {
  value: string;
  source?: string;
  seenAt?: string;
  verification?: VerificationLevel;
}

/** One row of the unified results table. Plain values, safe to send to the browser. */
export interface ProspectRow {
  id: string;
  name: string;
  foundBy: string[];
  /** How many different AIs found it. Shown as a confidence signal only. */
  aiAgreement: number;
  industry?: string;
  location?: string;
  registration: { status: RegistrationStatus; label: string; registry?: string; number?: string };
  website?: string;
  websiteStatus: WebsiteStatus;
  websiteStatusLabel: string;
  decisionMaker?: FieldValue & { title?: string };
  email?: FieldValue;
  phone?: FieldValue;
  whatsapp?: FieldValue;
  linkedin?: string;
  score?: { value: number; band: ScoreBand; label: string };
  opportunity?: string;
  verification: VerificationLevel;
  verificationLabel: string;
  sources: string[];
  leadId?: string;
  dismissed: boolean;
  research: { state: string; step?: string };
  stale: boolean;
}

function buildFilter(f: ProspectFilter): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  if (f.searchId && Types.ObjectId.isValid(f.searchId)) q["foundBy.searchId"] = new Types.ObjectId(f.searchId);
  if (f.show === "dismissed") q.dismissedAt = { $exists: true };
  else q.dismissedAt = { $exists: false };
  if (f.q) {
    const re = new RegExp(escapeRe(f.q.slice(0, 80)), "i");
    and.push({ $or: [{ name: re }, { domain: re }, { industry: re }] });
  }
  if (f.foundBy) q["foundBy.provider"] = f.foundBy;
  if (f.websiteStatus) q["website.status"] = f.websiteStatus;
  if (f.band) q["score.band"] = f.band;
  if (f.verification) q.verification = f.verification;
  if (f.industry) q.industry = new RegExp(escapeRe(f.industry.slice(0, 60)), "i");
  if (f.location) {
    const re = new RegExp(escapeRe(f.location.slice(0, 60)), "i");
    and.push({ $or: [{ "location.city": re }, { "location.region": re }, { "location.country": re }] });
  }
  if (f.inLeads === "yes") q.leadId = { $exists: true };
  if (f.inLeads === "no") q.leadId = { $exists: false };
  if (and.length) q.$and = and;
  return q;
}

const pickContact = (p: ProspectDoc, kind: "EMAIL" | "PHONE" | "WHATSAPP"): FieldValue | undefined => {
  const order: VerificationLevel[] = ["VERIFIED", "PARTLY_VERIFIED", "UNVERIFIED"];
  const c = p.contacts.filter((x) => x.kind === kind).sort((a, b) => order.indexOf(a.verification) - order.indexOf(b.verification))[0];
  return c ? { value: c.value, source: c.sourceUrl, seenAt: c.seenAt ? new Date(c.seenAt).toISOString() : undefined, verification: c.verification } : undefined;
};

const STALE_MS = 90 * DAY_MS;

export function toRow(p: ProspectDoc): ProspectRow {
  const person = p.people.find((x) => x.title && x.verification === "VERIFIED") ?? p.people.find((x) => x.title) ?? p.people[0];
  const foundBy = [...new Set(p.foundBy.map((f) => f.provider))];
  const reg = p.registration ?? { status: "NOT_CHECKED" as RegistrationStatus };
  return {
    id: p._id.toString(),
    name: p.name,
    foundBy,
    aiAgreement: foundBy.filter((f) => (AI_PROVIDERS as readonly string[]).includes(f)).length,
    industry: p.industry,
    location: [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(", ") || undefined,
    registration: { status: reg.status, label: REGISTRATION_LABEL[reg.status], registry: reg.registry, number: reg.number },
    website: p.website?.url,
    websiteStatus: p.website?.status ?? "WEBSITE_STATUS_UNKNOWN",
    websiteStatusLabel: WEBSITE_STATUS_LABEL[p.website?.status ?? "WEBSITE_STATUS_UNKNOWN"],
    decisionMaker: person ? { value: person.name, title: person.title, source: person.sourceUrl, seenAt: person.seenAt ? new Date(person.seenAt).toISOString() : undefined, verification: person.verification } : undefined,
    email: pickContact(p, "EMAIL"),
    phone: pickContact(p, "PHONE"),
    whatsapp: pickContact(p, "WHATSAPP"),
    linkedin: person?.linkedinUrl ?? p.socials.find((s) => s.platform === "linkedin")?.url,
    score: p.score ? { value: p.score.value, band: p.score.band, label: SCORE_BAND_LABEL[p.score.band] } : undefined,
    opportunity: p.summary?.opportunities?.[0] ?? p.summary?.whyApproach ?? (p.website?.status === "NO_WEBSITE_FOUND" ? "No website found" : p.website?.status === "OUTDATED_WEBSITE" ? "Outdated website" : p.website?.status === "BROKEN_WEBSITE" ? "Broken website" : undefined),
    verification: p.verification ?? "UNVERIFIED",
    verificationLabel: VERIFICATION_LABEL[p.verification ?? "UNVERIFIED"],
    sources: [...new Set(p.foundBy.flatMap((f) => (f.confirmedUrls?.length ? f.confirmedUrls : f.sourceUrls)))].slice(0, 4),
    leadId: p.leadId?.toString(),
    dismissed: !!p.dismissedAt,
    research: { state: p.research?.state ?? "IDLE", step: p.research?.step },
    stale: !!p.lastResearchedAt && Date.now() - new Date(p.lastResearchedAt).getTime() > STALE_MS,
  };
}

export async function listProspects(f: ProspectFilter): Promise<{ rows: ProspectRow[]; total: number; page: number; pages: number }> {
  await connectDb();
  const filter = buildFilter(f);
  const page = Math.max(1, f.page ?? 1);
  const sort: Record<string, 1 | -1> = f.sort === "name" ? { normalisedName: 1 } : f.sort === "newest" ? { createdAt: -1 } : { "score.value": -1, createdAt: -1 };
  const [docs, total] = await Promise.all([Prospect.find(filter).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(), Prospect.countDocuments(filter)]);
  return { rows: docs.map((d) => toRow(d as ProspectDoc)), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/* ---------------------------------- Export --------------------------------- */

const csvCell = (v: unknown) => {
  let s = v === undefined || v === null ? "" : String(v);
  // Cells that start like a formula are prefixed so a spreadsheet never runs them.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV for the rows matching the filter, up to 5,000. UTF 8 with a byte order mark so Excel reads it. */
export async function exportCsv(f: ProspectFilter, ids?: string[]): Promise<{ csv: string; count: number }> {
  await connectDb();
  const filter = ids?.length ? { _id: { $in: ids.map((i) => new Types.ObjectId(i)) } } : buildFilter(f);
  const docs = await Prospect.find(filter).sort({ "score.value": -1 }).limit(5000).lean();
  const head = ["Business name", "Found by", "Industry", "Location", "Registration", "Registry number", "Website", "Website status", "Decision maker", "Job title", "Email", "Phone", "WhatsApp", "LinkedIn", "Lead score", "Score band", "Opportunity", "Verification", "Sources", "In Leads"];
  const lines = [head.map(csvCell).join(",")];
  for (const d of docs) {
    const r = toRow(d as ProspectDoc);
    lines.push(
      [r.name, r.foundBy.map((x) => SOURCE_LABEL[x] ?? x).join(" "), r.industry, r.location, r.registration.label, r.registration.number, r.website, r.websiteStatusLabel, r.decisionMaker?.value, r.decisionMaker?.title, r.email?.value, r.phone?.value, r.whatsapp?.value, r.linkedin, r.score?.value, r.score?.label, r.opportunity, r.verificationLabel, r.sources.join(" "), r.leadId ? "Yes" : "No"]
        .map(csvCell)
        .join(","),
    );
  }
  return { csv: `﻿${lines.join("\r\n")}\r\n`, count: docs.length };
}

/* --------------------------------- Prospects -------------------------------- */

export async function getProspect(id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  const prospect = await Prospect.findById(id).populate("registration.checkedBy", "name").lean();
  if (!prospect) return null;
  const [drafts, lead, openTasks] = await Promise.all([
    OutreachDraft.find({ prospectId: prospect._id }).sort({ createdAt: -1, step: 1 }).limit(60).lean(),
    prospect.leadId ? Lead.findById(prospect.leadId).select("title status").lean() : null,
    ResearchTask.find({ prospectId: prospect._id, status: { $in: ["PENDING", "RUNNING"] } }).select("type status runAfter").lean(),
  ]);
  return { prospect, drafts, lead, openTasks };
}

export async function setDismissed(actor: CurrentUser, ids: string[], dismissed: boolean): Promise<number> {
  await connectDb();
  const res = await Prospect.updateMany({ _id: { $in: ids.map((i) => new Types.ObjectId(i)) } }, dismissed ? { $set: { dismissedAt: new Date() } } : { $unset: { dismissedAt: 1 } });
  await recordAudit({ actor, action: dismissed ? "lead_research.dismiss" : "lead_research.restore", entityType: "Prospect", metadata: { count: ids.length } });
  return res.modifiedCount;
}

export async function deleteProspect(actor: CurrentUser, id: string): Promise<void> {
  await connectDb();
  const p = await Prospect.findById(id).select("leadId name").lean();
  if (!p) return;
  await OutreachDraft.deleteMany({ prospectId: p._id });
  await ResearchTask.updateMany({ prospectId: p._id, status: "PENDING" }, { $set: { status: "CANCELLED", finishedAt: new Date() }, $unset: { activeKey: 1 } });
  await Prospect.deleteOne({ _id: p._id });
  if (p.leadId) await Lead.updateOne({ _id: p.leadId }, { $unset: { prospectId: 1 } });
  await recordAudit({ actor, action: "lead_research.delete", entityType: "Prospect", entityId: id });
}

export async function queueResearchFor(actor: CurrentUser, ids: string[], analyse: boolean): Promise<number> {
  let n = 0;
  for (const id of ids.slice(0, 100)) if (await queueResearch(id, { userId: actor.id, analyse, force: true })) n += 1;
  await recordAudit({ actor, action: analyse ? "lead_research.analyse" : "lead_research.research", entityType: "Prospect", metadata: { count: ids.length } });
  return n;
}

/** Records a manual registry check, for example on the CAC public search. */
export async function recordRegistration(actor: CurrentUser, id: string, input: { status: RegistrationStatus; registry: string; number?: string; note?: string }): Promise<void> {
  await connectDb();
  await Prospect.updateOne(
    { _id: id },
    { $set: { registration: { registry: input.registry, number: input.number || undefined, status: input.status, note: input.note || undefined, checkedBy: new Types.ObjectId(actor.id), checkedAt: new Date() } } },
  );
  await recordAudit({ actor, action: "lead_research.registration", entityType: "Prospect", entityId: id, metadata: { status: input.status, registry: input.registry } });
}

/* -------------------------------- Add to Leads ------------------------------ */

const PRIORITY: Record<ScoreBand, LeadPriority> = { HIGH_PRIORITY: "HIGH", QUALIFIED: "MEDIUM", POTENTIAL: "MEDIUM", LOW_PRIORITY: "LOW" };

export type AddToLeadsResult = { status: "created"; leadId: string } | { status: "duplicate"; leadId: string; title: string; reason: string } | { status: "updated"; leadId: string };

/** Finds a lead that already covers this business: by research link, website domain, phone or name. */
export async function findExistingLead(p: Pick<ProspectDoc, "_id" | "leadId" | "domain" | "name" | "contacts">): Promise<{ leadId: string; title: string; reason: string } | null> {
  const byProspect = (p.leadId ? await Lead.findById(p.leadId).select("title").lean() : null) ?? (await Lead.findOne({ prospectId: p._id }).select("title").lean());
  if (byProspect) return { leadId: byProspect._id.toString(), title: byProspect.title, reason: "It was added from this research before." };
  const phones = p.contacts.filter((c) => c.kind !== "EMAIL").map((c) => c.value);
  const orgOr: Record<string, unknown>[] = [{ name: new RegExp(`^${escapeRe(p.name.trim())}$`, "i") }];
  if (p.domain) orgOr.push({ domain: p.domain });
  if (phones.length) orgOr.push({ phone: { $in: phones } });
  const orgs = await Organization.find({ $or: orgOr }).select("_id name domain phone").limit(10).lean();
  const emails = p.contacts.filter((c) => c.kind === "EMAIL").map((c) => c.value);
  const clients = emails.length || phones.length ? await Client.find({ $or: [...(emails.length ? [{ email: { $in: emails } }] : []), ...(phones.length ? [{ phone: { $in: phones } }, { whatsapp: { $in: phones } }] : [])] }).select("_id").limit(10).lean() : [];
  const lead = await Lead.findOne({ $or: [{ organizationId: { $in: orgs.map((o) => o._id) } }, { clientId: { $in: clients.map((c) => c._id) } }], status: { $ne: "ARCHIVED" } }).sort({ updatedAt: -1 }).select("title organizationId").lean();
  if (!lead) return null;
  const org = orgs.find((o) => o._id.equals(lead.organizationId));
  const reason = org ? (p.domain && org.domain === p.domain ? `An organisation with the domain ${p.domain} already has this lead.` : org.phone && phones.includes(org.phone) ? "An organisation with the same phone number already has this lead." : `An organisation named ${org.name} already has this lead.`) : "A client with the same email address or phone number already has this lead.";
  return { leadId: lead._id.toString(), title: lead.title, reason };
}

export async function addToLeads(actor: CurrentUser, prospectId: string, mode: "create" | "update" = "create"): Promise<AddToLeadsResult> {
  await connectDb();
  const p = await Prospect.findById(prospectId).lean();
  if (!p) throw new Error("This business no longer exists.");
  if (p.optedOutAt) throw new Error("This business asked not to be contacted, so it cannot be added to Leads.");
  const existing = await findExistingLead(p);
  const profile = `/admin/leads/prospects/${prospectId}`;

  if (existing) {
    if (mode !== "update") return { status: "duplicate", ...existing };
    await Lead.updateOne(
      { _id: existing.leadId },
      { $set: { prospectId: p._id }, $push: { activities: { kind: "SYSTEM", body: `Research linked from lead research. Score ${p.score?.value ?? "not scored"}. Profile ${profile}`, authorId: new Types.ObjectId(actor.id), authorLabel: actor.name, at: new Date() } } },
    );
    const lead = await Lead.findById(existing.leadId).select("organizationId").lean();
    if (lead?.organizationId) {
      const org = await Organization.findById(lead.organizationId);
      if (org) {
        org.website ??= p.website.url;
        org.domain ??= p.domain;
        org.industry ??= p.industry;
        org.country ??= p.location?.country;
        org.city ??= p.location?.city;
        org.phone ??= p.contacts.find((c) => c.kind === "PHONE")?.value;
        org.prospectId ??= p._id;
        await org.save();
      }
    }
    await Prospect.updateOne({ _id: p._id }, { $set: { leadId: new Types.ObjectId(existing.leadId) } });
    await OutreachDraft.updateMany({ prospectId: p._id, leadId: { $exists: false } }, { $set: { leadId: new Types.ObjectId(existing.leadId) } });
    await recordAudit({ actor, action: "lead_research.link_lead", entityType: "Lead", entityId: existing.leadId, metadata: { prospectId } });
    return { status: "updated", leadId: existing.leadId };
  }

  const phone = p.contacts.find((c) => c.kind === "PHONE" && c.verification === "VERIFIED")?.value ?? p.contacts.find((c) => c.kind === "PHONE")?.value;
  const org = await Organization.create({ name: p.name, website: p.website.url, domain: p.domain, industry: p.industry, country: p.location?.country, city: p.location?.city, phone, prospectId: p._id, notes: p.summary?.whatTheyDo });

  // A client record only for a verified decision maker, with the business's public details.
  let clientId: Types.ObjectId | undefined;
  const person = p.people.find((x) => x.verification === "VERIFIED" && x.title);
  if (person) {
    const email = p.contacts.find((c) => c.kind === "EMAIL" && c.verification === "VERIFIED")?.value;
    const whatsapp = p.contacts.find((c) => c.kind === "WHATSAPP" && c.verification === "VERIFIED")?.value;
    const client = await Client.create({ name: person.name, jobTitle: person.title, email, phone, whatsapp, organizationId: org._id, preferredContact: email ? "EMAIL" : whatsapp ? "WHATSAPP" : "PHONE", source: "prospecting", notes: `Public details from ${person.sourceUrl ?? "the business website"}.`, marketingConsent: false });
    clientId = client._id;
  }

  const band = p.score?.band ?? "POTENTIAL";
  const lead = await Lead.create({
    title: p.name,
    status: "NEW",
    priority: PRIORITY[band],
    source: "prospecting",
    clientId,
    organizationId: org._id,
    prospectId: p._id,
    activities: [{ kind: "SYSTEM", body: `Added from lead research. Score ${p.score?.value ?? "not scored"} (${SCORE_BAND_LABEL[band]}). Website ${WEBSITE_STATUS_LABEL[p.website.status].toLowerCase()}. Profile ${profile}`, authorId: new Types.ObjectId(actor.id), authorLabel: actor.name, at: new Date() }],
    statusHistory: [{ to: "NEW", actorId: new Types.ObjectId(actor.id), actorLabel: actor.name, note: "Added from lead research", at: new Date() }],
  });
  await Prospect.updateOne({ _id: p._id }, { $set: { leadId: lead._id } });
  await OutreachDraft.updateMany({ prospectId: p._id }, { $set: { leadId: lead._id } });
  await recordAudit({ actor, action: "lead_research.add_to_leads", entityType: "Lead", entityId: lead._id.toString(), metadata: { prospectId } });
  return { status: "created", leadId: lead._id.toString() };
}

/** The research behind a lead, for the Research card on the lead page. */
export async function researchForLead(leadId: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(leadId)) return null;
  const p = await Prospect.findOne({ leadId: new Types.ObjectId(leadId) }).lean();
  if (!p) return null;
  const drafts = await OutreachDraft.countDocuments({ prospectId: p._id, status: { $in: ["DRAFT", "APPROVED"] } });
  return { row: toRow(p as ProspectDoc), summary: p.summary, drafts };
}

/* --------------------------------- Opt outs -------------------------------- */

function mask(kind: SuppressionKind, value: string): string {
  if (kind === "DOMAIN") return value;
  if (kind === "EMAIL") return `${value[0] ?? ""}***@${value.slice(value.indexOf("@") + 1)}`;
  return `***${value.slice(-3)}`;
}

export function normaliseSuppression(kind: SuppressionKind, raw: string, country?: string): string | undefined {
  if (kind === "DOMAIN") return domainOf(raw.includes("@") ? raw.slice(raw.indexOf("@") + 1) : raw);
  if (kind === "EMAIL") return normaliseEmail(raw);
  return normalisePhone(raw, country ?? "Nigeria");
}

export async function addSuppression(actor: CurrentUser, kind: SuppressionKind, raw: string, reason?: string, country?: string): Promise<{ added: boolean; affected: number }> {
  await connectDb();
  const value = normaliseSuppression(kind, raw, country);
  if (!value) throw new Error(kind === "PHONE" ? "Enter the number in international format, for example +2348031234567." : kind === "EMAIL" ? "Enter a valid email address." : "Enter a website address or domain.");
  const valueHash = suppressionHash(kind, value);
  const res = await Suppression.updateOne({ valueHash }, { $setOnInsert: { kind, valueHash, hint: mask(kind, value), reason: reason || undefined, addedBy: new Types.ObjectId(actor.id) } }, { upsert: true });
  // Stored research is cleaned straight away, not only future research.
  let affected = 0;
  if (kind === "DOMAIN") {
    const docs = await Prospect.find({ domain: value }).select("_id").lean();
    for (const d of docs) {
      await optOutProspectData(d._id);
      affected += 1;
    }
  } else {
    const r = await Prospect.updateMany({ "contacts.value": value }, { $pull: { contacts: { value } } });
    affected = r.modifiedCount;
  }
  await recordAudit({ actor, action: "lead_research.suppression_add", entityType: "Suppression", metadata: { kind, affected } });
  return { added: res.upsertedCount === 1, affected };
}

async function optOutProspectData(id: Types.ObjectId) {
  await Prospect.updateOne({ _id: id }, { $set: { optedOutAt: new Date(), dismissedAt: new Date(), contacts: [], people: [], assistantLog: [] } });
  await OutreachDraft.updateMany({ prospectId: id, status: { $in: ["DRAFT", "APPROVED"] } }, { $set: { status: "ARCHIVED", stoppedReason: "The business opted out" } });
  await ResearchTask.updateMany({ prospectId: id, status: "PENDING" }, { $set: { status: "CANCELLED", finishedAt: new Date() }, $unset: { activeKey: 1 } });
}

/** A business asked not to be contacted. Its domain and contact details go on the list and its stored details are removed. */
export async function optOutProspect(actor: CurrentUser, id: string, reason?: string): Promise<void> {
  await connectDb();
  const p = await Prospect.findById(id).lean();
  if (!p) throw new Error("This business no longer exists.");
  const entries: { kind: SuppressionKind; value: string }[] = [];
  if (p.domain) entries.push({ kind: "DOMAIN", value: p.domain });
  for (const c of p.contacts) entries.push({ kind: c.kind === "EMAIL" ? "EMAIL" : "PHONE", value: c.value });
  for (const e of entries) {
    const valueHash = suppressionHash(e.kind, e.value);
    await Suppression.updateOne({ valueHash }, { $setOnInsert: { kind: e.kind, valueHash, hint: mask(e.kind, e.value), reason: reason || "Opt out request", addedBy: new Types.ObjectId(actor.id) } }, { upsert: true });
  }
  await optOutProspectData(p._id);
  await recordAudit({ actor, action: "lead_research.opt_out", entityType: "Prospect", entityId: id, metadata: { entries: entries.length } });
}

export async function listSuppressions(limit = 200) {
  await connectDb();
  return Suppression.find({}).sort({ createdAt: -1 }).limit(limit).populate("addedBy", "name").lean();
}

export async function removeSuppression(actor: CurrentUser, id: string): Promise<void> {
  await connectDb();
  await Suppression.deleteOne({ _id: id });
  await recordAudit({ actor, action: "lead_research.suppression_remove", entityType: "Suppression", entityId: id });
}

/* ------------------------------ Outreach sequence ---------------------------- */

/** Days after a message is sent before its follow up is due. */
export const FOLLOW_UP_GAP_DAYS = [4, 7];

export async function updateDraft(actor: CurrentUser, id: string, input: { subject?: string; body: string; to?: string }): Promise<void> {
  await connectDb();
  const res = await OutreachDraft.updateOne({ _id: id, status: { $in: ["DRAFT", "APPROVED"] } }, { $set: { subject: input.subject || undefined, body: input.body, to: input.to || undefined } });
  if (!res.matchedCount) throw new Error("Only drafts that have not been sent can be edited.");
  await recordAudit({ actor, action: "lead_research.draft_edit", entityType: "OutreachDraft", entityId: id });
}

/** Approves a sequence: the first message is due today, each follow up after the one before is sent. */
export async function scheduleSequence(actor: CurrentUser, sequenceId: string): Promise<void> {
  await connectDb();
  const first = await OutreachDraft.findOne({ sequenceId, step: 0 }).lean();
  if (!first) throw new Error("The draft no longer exists.");
  const p = await Prospect.findById(first.prospectId).select("optedOutAt").lean();
  if (!p || p.optedOutAt) throw new Error("This business asked not to be contacted.");
  if (first.status !== "DRAFT") throw new Error("This sequence is already scheduled or finished.");
  await OutreachDraft.updateOne({ _id: first._id }, { $set: { status: "APPROVED", dueAt: new Date() } });
  await recordAudit({ actor, action: "lead_research.sequence_schedule", entityType: "OutreachDraft", entityId: first._id.toString() });
}

export async function stopSequence(actor: CurrentUser, sequenceId: string, reason: string): Promise<number> {
  await connectDb();
  const res = await OutreachDraft.updateMany({ sequenceId, status: { $in: ["DRAFT", "APPROVED"] } }, { $set: { status: "ARCHIVED", stoppedReason: reason } });
  await recordAudit({ actor, action: "lead_research.sequence_stop", entityType: "OutreachDraft", metadata: { sequenceId, reason } });
  return res.modifiedCount;
}

/** A person sent the message from their own email or WhatsApp. Logs it on the lead and schedules the next step. */
export async function markSent(actor: CurrentUser, draftId: string): Promise<void> {
  await connectDb();
  const d = await OutreachDraft.findOne({ _id: draftId, status: { $in: ["DRAFT", "APPROVED"] } });
  if (!d) throw new Error("This message was already sent or stopped.");
  const now = new Date();
  d.status = "SENT";
  d.sentAt = now;
  d.sentBy = new Types.ObjectId(actor.id);
  await d.save();
  if (d.leadId) {
    await addLeadActivity(actor, d.leadId.toString(), d.channel === "EMAIL" ? "EMAIL" : d.channel === "WHATSAPP" ? "WHATSAPP" : "NOTE", `Outreach ${d.step === 0 ? "message" : `follow up ${d.step}`} sent by ${actor.name} (${d.channel.toLowerCase()}).`);
  }
  const gap = FOLLOW_UP_GAP_DAYS[d.step];
  if (d.sequenceId && gap !== undefined) {
    await OutreachDraft.updateOne({ sequenceId: d.sequenceId, step: d.step + 1, status: "DRAFT" }, { $set: { status: "APPROVED", dueAt: new Date(now.getTime() + gap * DAY_MS) } });
  }
  await recordAudit({ actor, action: "lead_research.outreach_sent", entityType: "OutreachDraft", entityId: draftId });
}

/** A reply came in. The sequence stops and the reply is noted on the lead. */
export async function replyReceived(actor: CurrentUser, sequenceId: string): Promise<void> {
  await connectDb();
  const d = await OutreachDraft.findOne({ sequenceId }).select("leadId").lean();
  await stopSequence(actor, sequenceId, "A reply was received");
  if (d?.leadId) {
    await addLeadActivity(actor, d.leadId.toString(), "NOTE", "Reply received to outreach. Follow ups stopped.");
  }
}

export type DueDraft = OutreachDraftDoc & { prospect?: { _id: Types.ObjectId; name: string } };

/**
 * Follow ups due today or earlier. Before listing, sequences whose business opted out or
 * whose lead moved past Contacted are stopped, so nothing stale is offered for sending.
 */
export async function dueFollowUps(): Promise<DueDraft[]> {
  await connectDb();
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);
  const due = await OutreachDraft.find({ status: "APPROVED", dueAt: { $lte: endOfDay } }).sort({ dueAt: 1 }).limit(100).lean();
  const out: DueDraft[] = [];
  for (const d of due) {
    const p = await Prospect.findById(d.prospectId).select("name optedOutAt").lean();
    let stop: string | undefined;
    if (!p) stop = "The business was deleted";
    else if (p.optedOutAt) stop = "The business opted out";
    else if (d.leadId) {
      const lead = await Lead.findById(d.leadId).select("status").lean();
      if (lead && !["NEW", "CONTACTED"].includes(lead.status)) stop = `The lead moved to ${lead.status.toLowerCase().replace(/_/g, " ")}`;
    }
    if (stop) {
      await OutreachDraft.updateMany({ sequenceId: d.sequenceId, status: { $in: ["DRAFT", "APPROVED"] } }, { $set: { status: "ARCHIVED", stoppedReason: stop } });
      continue;
    }
    out.push({ ...d, prospect: p ? { _id: p._id, name: p.name } : undefined });
  }
  return out;
}

export async function recentDrafts(limit = 40) {
  await connectDb();
  return OutreachDraft.find({ status: { $in: ["DRAFT", "APPROVED"] }, step: 0 }).sort({ createdAt: -1 }).limit(limit).populate("prospectId", "name").lean();
}

/** Links that open the person's own email or WhatsApp with the message filled in. Nothing is sent by the system. */
export function sendLinks(d: Pick<OutreachDraftDoc, "channel" | "to" | "subject" | "body">): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (d.channel === "EMAIL") {
    const params = new URLSearchParams({ view: "cm", fs: "1", to: d.to ?? "", su: d.subject ?? "", body: d.body });
    links.push({ label: "Open in Gmail", href: `https://mail.google.com/mail/?${params.toString()}` });
    links.push({ label: "Open in email app", href: `mailto:${encodeURIComponent(d.to ?? "")}?subject=${encodeURIComponent(d.subject ?? "")}&body=${encodeURIComponent(d.body)}` });
  } else if (d.channel === "WHATSAPP") {
    const digits = (d.to ?? "").replace(/\D/g, "");
    links.push({ label: "Open in WhatsApp", href: `https://wa.me/${digits}?text=${encodeURIComponent(d.body)}` });
  } else if (d.to) {
    links.push({ label: "Open LinkedIn profile", href: d.to });
  }
  return links;
}
