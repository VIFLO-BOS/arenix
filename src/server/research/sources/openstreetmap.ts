import { normaliseName } from "../normalise";
import type { DiscoveryCandidate, DiscoveryQuery } from "../types";
import { SourceError, asArray, asNumber, asRecord, asString, compact, requestJson } from "./errors";

/**
 * OpenStreetMap discovery: Nominatim turns the place into an area, then one Overpass query
 * lists named businesses in that area whose tags match the industry.
 *
 * Data © OpenStreetMap contributors, available under the Open Database License (ODbL).
 * Anything that shows these results must credit OpenStreetMap, see OSM_ATTRIBUTION.
 *
 * Nominatim usage policy: at most one request per second, a User-Agent that identifies the
 * application, no bulk geocoding. A search makes exactly one Nominatim request.
 */

export const OSM_SOURCE = "openstreetmap";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_TIMEOUT_MS = 40_000;
// Overpass refuses very large result sets on the public servers, so stay well below that.
const MAX_OVERPASS_LIMIT = 500;

/* ---------------------------- Industry mapping ---------------------------- */

/** One OSM tag condition. Without values, any value of the key matches. */
export interface OsmTagFilter {
  key: string;
  values?: string[];
}

export interface OsmIndustryMapping {
  label: string;
  /** Words and phrases in the industry or keywords that select this row. Plurals ending in s or es also match. */
  match: string[];
  tags: OsmTagFilter[];
}

/**
 * Industry words mapped to the OSM tags businesses of that kind usually carry. Tag values
 * follow the OSM wiki; a few common but unofficial values are kept because mappers use them.
 */
