import { countryIso, nameSimilarity } from "../normalise";
import type { DiscoveryCandidate, DiscoveryQuery } from "../types";
import { SourceError, asArray, asRecord, asString, compact, requestJson } from "./errors";

/**
 * Companies House public data API, the official UK register. The key is free and is sent as
 * the HTTP Basic username with an empty password. The service allows 600 requests in five
 * minutes per key, so callers should not loop over it without pacing.
 *
 * Endpoints per developer-specs.company-information.service.gov.uk:
 *   GET /search/companies?q=&items_per_page=   (search by name)
 *   GET /advanced-search/companies?company_name_includes=&location=&company_status=&sic_codes=&size=
 * List parameters such as sic_codes take comma separated values; size runs from 1 to 5000.
 */

export const COMPANIES_HOUSE_SOURCE = "companies_house";
export const COMPANIES_HOUSE_API = "https://api.company-information.service.gov.uk";
const DEFAULT_TIMEOUT_MS = 15_000;

export interface CompaniesHouseCompany {
  name: string;
  number: string;
  status?: string;
  type?: string;
  address?: string;
  createdOn?: string;
  url: string;
}

export interface CompaniesHouseOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Overrides the API host, for tests or a proxy. */
  baseUrl?: string;
}

/** Public page for a company on Find and update company information. */
export function companiesHouseUrl(number: string): string {
  return `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(number)}`;
}

function authHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

async function getJson(path: string, params: URLSearchParams, opts: CompaniesHouseOptions): Promise<unknown> {
  const base = (opts.baseUrl ?? COMPANIES_HOUSE_API).replace(/\/+$/, "");
  return requestJson(COMPANIES_HOUSE_SOURCE, `${base}${path}?${params.toString()}`, { method: "GET", headers: { Authorization: authHeader(opts.apiKey), Accept: "application/json" } }, { fetchImpl: opts.fetchImpl, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS });
}

/* --------------------------------- Lookup --------------------------------- */

/** Search companies response items as companies. */
export function mapCompanySearch(json: unknown): CompaniesHouseCompany[] {
  const out: CompaniesHouseCompany[] = [];
  for (const item of asArray(asRecord(json)?.items)) {
    const c = asRecord(item);
    const name = asString(c?.title);
    const number = asString(c?.company_number);
    if (!c || !name || !number) continue;
    out.push(compact<CompaniesHouseCompany>({ name, number, status: asString(c.company_status), type: asString(c.company_type), address: asString(c.address_snippet), createdOn: asString(c.date_of_creation), url: companiesHouseUrl(number) }));
  }
  return out;
}

/** Companies whose registered name matches the search, best first as Companies House ranks them. Throws SourceError. */
export async function searchCompaniesHouse(name: string, opts: CompaniesHouseOptions): Promise<CompaniesHouseCompany[]> {
  const q = name.trim();
  if (!q) return [];
  const json = await getJson("/search/companies", new URLSearchParams({ q, items_per_page: "20" }), opts);
  return mapCompanySearch(json);
}

/** The registered company that is clearly the named business: name similarity of 0.9 or more, active companies first. */
export function bestCompaniesHouseMatch(name: string, companies: CompaniesHouseCompany[]): CompaniesHouseCompany | undefined {
  let best: { company: CompaniesHouseCompany; score: number; active: boolean } | undefined;
  for (const company of companies) {
    const score = nameSimilarity(name, company.name);
    if (score < 0.9) continue;
    const active = company.status?.toLowerCase() === "active";
    // An active company beats a dissolved one with the same name; otherwise the closer name wins.
    if (!best || (active && !best.active) || (active === best.active && score > best.score)) best = { company, score, active };
  }
  return best?.company;
}

/* -------------------------------- Discovery ------------------------------- */

/**
 * UK SIC 2007 codes for common industries, used to filter advanced search. Keys are matched
 * against the query's industry and keywords as whole words.
 */
