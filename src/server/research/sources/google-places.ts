import { countryIso } from "../normalise";
import type { DiscoveryCandidate, DiscoveryQuery } from "../types";
import { asArray, asRecord, asString, compact, requestJson } from "./errors";

/**
 * Google Places API (New) Text Search. Paid per request, so the caller decides how many
 * pages to fetch and every HTTP request is counted for the usage ledger.
 *
 * Request shape per developers.google.com/maps/documentation/places/web-service/text-search:
 * POST places:searchText with X-Goog-Api-Key and X-Goog-FieldMask headers, a JSON body with
 * textQuery, pageSize (1 to 20), regionCode, languageCode and, for later pages, pageToken.
 * The field mask decides the billing tier, so it only lists what the candidate needs.
 */

export const GOOGLE_PLACES_SOURCE = "google_places";
export const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "nextPageToken",
].join(",");

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_PAGE_SIZE = 20;

export interface GooglePlacesOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Pages to fetch at most. Defaults to 1. Google returns at most 60 results over 3 pages. */
  maxPages?: number;
}

/** Natural language query for Text Search, for example "logistics companies in Ibadan, Oyo, Nigeria". */
export function buildPlacesTextQuery(query: DiscoveryQuery): string {
  const what = query.industry?.trim() || query.keywords.map((k) => k.trim()).filter(Boolean).join(" ") || query.text.trim();
  // "companies" keeps Google on businesses rather than landmarks, unless the words already say so.
  const subject = /\b(compan(y|ies)|business(es)?|firms?|shops?|stores?|services?|agenc(y|ies)|clinics?|hospitals?|hotels?|restaurants?|schools?)\b/i.test(what) ? what : `${what} companies`;
  const place = [query.city, query.region, query.country].map((p) => p?.trim()).filter(Boolean).join(", ");
  return place ? `${subject} in ${place}` : subject;
}

function component(components: Record<string, unknown>[], type: string): string | undefined {
  const found = components.find((c) => asArray(c.types).includes(type));
  return found ? asString(found.longText) : undefined;
}

/** Text Search response places as discovery candidates. Permanently closed places are skipped. */
export function mapPlaces(json: unknown): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];
  for (const item of asArray(asRecord(json)?.places)) {
    const place = asRecord(item);
    const id = asString(place?.id);
    const name = asString(asRecord(place?.displayName)?.text);
    if (!place || !id || !name) continue;
    if (place.businessStatus === "CLOSED_PERMANENTLY") continue;

    const components = asArray(place.addressComponents).map(asRecord).filter((c): c is Record<string, unknown> => !!c);
    const website = asString(place.websiteUri);
    out.push(
      compact<DiscoveryCandidate>({
        name,
        foundBy: GOOGLE_PLACES_SOURCE,
        googlePlaceId: id,
        website,
        phone: asString(place.internationalPhoneNumber) ?? asString(place.nationalPhoneNumber),
        address: asString(place.formattedAddress),
        city: component(components, "locality") ?? component(components, "postal_town"),
        region: component(components, "administrative_area_level_1"),
        country: component(components, "country"),
        industry: asString(asRecord(place.primaryTypeDisplayName)?.text),
        sourceUrls: [`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`],
        evidence: place.businessStatus === "CLOSED_TEMPORARILY" ? "Google Maps lists it as temporarily closed" : "Listed on Google Maps",
        // Google shows no website for the place, which is the signal this feature looks for.
        listsNoWebsite: website ? undefined : true,
      }),
    );
  }
  return out;
}

/** Runs Text Search, following nextPageToken up to maxPages or until maxResults is reached. Throws SourceError. */
export async function searchGooglePlaces(query: DiscoveryQuery, opts: GooglePlacesOptions): Promise<{ candidates: DiscoveryCandidate[]; requests: number }> {
  const maxPages = Math.max(1, Math.floor(opts.maxPages ?? 1));
  const wanted = Math.max(1, Math.floor(query.maxResults));
  const regionCode = countryIso(query.country);
  // Later pages must repeat the first request's parameters, so the base body is fixed here.
  const base = compact({ textQuery: buildPlacesTextQuery(query), pageSize: Math.min(MAX_PAGE_SIZE, wanted), regionCode, languageCode: "en" });

  const candidates: DiscoveryCandidate[] = [];
  const seen = new Set<string>();
  let requests = 0;
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    requests++;
    const json = await requestJson(
      GOOGLE_PLACES_SOURCE,
      PLACES_TEXT_SEARCH_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": opts.apiKey, "X-Goog-FieldMask": PLACES_FIELD_MASK },
        body: JSON.stringify(pageToken ? { ...base, pageToken } : base),
      },
      { fetchImpl: opts.fetchImpl, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS },
    );
    for (const c of mapPlaces(json)) {
      if (c.googlePlaceId && seen.has(c.googlePlaceId)) continue;
      if (c.googlePlaceId) seen.add(c.googlePlaceId);
      candidates.push(c);
    }
    pageToken = asString(asRecord(json)?.nextPageToken);
    if (!pageToken || candidates.length >= wanted) break;
  }
  return { candidates: candidates.slice(0, wanted), requests };
}