export const OSM_INDUSTRY_TAGS: OsmIndustryMapping[] = [
  { label: "Logistics", match: ["logistics", "logistic", "courier", "haulage", "haulier", "freight", "delivery", "dispatch", "shipping", "cargo", "moving", "removals"], tags: [{ key: "office", values: ["logistics", "courier", "moving_company", "freight_forwarder"] }, { key: "shop", values: ["courier"] }] },
  { label: "Health", match: ["hospital", "clinic", "health", "healthcare", "medical", "diagnostic", "diagnostics", "laboratory", "maternity", "doctor"], tags: [{ key: "amenity", values: ["hospital", "clinic", "doctors"] }, { key: "healthcare", values: ["hospital", "clinic", "doctor", "centre", "laboratory", "birthing_centre"] }] },
  { label: "Pharmacy", match: ["pharmacy", "pharmaceutical", "pharmaceuticals", "chemist", "drugstore"], tags: [{ key: "amenity", values: ["pharmacy"] }, { key: "healthcare", values: ["pharmacy"] }, { key: "shop", values: ["chemist"] }] },
  { label: "Dental", match: ["dental", "dentist", "orthodontist", "orthodontics"], tags: [{ key: "amenity", values: ["dentist"] }, { key: "healthcare", values: ["dentist"] }] },
  { label: "Education", match: ["school", "education", "educational", "training", "college", "academy", "university", "tutorial", "tutoring", "nursery", "creche"], tags: [{ key: "amenity", values: ["school", "college", "university", "kindergarten", "training", "language_school", "driving_school", "music_school"] }, { key: "office", values: ["educational_institution", "tutoring"] }] },
  { label: "Hotel", match: ["hotel", "lodging", "lodge", "guest house", "guesthouse", "accommodation", "hostel", "motel", "short let", "shortlet"], tags: [{ key: "tourism", values: ["hotel", "guest_house", "motel", "hostel", "apartment", "chalet"] }] },
  { label: "Restaurant", match: ["restaurant", "food", "catering", "caterer", "eatery", "cafe", "fast food", "kitchen", "bukka"], tags: [{ key: "amenity", values: ["restaurant", "fast_food", "cafe", "food_court"] }, { key: "craft", values: ["caterer"] }] },
  { label: "Real estate", match: ["real estate", "property", "properties", "estate agent", "estate agency", "realtor", "realty", "letting"], tags: [{ key: "office", values: ["estate_agent", "property_management"] }] },
  { label: "Legal", match: ["law", "legal", "lawyer", "solicitor", "attorney", "barrister", "chambers", "notary"], tags: [{ key: "office", values: ["lawyer", "notary"] }] },
  { label: "Accounting", match: ["accounting", "accountant", "accountancy", "audit", "auditing", "auditor", "bookkeeping", "tax"], tags: [{ key: "office", values: ["accountant", "tax_advisor"] }] },
  { label: "Insurance", match: ["insurance", "insurer", "assurance"], tags: [{ key: "office", values: ["insurance"] }] },
  { label: "Finance", match: ["bank", "banking", "finance", "financial", "microfinance", "fintech", "loan", "lending", "bureau de change", "investment"], tags: [{ key: "amenity", values: ["bank", "bureau_de_change", "money_transfer"] }, { key: "office", values: ["financial", "financial_advisor", "moneylender", "investment"] }] },
  { label: "Construction", match: ["construction", "building", "builder", "contractor", "civil engineering", "engineering", "roofing"], tags: [{ key: "office", values: ["construction_company", "construction", "engineer"] }, { key: "craft", values: ["builder", "roofer", "plasterer"] }] },
  { label: "Manufacturing", match: ["manufacturing", "manufacturer", "factory", "industrial", "production", "processing", "plant"], tags: [{ key: "man_made", values: ["works"] }, { key: "industrial", values: ["factory", "manufacturing", "food_industry", "brewery"] }] },
  { label: "Retail", match: ["retail", "retailer", "supermarket", "shop", "store", "mall", "minimart", "wholesale", "wholesaler", "provisions"], tags: [{ key: "shop", values: ["supermarket", "convenience", "department_store", "general", "mall", "variety_store", "wholesale"] }] },
  { label: "Beauty", match: ["beauty", "salon", "spa", "hairdresser", "hair", "barber", "barbing", "cosmetics", "nail", "makeup"], tags: [{ key: "shop", values: ["beauty", "hairdresser", "cosmetics", "massage"] }, { key: "leisure", values: ["spa"] }, { key: "amenity", values: ["spa"] }] },
  { label: "Fitness", match: ["fitness", "gym", "health club", "crossfit", "yoga", "pilates"], tags: [{ key: "leisure", values: ["fitness_centre", "sports_centre"] }, { key: "amenity", values: ["gym"] }] },
  { label: "Transport", match: ["transport", "transportation", "bus", "coach", "taxi", "ride hailing", "motor park", "haulage transport"], tags: [{ key: "amenity", values: ["bus_station", "taxi"] }, { key: "office", values: ["transport", "bus_company"] }] },
  { label: "Automotive", match: ["car dealer", "car dealership", "dealership", "automotive", "auto", "mechanic", "garage", "car repair", "spare parts", "car wash", "tyre", "tire", "vehicle"], tags: [{ key: "shop", values: ["car", "car_repair", "car_parts", "tyres", "motorcycle"] }, { key: "amenity", values: ["car_wash", "car_rental"] }] },
  { label: "Travel", match: ["travel", "travel agency", "travel agent", "tour", "tour operator", "visa"], tags: [{ key: "shop", values: ["travel_agency"] }, { key: "office", values: ["travel_agent"] }] },
  { label: "IT", match: ["it", "ict", "software", "technology", "tech", "computer", "web design", "digital", "telecom", "telecommunications"], tags: [{ key: "office", values: ["it", "telecommunication", "software"] }, { key: "shop", values: ["computer"] }] },
  { label: "Consulting", match: ["consulting", "consultancy", "consultant", "advisory", "management consulting"], tags: [{ key: "office", values: ["consulting", "consultant"] }] },
  { label: "Printing", match: ["printing", "printer", "print", "press", "branding", "signage"], tags: [{ key: "craft", values: ["printer", "printmaker", "signmaker"] }, { key: "shop", values: ["copyshop", "printing"] }] },
  { label: "Fashion", match: ["fashion", "tailor", "tailoring", "clothing", "clothes", "boutique", "apparel", "fabric", "textile", "dressmaker"], tags: [{ key: "shop", values: ["clothes", "tailor", "boutique", "fabric", "fashion", "shoes"] }, { key: "craft", values: ["tailor", "dressmaker"] }] },
  { label: "Bakery", match: ["bakery", "bakeries", "baker", "bread", "confectionery", "cake", "pastry"], tags: [{ key: "shop", values: ["bakery", "pastry", "confectionery"] }, { key: "craft", values: ["baker", "confectionery"] }] },
  { label: "Event venue", match: ["event centre", "event center", "event", "venue", "hall", "banquet", "conference centre", "event planner", "event management"], tags: [{ key: "amenity", values: ["events_venue", "conference_centre", "exhibition_centre"] }, { key: "office", values: ["event_management"] }] },
  { label: "Non profit", match: ["ngo", "non profit", "nonprofit", "not for profit", "charity", "charities", "foundation", "association"], tags: [{ key: "office", values: ["ngo", "charity", "association", "foundation"] }] },
  { label: "Agriculture", match: ["agriculture", "agricultural", "farm", "farming", "agro", "agribusiness", "poultry", "livestock", "fishery"], tags: [{ key: "shop", values: ["agrarian", "farm"] }, { key: "place", values: ["farm"] }, { key: "landuse", values: ["farmyard"] }, { key: "office", values: ["agriculture"] }] },
];

