import type { ScoreBand, ScoringWeights, VerificationLevel, WebsiteStatus } from "@/types/research";
import { normaliseName } from "./normalise";

/**
 * The explainable lead score from the plan (section 12). The base score is plain code from
 * stored evidence and the weights in settings. AI may move it by at most 10 points either
 * way, and only for reasons that point at stored evidence. Pure, unit tested.
 */

export const SIGNALS = ["websiteNeed", "industryFit", "size", "reachability", "decisionMaker", "hiring"] as const;
export type Signal = (typeof SIGNALS)[number];

export const SIGNAL_LABEL: Record<Signal, string> = {
  websiteNeed: "Website need",
  industryFit: "Industry fit",
  size: "Size signals",
  reachability: "Reachability",
  decisionMaker: "Decision maker identified",
  hiring: "Hiring for technology or operations",
};

export interface ScoreInput {
  websiteStatus: WebsiteStatus;
  industry?: string;
  /** Description and offerings, used for industry fit when the industry is not set. */
  about?: string;
  sizeHint?: string;
  hiringSignals: string[];
  contacts: { kind: "EMAIL" | "PHONE" | "WHATSAPP"; verification: VerificationLevel }[];
  people: { title?: string; verification: VerificationLevel }[];
  /** Number of branches or locations seen, when known. */
  locations?: number;
}

export interface BaseScore {
  value: number;
  breakdown: Record<Signal, number>;
  explanations: Record<Signal, string>;
}

const WEBSITE_NEED: Record<WebsiteStatus, [number, string]> = {
  NO_WEBSITE_FOUND: [1, "No website was found after checking two sources"],
  BROKEN_WEBSITE: [1, "The website is broken"],
  OUTDATED_WEBSITE: [0.8, "The website shows outdated signals"],
  WEBSITE_STATUS_UNKNOWN: [0.3, "The website status is not known yet"],
  HAS_WEBSITE: [0.15, "The business has a working website"],
};

const TECH_ROLES = /\b(developer|engineer|software|programmer|it\b|ict|data|digital|web|systems?|network|operations|admin(?:istrator)?|analyst|product)\b/i;

function fraction(level: VerificationLevel): number {
  return level === "VERIFIED" ? 1 : level === "PARTLY_VERIFIED" ? 0.75 : 0.5;
}

/** True when the business's industry or description matches one of the target industries. */
export function industryMatch(input: { industry?: string; about?: string }, targets: string[]): "match" | "partial" | "unknown" | "none" {
  const industry = normaliseName(input.industry ?? "");
  const about = normaliseName(input.about ?? "");
  if (!industry && !about) return "unknown";
  // Simple stems, so "pharmacies" matches "Pharmacy" and "hotels" matches "Hotel".
  const stem = (w: string) => w.replace(/ies$/, "y").replace(/(?<=[a-z]{3})s$/, "");
  const words = (s: string) => new Set(s.split(" ").filter((w) => w.length > 1 && w !== "and").map(stem));
  const targetWords = targets.map((t) => [...words(normaliseName(t))]).filter((w) => w.length > 0);
  const has = (hay: Set<string>) => targetWords.some((t) => t.every((w) => hay.has(w)));
  if (industry && has(words(industry))) return "match";
  if (about && has(words(about))) return industry ? "partial" : "match";
  return "none";
}