export const INDUSTRY_SIC_CODES: Record<string, string[]> = {
  logistics: ["49410", "52290", "53202", "52103"],
  courier: ["53201", "53202"],
  haulage: ["49410"],
  hospital: ["86101"],
  clinic: ["86210", "86220"],
  medical: ["86210", "86220", "86900"],
  dental: ["86230"],
  dentist: ["86230"],
  pharmacy: ["47730"],
  school: ["85200", "85310"],
  training: ["85590"],
  hotel: ["55100"],
  restaurant: ["56101", "56102"],
  catering: ["56210"],
  "real estate": ["68310", "68320"],
  property: ["68310", "68320"],
  solicitor: ["69102"],
  legal: ["69101", "69102", "69109"],
  law: ["69101", "69102", "69109"],
  accounting: ["69201", "69202", "69203"],
  accountant: ["69201"],
  insurance: ["65120", "66220"],
  construction: ["41201", "41202", "43999"],
  software: ["62012"],
  it: ["62020", "62090"],
  technology: ["62012", "62020", "62090"],
  consulting: ["70229"],
  consultancy: ["70229"],
  printing: ["18129"],
  fashion: ["14190", "47710"],
  clothing: ["14190", "47710"],
  bakery: ["10710"],
  beauty: ["96020"],
  salon: ["96020"],
  fitness: ["93130"],
  gym: ["93130"],
  travel: ["79110", "79120"],
  automotive: ["45111", "45200"],
  mechanic: ["45200"],
  events: ["82301", "82302"],
  agriculture: ["01500"],
  farm: ["01500"],
};

/** SIC codes for the query's industry and keywords, or an empty list when none are mapped. */
export function sicCodesFor(query: Pick<DiscoveryQuery, "industry" | "keywords">): string[] {
  const hay = ` ${[query.industry ?? "", ...query.keywords].join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const codes = new Set<string>();
  for (const [term, list] of Object.entries(INDUSTRY_SIC_CODES)) {
    if (hay.includes(` ${term} `) || hay.includes(` ${term}s `)) for (const code of list) codes.add(code);
  }
  return [...codes];
}

const GENERIC_WORDS = new Set(["company", "companies", "business", "businesses", "firm", "firms", "ltd", "limited", "uk", "in", "near", "the", "and", "with", "without", "no", "website", "websites"]);

/** Advanced search response items as discovery candidates. */
export function mapAdvancedSearch(json: unknown, query?: Pick<DiscoveryQuery, "industry">): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];
  for (const item of asArray(asRecord(json)?.items)) {
    const c = asRecord(item);
    const name = asString(c?.company_name);
    const number = asString(c?.company_number);
    if (!c || !name || !number) continue;
    const office = asRecord(c.registered_office_address);
    const status = asString(c.company_status);
    const sic = asArray(c.sic_codes).map(asString).filter((s): s is string => !!s);
    const url = companiesHouseUrl(number);
    out.push(
      compact<DiscoveryCandidate>({
        name,
        foundBy: COMPANIES_HOUSE_SOURCE,
        address: [office?.address_line_1, office?.address_line_2].map(asString).filter(Boolean).join(", ") || undefined,
        city: asString(office?.locality),
        region: asString(office?.region),
        country: "United Kingdom",
        industry: query?.industry?.trim() || undefined,
        sourceUrls: [url],
        evidence: `Companies House lists it as ${status ?? "registered"}${sic.length ? `, SIC ${sic.join(" ")}` : ""}`,
        registry: compact({ name: "Companies House", number, status }),
      }),
    );
  }
  return out;
}

/**
 * Registered UK companies for a discovery query through advanced search: active companies
 * with a registered office in the city. With mapped SIC codes the industry filter is the SIC
 * code; otherwise the company name must include the keywords. Returns [] outside the UK.
 * Throws SourceError.
 */
export async function discoverCompaniesHouse(query: DiscoveryQuery, opts: CompaniesHouseOptions): Promise<DiscoveryCandidate[]> {
  if (countryIso(query.country) !== "GB") return [];
  const params = new URLSearchParams({ company_status: "active", size: String(Math.min(5000, Math.max(1, Math.floor(query.maxResults)))) });
  const location = query.city?.trim() || query.region?.trim();
  if (location) params.set("location", location);

  const sic = sicCodesFor(query);
  if (sic.length) {
    params.set("sic_codes", sic.join(","));
  } else {
    const words = query.keywords.map((k) => k.trim()).filter((k) => k && !GENERIC_WORDS.has(k.toLowerCase()));
    const name = words.join(" ") || query.industry?.trim();
    // Without an industry or a name filter the search would return every company in the city.
    if (!name) return [];
    params.set("company_name_includes", name);
  }

  try {
    const json = await getJson("/advanced-search/companies", params, opts);
    return mapAdvancedSearch(json, query);
  } catch (err) {
    // Advanced search answers 404 when no company matches, which is an empty result here.
    if (err instanceof SourceError && err.kind === "not_found") return [];
    throw err;
  }
}