/** Keys the regex fallback is limited to, so it finds businesses rather than streets or rivers named like the keyword. */
export const OSM_FALLBACK_KEYS = ["office", "shop", "amenity", "craft", "healthcare", "tourism", "company"];

// Words that describe the search rather than the business; matching names on them finds noise.
const GENERIC_WORDS = new Set(["company", "companies", "business", "businesses", "firm", "firms", "service", "services", "ltd", "limited", "in", "near", "the", "and", "of", "with", "without", "no", "website", "websites", "local", "small", "best", "top"]);

function words(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Rows of OSM_INDUSTRY_TAGS that the query's industry or keywords mention. */
export function matchOsmIndustries(query: Pick<DiscoveryQuery, "industry" | "keywords">): OsmIndustryMapping[] {
  const hay = words([query.industry ?? "", ...query.keywords].join(" "));
  if (!hay.trim()) return [];
  return OSM_INDUSTRY_TAGS.filter((row) => row.match.some((term) => {
    const t = words(term).trim();
    return hay.includes(` ${t} `) || hay.includes(` ${t}s `) || hay.includes(` ${t}es `);
  }));
}

/* ------------------------------ Query builder ----------------------------- */

/** Escapes text for a double quoted Overpass QL string. */
function qlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tagFilter(filter: OsmTagFilter): string {
  const key = qlString(filter.key);
  if (!filter.values?.length) return `["${key}"]`;
  if (filter.values.length === 1) return `["${key}"="${qlString(filter.values[0] ?? "")}"]`;
  return `["${key}"~"^(${filter.values.map((v) => qlString(escapeRegex(v))).join("|")})$"]`;
}

/** Keywords used for the name regex fallback: generic search words dropped, the industry used when no keywords are left. */
function fallbackTerms(query: DiscoveryQuery): string[] {
  const fromKeywords = query.keywords.map((k) => k.trim()).filter((k) => k && !GENERIC_WORDS.has(k.toLowerCase()));
  const terms = fromKeywords.length ? fromKeywords : query.industry?.trim() ? [query.industry.trim()] : [];
  return [...new Set(terms.map((t) => t.toLowerCase()))];
}

/** How many elements to ask Overpass for: more than needed, because duplicates and the website filter drop some. */
export function overpassLimit(query: Pick<DiscoveryQuery, "maxResults" | "websiteFilter">): number {
  const wanted = Math.max(1, Math.floor(query.maxResults));
  const factor = query.websiteFilter === "any" ? 1.5 : 3;
  return Math.min(MAX_OVERPASS_LIMIT, Math.max(wanted + 10, Math.ceil(wanted * factor)));
}

/**
 * Overpass QL for named businesses in an area (an Overpass area id) or a bounding box given
 * as [south, west, north, east]. Industries in OSM_INDUSTRY_TAGS search by tag; anything else
 * searches names for the keywords, case insensitive.
 */
export function buildOverpassQuery(area: { areaId?: number; bbox?: [number, number, number, number] }, query: DiscoveryQuery): string {
  let scope: string;
  let header = "";
  if (area.areaId !== undefined) {
    header = `area(${Math.trunc(area.areaId)})->.searchArea;\n`;
    scope = "(area.searchArea)";
  } else if (area.bbox) {
    scope = `(${area.bbox.join(",")})`;
  } else {
    throw new SourceError(OSM_SOURCE, "bad_request", "an area id or a bounding box is needed");
  }

  // Website presence is filtered on the server too, so the limit is spent on useful rows.
  const website = query.websiteFilter === "none" ? `[!"website"][!"contact:website"][!"url"]` : query.websiteFilter === "has" ? `[~"^(website|contact:website|url)$"~"."]` : "";

  const statements: string[] = [];
  const mappings = matchOsmIndustries(query);
  if (mappings.length) {
    const seen = new Set<string>();
    for (const row of mappings) {
      for (const filter of row.tags) {
        const line = `  nwr["name"]${tagFilter(filter)}${website}${scope};`;
        if (!seen.has(line)) {
          seen.add(line);
          statements.push(line);
        }
      }
    }
  } else {
    const terms = fallbackTerms(query);
    if (!terms.length) throw new SourceError(OSM_SOURCE, "bad_request", "an industry or keywords are needed");
    const pattern = qlString(terms.map(escapeRegex).join("|"));
    for (const key of OSM_FALLBACK_KEYS) statements.push(`  nwr["${key}"]["name"~"${pattern}",i]${website}${scope};`);
  }

  return `[out:json][timeout:25];\n${header}(\n${statements.join("\n")}\n);\nout center tags ${overpassLimit(query)};`;
}

/* --------------------------------- Mapping -------------------------------- */

// Keys read for the industry label when no mapped tag matches, most specific first.
const LABEL_KEYS = ["office", "shop", "healthcare", "amenity", "craft", "tourism", "leisure", "industrial", "man_made", "company", "place", "landuse"];

/** "estate_agent" becomes "Estate agent". "yes" falls back to the key, so office=yes reads "Office". */
function readableLabel(key: string, value: string): string {
  const raw = value === "yes" ? key : value.split(";")[0] ?? value;
  const t = raw.replace(/[_:]+/g, " ").trim();
  if (!t) return key;
  if (t.toLowerCase() === "it") return "IT";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function firstValue(tags: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = asString(tags[key]);
    if (v) return asString(v.split(";")[0]);
  }
  return undefined;
}

function tagMatches(tags: Record<string, unknown>, filter: OsmTagFilter): string | undefined {
  const v = asString(tags[filter.key]);
  if (!v) return undefined;
  if (!filter.values?.length || filter.values.includes(v)) return v;
  return undefined;
}

/** The tag that explains why the element matched, preferring the tags of the mapped industries. */
function industryTag(tags: Record<string, unknown>, mappings: OsmIndustryMapping[]): { key: string; value: string } | undefined {
  for (const row of mappings) {
    for (const filter of row.tags) {
      const value = tagMatches(tags, filter);
      if (value) return { key: filter.key, value };
    }
  }
  for (const key of LABEL_KEYS) {
    const value = asString(tags[key]);
    if (value) return { key, value };
  }
  return undefined;
}

/** Overpass JSON elements as discovery candidates, filtered by query.websiteFilter and deduplicated. */
export function mapOverpassElements(json: unknown, query: DiscoveryQuery): DiscoveryCandidate[] {
  const mappings = matchOsmIndustries(query);
  const out: DiscoveryCandidate[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const item of asArray(asRecord(json)?.elements)) {
    const el = asRecord(item);
    const type = asString(el?.type);
    const id = asNumber(el?.id);
    const tags = asRecord(el?.tags);
    const name = asString(tags?.name);
    if (!el || !tags || !name || id === undefined || (type !== "node" && type !== "way" && type !== "relation")) continue;

    const osmId = `${type}/${id}`;
    if (seenIds.has(osmId)) continue;
    seenIds.add(osmId);

    const website = firstValue(tags, ["website", "contact:website", "url"]);
    if (query.websiteFilter === "none" && website) continue;
    if (query.websiteFilter === "has" && !website) continue;

    const city = asString(tags["addr:city"]) ?? query.city;
    const nameKey = `${normaliseName(name)}|${(city ?? "").toLowerCase()}`;
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);

    const street = asString(tags["addr:street"]);
    const house = asString(tags["addr:housenumber"]);
    const address = street ? [house, street].filter(Boolean).join(" ") : asString(tags["addr:full"]);
    const tag = industryTag(tags, mappings);

    const candidate: DiscoveryCandidate = compact({
      name,
      foundBy: OSM_SOURCE,
      website,
      phone: firstValue(tags, ["phone", "contact:phone", "contact:mobile"]),
      email: firstValue(tags, ["email", "contact:email"]),
      address,
      city,
      region: asString(tags["addr:state"]),
      country: asString(tags["addr:country"]) ?? query.country,
      industry: tag ? readableLabel(tag.key, tag.value) : undefined,
      sourceUrls: [`https://www.openstreetmap.org/${osmId}`],
      evidence: tag ? `OpenStreetMap lists it as ${tag.key}=${tag.value}` : "Listed on OpenStreetMap",
      osmId,
    });
    out.push(candidate);
  }
  return out;
}

