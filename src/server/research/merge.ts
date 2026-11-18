import { countryName, domainOf, nameSimilarity, normaliseEmail, normaliseName, normalisePhone, normaliseWebsite } from "./normalise";
import type { DiscoveryCandidate } from "./types";

/**
 * Turns raw results from any source into one shape and decides when two results are the
 * same business. Rows merge when they share a website domain, a phone number, a Google
 * place id, an OpenStreetMap id or a registry number, or when the names closely match in
 * the same city. Pure, unit tested.
 */

export interface CleanCandidate {
  name: string;
  normalisedName: string;
  foundBy: string;
  website?: string;
  domain?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  industry?: string;
  sourceUrls: string[];
  evidence?: string;
  googlePlaceId?: string;
  osmId?: string;
  registry?: { name: string; number: string; status?: string };
  listsNoWebsite: boolean;
}

/** The fields of a stored prospect that matching needs. */
export interface MatchTarget {
  id: string;
  normalisedName: string;
  domain?: string;
  phones: string[];
  googlePlaceId?: string;
  osmId?: string;
  registryNumber?: string;
  city?: string;
}

export const NAME_MATCH_SAME_CITY = 0.88;
export const NAME_MATCH_NO_CITY = 0.96;

const tidy = (v?: string | null, max = 200) => {
  const t = v?.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
};

function cleanUrl(raw: string): string | undefined {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    u.hash = "";
    return u.toString();
  } catch {
    return undefined;
  }
}

/** Cleans a raw result. Returns null when it cannot be used (no name, or an AI result with no source). */
export function cleanCandidate(raw: DiscoveryCandidate, fallbackCountry?: string): CleanCandidate | null {
  const name = tidy(raw.name, 160);
  if (!name || name.length < 2) return null;
  const normalisedName = normaliseName(name);
  if (!normalisedName) return null;
  const sourceUrls = [...new Set(raw.sourceUrls.map(cleanUrl).filter((u): u is string => !!u))].slice(0, 8);
  if (!sourceUrls.length) return null;
  const country = countryName(raw.country) ?? countryName(fallbackCountry);
  const website = normaliseWebsite(raw.website);
  return {
    name,
    normalisedName,
    foundBy: raw.foundBy,
    website,
    domain: website ? domainOf(website) : undefined,
    phone: normalisePhone(raw.phone, country),
    email: normaliseEmail(raw.email),
    address: tidy(raw.address),
    city: tidy(raw.city, 80),
    region: tidy(raw.region, 80),
    country,
    industry: tidy(raw.industry, 80),
    sourceUrls,
    evidence: tidy(raw.evidence, 400),
    googlePlaceId: tidy(raw.googlePlaceId, 300),
    osmId: tidy(raw.osmId, 60),
    registry: raw.registry?.number ? { name: raw.registry.name, number: raw.registry.number.trim(), status: raw.registry.status } : undefined,
    listsNoWebsite: !!raw.listsNoWebsite && !website,
  };
}

const sameCity = (a?: string, b?: string) => !!a && !!b && normaliseName(a) === normaliseName(b);

/** The id of the stored prospect this candidate belongs to, or undefined for a new business. */
export function findMatch(c: Pick<CleanCandidate, "normalisedName" | "domain" | "phone" | "googlePlaceId" | "osmId" | "registry" | "city">, targets: MatchTarget[]): string | undefined {
  for (const t of targets) {
    if (c.domain && t.domain === c.domain) return t.id;
    if (c.googlePlaceId && t.googlePlaceId === c.googlePlaceId) return t.id;
    if (c.osmId && t.osmId === c.osmId) return t.id;
    if (c.registry?.number && t.registryNumber && t.registryNumber.toUpperCase() === c.registry.number.toUpperCase()) return t.id;
    if (c.phone && t.phones.includes(c.phone)) return t.id;
  }
  let best: { id: string; score: number } | undefined;
  for (const t of targets) {
    // Different known domains mean different businesses, however similar the names.
    if (c.domain && t.domain && c.domain !== t.domain) continue;
    const score = nameSimilarity(c.normalisedName, t.normalisedName);
    const threshold = sameCity(c.city, t.city) ? NAME_MATCH_SAME_CITY : !c.city || !t.city ? NAME_MATCH_NO_CITY : 2;
    if (score >= threshold && (!best || score > best.score)) best = { id: t.id, score };
  }
  return best?.id;
}

/** Merges results within one batch before they touch the database. */
export function dedupeCandidates(list: CleanCandidate[]): CleanCandidate[] {
  const out: CleanCandidate[] = [];
  for (const c of list) {
    const targets: MatchTarget[] = out.map((o, i) => ({ id: String(i), normalisedName: o.normalisedName, domain: o.domain, phones: o.phone ? [o.phone] : [], googlePlaceId: o.googlePlaceId, osmId: o.osmId, registryNumber: o.registry?.number, city: o.city }));
    const hit = findMatch(c, targets);
    if (hit === undefined) {
      out.push(c);
      continue;
    }
    const o = out[Number(hit)] as CleanCandidate;
    o.website ??= c.website;
    o.domain ??= c.domain;
    o.phone ??= c.phone;
    o.email ??= c.email;
    o.city ??= c.city;
    o.region ??= c.region;
    o.country ??= c.country;
    o.industry ??= c.industry;
    o.address ??= c.address;
    o.sourceUrls = [...new Set([...o.sourceUrls, ...c.sourceUrls])].slice(0, 8);
    o.listsNoWebsite = o.listsNoWebsite && c.listsNoWebsite && !o.website;
  }
  return out;
}