export function baseScore(input: ScoreInput, weights: ScoringWeights, targetIndustries: string[]): BaseScore {
  const breakdown = {} as Record<Signal, number>;
  const explanations = {} as Record<Signal, string>;
  const set = (signal: Signal, share: number, why: string) => {
    breakdown[signal] = Math.round(Math.max(0, Math.min(1, share)) * weights[signal] * 10) / 10;
    explanations[signal] = why;
  };

  const [need, needWhy] = WEBSITE_NEED[input.websiteStatus];
  set("websiteNeed", need, needWhy);

  const fit = industryMatch(input, targetIndustries);
  set("industryFit", fit === "match" ? 1 : fit === "partial" ? 0.6 : fit === "unknown" ? 0.3 : 0, fit === "match" ? "The industry is one areniX targets" : fit === "partial" ? "The description mentions a target industry" : fit === "unknown" ? "The industry is not known yet" : "The industry is not one areniX targets");

  let size = 0;
  const sizeWhy: string[] = [];
  if (input.sizeHint) {
    size += 0.4;
    sizeWhy.push(input.sizeHint);
  }
  if ((input.locations ?? 0) > 1) {
    size += 0.3;
    sizeWhy.push(`${input.locations} locations`);
  }
  if (input.people.length >= 3) {
    size += 0.3;
    sizeWhy.push(`${input.people.length} named staff`);
  }
  if (input.hiringSignals.length) {
    size += 0.3;
    sizeWhy.push("currently hiring");
  }
  set("size", size, sizeWhy.length ? `Signals found, ${sizeWhy.join(", ")}` : "No size signals found");

  const best = (kind: "EMAIL" | "PHONE" | "WHATSAPP") => Math.max(0, ...input.contacts.filter((c) => c.kind === kind).map((c) => fraction(c.verification)));
  const email = best("EMAIL");
  const phone = best("PHONE");
  const whatsapp = best("WHATSAPP");
  const reach = email * 0.5 + phone * 0.3 + whatsapp * 0.2 + (whatsapp === 0 && phone > 0 ? 0.1 : 0);
  const reachWhy = [email && "an email address", phone && "a phone number", whatsapp && "a WhatsApp number"].filter(Boolean);
  set("reachability", reach, reachWhy.length ? `Public ${reachWhy.join(", ")}` : "No public contact details found");

  const titled = input.people.filter((p) => p.title);
  const lead = titled.length ? Math.max(...titled.map((p) => fraction(p.verification))) : input.people.length ? 0.4 : 0;
  set("decisionMaker", lead, titled.length ? `${titled.length} named ${titled.length === 1 ? "person" : "people"} with a job title` : input.people.length ? "A named person without a job title" : "No decision maker identified");

  const techHiring = input.hiringSignals.some((h) => TECH_ROLES.test(h));
  set("hiring", techHiring ? 1 : input.hiringSignals.length ? 0.4 : 0, techHiring ? "Hiring for technology or operations roles" : input.hiringSignals.length ? "Hiring, but not for technology roles" : "No hiring signals found");

  const max = SIGNALS.reduce((n, s) => n + weights[s], 0);
  const total = SIGNALS.reduce((n, s) => n + breakdown[s], 0);
  return { value: max > 0 ? Math.round((total / max) * 100) : 0, breakdown, explanations };
}

export function scoreBand(value: number): ScoreBand {
  if (value >= 80) return "HIGH_PRIORITY";
  if (value >= 60) return "QUALIFIED";
  if (value >= 40) return "POTENTIAL";
  return "LOW_PRIORITY";
}

export interface AiReason {
  text: string;
  /** Ids of the stored evidence items the reason rests on, for example E3. */
  evidence: string[];
}

/**
 * Applies the AI adjustment. Reasons that do not point at real evidence ids are dropped,
 * and with no valid reason left the adjustment is zero, so AI cannot move a score on its own.
 */
export function applyAiAdjustment(base: number, adjustment: number, reasons: AiReason[], evidenceIds: Set<string>): { value: number; band: ScoreBand; aiAdjustment: number; reasons: string[] } {
  const valid = reasons.filter((r) => r.text.trim() && r.evidence.length > 0 && r.evidence.every((id) => evidenceIds.has(id)));
  const adj = valid.length && Number.isFinite(adjustment) ? Math.max(-10, Math.min(10, Math.round(adjustment))) : 0;
  const value = Math.max(0, Math.min(100, base + adj));
  return { value, band: scoreBand(value), aiAdjustment: adj, reasons: valid.map((r) => `${r.text.trim()} (${r.evidence.join(", ")})`) };
}
