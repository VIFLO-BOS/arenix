import { createHash } from "node:crypto";

/**
 * Normalisers for business names, websites, phone numbers and email addresses. Merging,
 * duplicate checks against the CRM and the opt out list all compare normalised values, so
 * the same business found by two sources lands on one row. Pure functions, unit tested.
 */

/* ------------------------------- Countries ------------------------------- */

interface CountryInfo {
  iso: string;
  name: string;
  callingCode: string;
  /** Digits after the trunk 0 in a full national number. */
  nationalLength: number[];
}

const COUNTRIES: CountryInfo[] = [
  { iso: "NG", name: "Nigeria", callingCode: "234", nationalLength: [10, 8, 7] },
  { iso: "GB", name: "United Kingdom", callingCode: "44", nationalLength: [10, 9] },
  { iso: "GH", name: "Ghana", callingCode: "233", nationalLength: [9] },
  { iso: "KE", name: "Kenya", callingCode: "254", nationalLength: [9] },
  { iso: "ZA", name: "South Africa", callingCode: "27", nationalLength: [9] },
  { iso: "US", name: "United States", callingCode: "1", nationalLength: [10] },
  { iso: "CA", name: "Canada", callingCode: "1", nationalLength: [10] },
  { iso: "IE", name: "Ireland", callingCode: "353", nationalLength: [9, 8] },
  { iso: "AE", name: "United Arab Emirates", callingCode: "971", nationalLength: [9, 8] },
  { iso: "RW", name: "Rwanda", callingCode: "250", nationalLength: [9] },
  { iso: "CM", name: "Cameroon", callingCode: "237", nationalLength: [9] },
  { iso: "BJ", name: "Benin", callingCode: "229", nationalLength: [8, 10] },
  { iso: "EG", name: "Egypt", callingCode: "20", nationalLength: [10, 9] },
];

const COUNTRY_ALIASES: Record<string, string> = {
  nigeria: "NG",
  ng: "NG",
  nga: "NG",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  gbr: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "great britain": "GB",
  ghana: "GH",
  gh: "GH",
  kenya: "KE",
  ke: "KE",
  "south africa": "ZA",
  za: "ZA",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  canada: "CA",
  ca: "CA",
  ireland: "IE",
  ie: "IE",
  "united arab emirates": "AE",
  uae: "AE",
  ae: "AE",
  rwanda: "RW",
  rw: "RW",
  cameroon: "CM",
  cm: "CM",
  benin: "BJ",
  bj: "BJ",
  egypt: "EG",
  eg: "EG",
};

/** ISO code for a country name or code, or undefined when it is not one we know. */
export function countryIso(country?: string | null): string | undefined {
  if (!country) return undefined;
  const key = country.trim().toLowerCase().replace(/\./g, "");
  return COUNTRY_ALIASES[key];
}

export function countryInfo(country?: string | null): CountryInfo | undefined {
  const iso = countryIso(country);
  return iso ? COUNTRIES.find((c) => c.iso === iso) : undefined;
}

/** Display name for a country, keeping the input when it is not one we know. */
export function countryName(country?: string | null): string | undefined {
  if (!country?.trim()) return undefined;
  return countryInfo(country)?.name ?? country.trim();
}

/* --------------------------------- Names --------------------------------- */

// Words that say what kind of company it is rather than which one.
const LEGAL_WORDS = new Set(["ltd", "limited", "plc", "llc", "llp", "lp", "inc", "incorporated", "corp", "corporation", "co", "company", "gmbh", "sa", "bv", "pty", "nig", "nigeria", "the"]);

/** Lowercase, no accents or punctuation, legal suffixes removed. "The Acme Co. Ltd" becomes "acme". */
export function normaliseName(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const kept = words.filter((w) => !LEGAL_WORDS.has(w));
  return (kept.length ? kept : words).join(" ");
}

