/**
 * Shapes shared by the lead research pipeline: what discovery sources return, what the
 * website extractor reads from one page, and what a crawl of one site produces. Plain types
 * only, so pure modules and their unit tests can import them.
 */

/** A business returned by one discovery source, before it is merged into a Prospect. */
export interface DiscoveryCandidate {
  name: string;
  /** Id written to the Found by column: an AI provider id or a data source id. */
  foundBy: string;
  website?: string;
  /** As published. normalisePhone() turns it into international format later. */
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  /** Country name or ISO code as the source gives it. */
  country?: string;
  industry?: string;
  /** Pages that show the business. AI results without any are thrown away. */
  sourceUrls: string[];
  /** A short quote or note on why the source matched. */
  evidence?: string;
  googlePlaceId?: string;
  osmId?: string;
  registry?: { name: string; number: string; status?: string };
  /** True when the business itself says it has no website, or a directory lists none. */
  listsNoWebsite?: boolean;
}

/** What a search asks the sources for. */
export interface DiscoveryQuery {
  /** The request as typed. */
  text: string;
  industry?: string;
  keywords: string[];
  country?: string;
  region?: string;
  city?: string;
  websiteFilter: "any" | "none" | "has";
  maxResults: number;
}

export interface DiscoverySourceInfo {
  id: string;
  label: string;
  kind: "ai" | "directory" | "map" | "registry";
}

/** Contact details and signals read from one HTML page. Values are raw, as published. */
export interface PageExtract {
  url: string;
  title?: string;
  description?: string;
  /** og:site_name or the JSON LD organisation name. */
  siteName?: string;
  emails: string[];
  phones: string[];
  /** Numbers taken from wa.me and api.whatsapp.com links. */
  whatsapp: string[];
  socials: { platform: string; url: string }[];
  people: { name: string; title?: string; linkedinUrl?: string }[];
  /** Links on the same site, absolute, without fragments. */
  internalLinks: { url: string; text: string }[];
  hasViewport: boolean;
  copyrightYear?: number;
  generator?: string;
  /** For example "WordPress 4.9", "jQuery 1.12.4", "Wix". */
  technology: string[];
  /** Short snippets that show the business is hiring. */
  hiring: string[];
  /** Headings and list items from services or products sections. */
  offerings: string[];
  /** Postal address parts from JSON LD, when present. */
  address?: { street?: string; city?: string; region?: string; country?: string };
  /** The html lang attribute, for the accessibility basics. */
  htmlLang?: string;
  h1Count: number;
  images: number;
  /** Images with no alt attribute at all. An empty alt is correct for decoration and is not counted. */
  imagesWithoutAlt: number;
  /** Scripts, stylesheets and images the page loads, absolute, for the page weight sample. */
  assets: { kind: "script" | "style" | "image"; url: string }[];
  /** Visible text, whitespace collapsed, capped in length. */
  text: string;
}

export interface CrawledPage {
  url: string;
  status: number;
  bytes: number;
  extract?: PageExtract;
}

/** Facts from one visit to a site, used by the website status rules and the score. */
export interface SiteCheck {
  /** The address that was asked for. */
  requestedUrl: string;
  /** Where the redirects ended. */
  finalUrl?: string;
  ok: boolean;
  /** Why the site could not be read, when ok is false. */
  failure?: "dns" | "connection" | "tls" | "timeout" | "http_error" | "blocked" | "robots" | "parked" | "too_large" | "not_html";
  httpStatus?: number;
  https: boolean;
  redirects: number;
  hasViewport?: boolean;
  copyrightYear?: number;
  pageBytes?: number;
  technology: string[];
  legacyTechnology: string[];
  /** True when the home page mentions the business name. */
  nameMatches?: boolean;
  brokenLinks?: { checked: number; broken: string[] };
  /**
   * Speed and weight measured by the crawler itself, used when there is no PageSpeed key.
   * Measured from the server, so it is a rough guide rather than a phone lab test.
   */
  speed?: SpeedCheck;
  /** SEO and accessibility basics read from the home page. */
  basics?: { title: boolean; metaDescription: boolean; h1Count: number; lang: boolean; images: number; imagesWithoutAlt: number };
  checkedAt: Date;
}

export interface SpeedCheck {
  /** Time for the home page to arrive in full, in milliseconds. */
  responseMs: number;
  htmlKb: number;
  compressed: boolean;
  scripts: number;
  styles: number;
  images: number;
  /** Assets whose size was read, and their total. */
  sampled: number;
  sampledKb: number;
  /** HTML plus every asset at the average sampled size. */
  estimatedPageKb: number;
}

export interface PageSpeedScores {
  performance?: number;
  accessibility?: number;
  bestPractices?: number;
  seo?: number;
  fetchedAt: Date;
}