/* --------------------------------- Search --------------------------------- */

export interface OpenStreetMapOptions {
  /** Identifies the application to Nominatim and Overpass, as their usage policies require. */
  userAgent: string;
  fetchImpl?: typeof fetch;
  /** Per request timeout. Defaults to 40 seconds, above the 25 second Overpass server limit. */
  timeoutMs?: number;
  overpassUrl?: string;
  nominatimUrl?: string;
}

/** Overpass area id for a Nominatim result, or its bounding box as [south, west, north, east] when it is a point. */
export function nominatimArea(result: unknown): { areaId?: number; bbox?: [number, number, number, number] } | undefined {
  const r = asRecord(result);
  if (!r) return undefined;
  const osmType = asString(r.osm_type);
  const osmId = asNumber(r.osm_id);
  // Overpass derives area ids from relations and closed ways by adding these offsets.
  if (osmId !== undefined && osmType === "relation") return { areaId: osmId + 3_600_000_000 };
  if (osmId !== undefined && osmType === "way") return { areaId: osmId + 2_400_000_000 };
  // Nominatim gives the box as [south, north, west, east] in strings.
  const box = asArray(r.boundingbox).map(asNumber);
  const [south, north, west, east] = box;
  if (box.length === 4 && south !== undefined && north !== undefined && west !== undefined && east !== undefined) return { bbox: [south, west, north, east] };
  return undefined;
}