function bigrams(s: string): Map<string, number> {
  const out = new Map<string, number>();
  const t = s.replace(/\s+/g, "");
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/** Similarity of two business names from 0 to 1 (Dice coefficient over letter pairs). */
export function nameSimilarity(a: string, b: string): number {
  const x = normaliseName(a);
  const y = normaliseName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bx = bigrams(x);
  const by = bigrams(y);
  let total = 0;
  let overlap = 0;
  for (const n of bx.values()) total += n;
  for (const [g, n] of by) {
    total += n;
    overlap += Math.min(n, bx.get(g) ?? 0);
  }
  return total ? (2 * overlap) / total : 0;
}

/** True when the page text mentions the business by name. Used to check AI source links. */
export function textMentionsName(text: string, name: string): boolean {
  const hay = ` ${normaliseName(text)} `;
  const needle = normaliseName(name);
  if (!needle) return false;
  if (hay.includes(` ${needle} `)) return true;
  // Names written without spaces in a domain or logo, for example "acmelogistics".
  return needle.length >= 6 && hay.replace(/\s+/g, "").includes(needle.replace(/\s+/g, ""));
}

// Words that describe many businesses, so a name made only of them is not distinctive.
const GENERIC = new Set(["logistics", "courier", "couriers", "services", "service", "express", "delivery", "company", "enterprises", "enterprise", "global", "international", "group", "and", "solutions", "consult", "consulting", "ventures", "industries", "branch", "office", "head"]);
const SEGMENT_SPLIT = new RegExp(`\\s[-|:${String.fromCharCode(0x2013, 0x2014)}]\\s`);

/**
 * Ways a business might be named on its own pages. Sources often add a branch or city, as
 * in "Bright Path Ibadan", "Okafor Haulage (Ibadan)" or "Sunrise Couriers - Ibadan", while
 * the business's site just says "Bright Path". Variants made only of generic words are dropped.
 */
export function nameVariants(name: string, places: (string | undefined)[] = []): string[] {
  const placeWords = new Set(places.flatMap((p) => normaliseName(p ?? "").split(" ")).filter((w) => w.length > 1));
  const raw = [name, name.replace(/\([^)]*\)/g, " "), name.split(SEGMENT_SPLIT)[0] ?? name];
  const out = new Set<string>();
  for (const r of raw) {
    const n = normaliseName(r);
    if (n) out.add(n);
    const withoutPlace = n.split(" ").filter((w) => !placeWords.has(w)).join(" ");
    if (withoutPlace) out.add(withoutPlace);
  }
  return [...out].filter((v) => v.length >= 4 && v.split(" ").some((w) => !GENERIC.has(w) && !placeWords.has(w)));
}

/** True when the text mentions the business under any of its name variants. */
export function textMentionsBusiness(text: string, name: string, places: (string | undefined)[] = []): boolean {
  return nameVariants(name, places).some((v) => textMentionsName(text, v));
}

/* -------------------------------- Websites ------------------------------- */

/**
 * Domains that host many businesses (social networks, directories, link pages). A page
 * there is not the business's own website, so it never sets the website or the domain.
 */
const PLATFORM_DOMAINS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "google.com",
  "goo.gl",
  "g.page",
  "wa.me",
  "whatsapp.com",
  "linktr.ee",
  "bio.link",
  "yelp.com",
  "tripadvisor.com",
  "vconnect.com",
  "businesslist.com.ng",
  "finelib.com",
  "nigeriagalleria.com",
  "ngcareers.com",
  "jobberman.com",
  "opencorporates.com",
  "companieshouse.gov.uk",
  "find-and-update.company-information.service.gov.uk",
  "cac.gov.ng",
  "wikipedia.org",
  "bing.com",
  "openstreetmap.org",
  "jiji.ng",
  "konga.com",
  "jumia.com.ng",
];

export function isPlatformDomain(domain: string): boolean {
  return PLATFORM_DOMAINS.some((p) => domain === p || domain.endsWith(`.${p}`));
}

/** Parses a website address typed by a person or an AI. Adds https when the scheme is missing. */
export function parseWebsite(raw?: string | null): URL | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (!t || /\s/.test(t)) return undefined;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    if (!u.hostname.includes(".") || /^[\d.]+$/.test(u.hostname) || u.hostname.includes(":")) return undefined;
    return u;
  } catch {
    return undefined;
  }
}