/** Finds named businesses in the query's place through Nominatim and Overpass. Throws SourceError. */
export async function searchOpenStreetMap(query: DiscoveryQuery, opts: OpenStreetMapOptions): Promise<DiscoveryCandidate[]> {
  const place = [query.city, query.region, query.country].map((p) => p?.trim()).filter(Boolean).join(", ");
  if (!place) throw new SourceError(OSM_SOURCE, "bad_request", "a city, region or country is needed");
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers = { "User-Agent": opts.userAgent, Accept: "application/json", "Accept-Language": "en" };

  const nominatimBase = (opts.nominatimUrl ?? DEFAULT_NOMINATIM_URL).replace(/\/+$/, "");
  const params = new URLSearchParams({ format: "jsonv2", limit: "1", q: place });
  const geocoded = await requestJson(OSM_SOURCE, `${nominatimBase}/search?${params.toString()}`, { method: "GET", headers }, { fetchImpl: opts.fetchImpl, timeoutMs });
  const first = asArray(geocoded)[0];
  if (first === undefined) throw new SourceError(OSM_SOURCE, "not_found", `Nominatim found no place for "${place}"`);
  const area = nominatimArea(first);
  if (!area) throw new SourceError(OSM_SOURCE, "not_found", `Nominatim gave no usable area for "${place}"`);

  const ql = buildOverpassQuery(area, query);
  const body = new URLSearchParams({ data: ql }).toString();
  const json = await requestJson(OSM_SOURCE, opts.overpassUrl ?? DEFAULT_OVERPASS_URL, { method: "POST", headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body }, { fetchImpl: opts.fetchImpl, timeoutMs });

  // A busy Overpass server answers 200 with a runtime error remark and no elements.
  const remark = asString(asRecord(json)?.remark);
  const elements = asArray(asRecord(json)?.elements);
  if (remark && /runtime error/i.test(remark) && !elements.length) throw new SourceError(OSM_SOURCE, /timed out|timeout/i.test(remark) ? "timeout" : "provider_error", `Overpass ${remark}`);

  return mapOverpassElements(json, query).slice(0, Math.max(0, Math.floor(query.maxResults)));
}