/** Bare domain without www, for example example.com.ng, or undefined for platform pages. */
export function domainOf(raw?: string | null): string | undefined {
  const u = parseWebsite(raw);
  if (!u) return undefined;
  const host = u.hostname.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "");
  return isPlatformDomain(host) ? undefined : host;
}

/** The site's home page address, or undefined for platform pages. */
export function normaliseWebsite(raw?: string | null): string | undefined {
  const u = parseWebsite(raw);
  if (!u || !domainOf(raw)) return undefined;
  return `${u.protocol}//${u.hostname.toLowerCase()}/`;
}

/* --------------------------------- Phones -------------------------------- */

/**
 * International format (E.164, for example +2348031234567) or undefined when the number
 * cannot be read with confidence. A national number needs a country to be read.
 */
export function normalisePhone(raw?: string | null, country?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/^tel:/i, "").replace(/\(0\)/g, "").trim();
  if (!/^[+\d][\d\s().\-/]{5,}$/.test(cleaned)) return undefined;
  let digits = cleaned.replace(/\D/g, "");
  const info = countryInfo(country);
  let international: string | undefined;

  if (cleaned.startsWith("+")) international = digits;
  else if (digits.startsWith("00")) international = digits.slice(2);
  else if (info && digits.startsWith("0") && info.nationalLength.includes(digits.length - 1)) international = info.callingCode + digits.slice(1);
  else if (info && digits.startsWith(info.callingCode) && info.nationalLength.includes(digits.length - info.callingCode.length)) international = digits;
  else if (info && !digits.startsWith("0") && info.nationalLength.includes(digits.length) && info.callingCode === "1") international = info.callingCode + digits;

  if (!international) return undefined;
  digits = international;
  // Nigerian numbers are sometimes written +234 0803..., with the trunk 0 kept.
  if (digits.startsWith("2340") && digits.length === 14) digits = "234" + digits.slice(4);
  if (digits.startsWith("440") && digits.length === 13) digits = "44" + digits.slice(3);
  if (digits.length < 8 || digits.length > 15) return undefined;
  return `+${digits}`;
}

/* --------------------------------- Emails -------------------------------- */

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/;
const NOT_REAL = /(?:example\.(?:com|org|net)|domain\.com|email\.com|yourdomain|sentry\.io|wixpress\.com|sentry-next\.wixpress|godaddy\.com)$/;
const FILE_LIKE = /\.(?:png|jpe?g|gif|webp|svg|css|js|ico|bmp|tiff?)$/;

/** Lowercased address, or undefined for placeholders, image names and malformed text. */
export function normaliseEmail(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let t = raw.trim().replace(/^mailto:/i, "");
  t = t.split("?")[0] ?? "";
  try {
    t = decodeURIComponent(t);
  } catch {
    // keep as is
  }
  t = t.trim().toLowerCase().replace(/^[<(["']+|[>)\]"'.,;:]+$/g, "");
  if (t.length > 254 || !EMAIL_RE.test(t) || NOT_REAL.test(t) || FILE_LIKE.test(t)) return undefined;
  return t;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

/** Free mailbox providers. An address there is not evidence of the business's own domain. */
const FREE_MAIL = new Set(["gmail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "outlook.com", "live.com", "icloud.com", "aol.com", "ymail.com", "proton.me", "protonmail.com", "mail.com", "gmx.com"]);

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL.has(domain.toLowerCase());
}

/* --------------------------------- Hashes -------------------------------- */

/**
 * The opt out list keeps only this hash, so the list itself holds no contact details.
 * The value is normalised first, so +234 803... and 0803... (with a country) match.
 */
export function suppressionHash(kind: "DOMAIN" | "EMAIL" | "PHONE", normalisedValue: string): string {
  return createHash("sha256").update(`arenix-suppression:${kind}:${normalisedValue.trim().toLowerCase()}`).digest("hex");
}

/** Stable hash of a search, so the same search within a day reopens the earlier one. */
export function stableHash(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)]));
    return v;
  };
  return createHash("sha256").update(JSON.stringify(sort(value))).digest("hex").slice(0, 32);
}
