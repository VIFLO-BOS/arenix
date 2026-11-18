import { parse, type HTMLElement } from "node-html-parser";
import { normaliseEmail } from "./normalise";
import type { PageExtract } from "./types";

/**
 * Reads public business details from one HTML page with plain code, no AI: names, contact
 * details, social links, leadership names, hiring notices, services and technology hints.
 * The HTML is only parsed. Scripts never run. Malformed pages give empty results instead of
 * errors. Pure, tested against saved fixtures in tests/unit/research-extract.test.ts.
 */

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/* --------------------------------- JSON LD -------------------------------- */

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? collapse(v) : isObj(v) && typeof v.name === "string" ? collapse(v.name) : undefined);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

const ORG_TYPES = /^(?:Organization|Corporation|LocalBusiness|Store|ProfessionalService|MedicalBusiness|MedicalOrganization|LegalService|FinancialService|AutomotiveBusiness|FoodEstablishment|Restaurant|Hotel|LodgingBusiness|HealthAndBeautyBusiness|HomeAndConstructionBusiness|EducationalOrganization|School|CollegeOrUniversity|NGO|GovernmentOrganization|SportsOrganization|TravelAgency|RealEstateAgent|InsuranceAgency|AccountingService|Dentist|Pharmacy|Hospital|Clinic|EmploymentAgency|EntertainmentBusiness|ShoppingCenter)$|(?:Business|Organization|Service|Store)$/;

function typesOf(node: Json): string[] {
  return list(node["@type"]).filter((t): t is string => typeof t === "string");
}

function flattenLd(value: unknown, out: Json[] = [], depth = 0): Json[] {
  if (depth > 6) return out;
  if (Array.isArray(value)) value.forEach((v) => flattenLd(v, out, depth + 1));
  else if (isObj(value)) {
    out.push(value);
    if (value["@graph"]) flattenLd(value["@graph"], out, depth + 1);
  }
  return out;
}

/* ---------------------------------- Phones --------------------------------- */

const PHONE_PATTERNS: RegExp[] = [
  // International, for example +234 803 123 4567 or +44 (0)20 7946 0000.
  /(?<![\w+])\+\d{1,3}(?:[\s.\-()]{0,3}\d){7,14}(?!\d)/g,
  // Nigerian mobile, for example 0803 123 4567 or 0803-123-4567.
  /(?<![\w])0[789][01]\d[\s.\-]?\d{3}[\s.\-]?\d{4}(?!\d)/g,
  // UK national, 11 digits in the usual groupings, for example 020 7946 0000 or 01632 960000.
  /(?<![\w])0[1-9]\d{1,4}\s?\d{3,4}\s?\d{3,4}(?!\d)/g,
];
// Nigerian landlines are short and look like other numbers, so they need a label nearby.
const LABELLED_LANDLINE = /(?:tel|phone|call|hotline|telephone|line)\b[^0-9+]{0,20}(0[19](?:[\s.\-]?\d){6,8})(?!\d)/gi;

const digitsOf = (s: string) => s.replace(/\D/g, "");

function phonesInText(text: string): string[] {
  const found: string[] = [];
  for (const re of PHONE_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const raw = m[0].trim();
      const d = digitsOf(raw);
      if (raw.startsWith("+") ? d.length < 8 || d.length > 15 : d.length !== 11) continue;
      found.push(raw);
    }
  }
  for (const m of text.matchAll(LABELLED_LANDLINE)) if (m[1]) found.push(m[1].trim());
  return found;
}

/* ---------------------------------- Emails --------------------------------- */

const EMAIL_IN_TEXT = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}/gi;
const OBFUSCATED = /([a-z0-9._%+-]+)\s*[[(]\s*at\s*[\])]\s*([a-z0-9-]+(?:\s*[[(]\s*dot\s*[\])]\s*[a-z0-9-]+)+)/gi;

function emailsInText(text: string): string[] {
  const out = [...text.matchAll(EMAIL_IN_TEXT)].map((m) => m[0]);
  for (const m of text.matchAll(OBFUSCATED)) out.push(`${m[1]}@${(m[2] ?? "").replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".")}`);
  return out;
}

/* --------------------------------- Socials -------------------------------- */

const SHARE = /sharer|share\?|\/share\b|intent\/tweet|sharearticle|\/plugins\/|dialog\/|\/home\?status|addtoany/i;

function socialOf(href: string): { platform: string; url: string } | undefined {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return undefined;
  }
  if (SHARE.test(u.pathname + u.search)) return undefined;
  const host = u.hostname.toLowerCase().replace(/^(?:www|m|mobile|web|[a-z]{2})\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return undefined;
  const clean = `https://${u.hostname.toLowerCase().replace(/^(?:m|mobile|web)\./, "www.")}${path}`;
  if (host === "facebook.com" || host === "fb.com") return /^\/(?:login|home\.php|groups\/?$)/.test(path) ? undefined : { platform: "facebook", url: clean };
  if (host === "instagram.com") return /^\/(?:p|reel|explore)\//.test(path) ? undefined : { platform: "instagram", url: clean };
  if (host === "linkedin.com") return /^\/(?:company|in|school)\//.test(path) ? { platform: "linkedin", url: clean } : undefined;
  if (host === "twitter.com" || host === "x.com") return /^\/(?:intent|share|home|search)\b/.test(path) ? undefined : { platform: "x", url: clean };
  if (host === "youtube.com") return /^\/(?:watch|embed|results)\b/.test(path) ? undefined : { platform: "youtube", url: clean };
  if (host === "tiktok.com") return /^\/@/.test(path) ? { platform: "tiktok", url: clean } : undefined;
  return undefined;
}

function whatsappOf(href: string): string | undefined {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return undefined;
  }
  const host = u.hostname.toLowerCase();
  let digits = "";
  if (host === "wa.me" || host === "www.wa.me") digits = digitsOf(u.pathname.split("/")[1] ?? "");
  else if (/(^|\.)whatsapp\.com$/.test(host)) digits = digitsOf(u.searchParams.get("phone") ?? "");
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined;
}

/* --------------------------------- People --------------------------------- */

const ROLE = /\b(?:chief executive officer|ceo|co[\s-]?founder|founder|managing director|md|executive director|non[\s-]executive director|director|chairman|chairperson|chairwoman|president|vice president|chief [a-z]+(?: [a-z]+)? officer|cto|cfo|coo|cmo|cio|head of [a-z&]+(?: [a-z&]+)?|general manager|operations manager|manager|managing partner|partner|principal|proprietor|proprietress|owner|secretary|treasurer)\b/i;
const NAME = /^(?:(?:Dr|Mr|Mrs|Ms|Miss|Engr|Prof|Chief|Barr|Arc|Pastor|Alhaji|Alhaja|Sir|Dame)\.?\s+)?[A-Z][a-zA-Z'’.-]+(?:\s+[A-Z][a-zA-Z'’.-]+){1,3}$/;
const NOT_NAMES = /^(?:our|meet|the|about|contact|read|learn|view|see|get|join|board|management|leadership|executive|why|what|who|how|home|services|products|follow|call|send|request|book)\b/i;
// A name and a role in one short text, for example "Jane Doe, CEO" or "Jane Doe | Founder".
const NAME_AND_ROLE = /^((?:(?:Dr|Mr|Mrs|Ms|Engr|Prof|Chief)\.?\s+)?[A-Z][a-zA-Z'’.-]+(?:\s+[A-Z][a-zA-Z'’.-]+){1,3})\s*(?:,|\s-\s|\s\|\s|\s\u2013\s|\s\u2014\s|:)\s*(.{2,70})$/;

function isName(t: string): boolean {
  return t.length <= 40 && NAME.test(t) && !ROLE.test(t) && !NOT_NAMES.test(t);
}

function isRole(t: string): boolean {
  return t.length >= 2 && t.length <= 80 && ROLE.test(t);
}

function linkedinNear(el: HTMLElement): string | undefined {
  let node: HTMLElement | null = el;
  for (let i = 0; i < 3 && node; i++) {
    node = node.parentNode as HTMLElement | null;
    const a = node?.querySelector?.('a[href*="linkedin.com/in/"]');
    const href = a?.getAttribute("href");
    if (href) return socialOf(href)?.url;
  }
  return undefined;
}

function peopleFromDom(body: HTMLElement): { name: string; title?: string; linkedinUrl?: string }[] {
  const out: { name: string; title?: string; linkedinUrl?: string }[] = [];
  const els = body.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,b,p,span,li,td,div,figcaption,dt,dd").slice(0, 4000);
  for (const el of els) {
    if (out.length >= 30) break;
    const t = collapse(el.text);
    if (!t || t.length > 90) continue;
    if (isName(t)) {
      let title: string | undefined;
      const next = el.nextElementSibling;
      const nextText = next ? collapse(next.text) : "";
      if (isRole(nextText)) title = nextText;
      else if (!next) {
        const parentNext = (el.parentNode as HTMLElement | null)?.nextElementSibling;
        const pt = parentNext ? collapse(parentNext.text) : "";
        if (isRole(pt)) title = pt;
      }
      if (title) out.push({ name: t, title, linkedinUrl: linkedinNear(el) });
      continue;
    }
    // Only leaf like elements, so a whole card's text is not read as one line.
    if (el.childElementCount > 2) continue;
    const m = t.match(NAME_AND_ROLE);
    if (m && m[1] && m[2] && isName(m[1]) && isRole(m[2])) out.push({ name: m[1], title: collapse(m[2]), linkedinUrl: linkedinNear(el) });
  }
  return out;
}

/* ------------------------------- Technology ------------------------------- */

function versionIn(src: string, lib: string): string | undefined {
  const s = src.toLowerCase();
  const patterns = [new RegExp(`${lib}[-.@/]v?(\\d+\\.\\d+(?:\\.\\d+)?)`), new RegExp(`/${lib}/v?(\\d+\\.\\d+(?:\\.\\d+)?)/`)];
  // WordPress puts the library version in ?ver= only for its own bundled files. On theme and
  // plugin files ?ver= is the theme or plugin version, so it is not trusted there.
  if (s.includes("/wp-includes/")) patterns.push(new RegExp(`${lib}(?:\\.min)?\\.(?:js|css)\\?ver=(\\d+\\.\\d+(?:\\.\\d+)?)`));
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

function detectTechnology(root: HTMLElement, html: string, generator?: string): string[] {
  const tech: string[] = [];
  const add = (t: string) => {
    const name = t.split(" ")[0];
    if (!tech.some((x) => x.split(" ")[0] === name)) tech.push(t);
  };
  const gen = generator ?? "";
  const genVersion = (name: string) => gen.match(new RegExp(`${name}\\s+v?(\\d+(?:\\.\\d+){0,2})`, "i"))?.[1];

  if (/wordpress/i.test(gen) || /\/wp-content\/|\/wp-includes\//i.test(html)) add(genVersion("wordpress") ? `WordPress ${genVersion("wordpress")}` : "WordPress");
  if (/joomla/i.test(gen)) add(genVersion("joomla!?") ? `Joomla ${genVersion("joomla!?")}` : "Joomla");
  if (/drupal/i.test(gen) || /\/sites\/default\/files\//.test(html)) add(genVersion("drupal") ? `Drupal ${genVersion("drupal")}` : "Drupal");
  if (/wix\.com|wixstatic\.com/i.test(gen + html)) add("Wix");
  if (/squarespace/i.test(gen) || /static1\.squarespace\.com/i.test(html)) add("Squarespace");
  if (/cdn\.shopify\.com|shopify/i.test(gen) || /cdn\.shopify\.com/i.test(html)) add("Shopify");
  if (/webflow/i.test(gen) || /assets\.website-files\.com|data-wf-site/i.test(html)) add("Webflow");
  if (/blogger/i.test(gen) || /blogger\.com\/static/i.test(html)) add("Blogger");
  if (/img1\.wsimg\.com|godaddy/i.test(gen) || /img1\.wsimg\.com/i.test(html)) add("GoDaddy Website Builder");

  const sources = [...root.querySelectorAll("script[src],link[href],img[src],iframe[src]")].map((el) => el.getAttribute("src") ?? el.getAttribute("href") ?? "");
  const joined = sources.join(" ");
  const jq = sources.map((s) => (/jquery/i.test(s) && !/jquery[-.]?(?:ui|migrate|validate|mobile)/i.test(s) ? versionIn(s, "jquery") : undefined)).find(Boolean);
  if (jq) add(`jQuery ${jq}`);
  else if (/jquery(?:\.min)?\.js/i.test(joined)) add("jQuery");
  const bs = sources.map((s) => (/bootstrap/i.test(s) ? versionIn(s, "bootstrap") : undefined)).find(Boolean);
  if (bs) add(`Bootstrap ${bs}`);
  else if (/bootstrap(?:\.min)?\.(?:js|css)/i.test(joined)) add("Bootstrap");
  const ng = sources.map((s) => (/angular(?:\.min)?\.js/i.test(s) ? versionIn(s, "angular") ?? versionIn(s, "angular.js") : undefined)).find(Boolean);
  if (ng && ng.startsWith("1.")) add(`AngularJS ${ng}`);
  if (root.querySelector('embed[src$=".swf"],object[data$=".swf"],param[value$=".swf"]') || /\.swf["'?]/i.test(html)) add("Flash");
  if (root.querySelector("frameset,frame")) add("Frames");
  if (/\/_next\//.test(joined)) add("Next.js");
  if (/\/_nuxt\//.test(joined)) add("Nuxt");
  if (/react-dom/i.test(joined)) add("React");
  if (/vue(?:\.runtime)?(?:\.global)?(?:\.min)?\.js/i.test(joined)) add("Vue");
  if (/font-?awesome/i.test(joined)) add("Font Awesome");
  if (/googletagmanager\.com/i.test(joined + html.slice(0, 200000))) add("Google Tag Manager");
  return tech;
}

const below = (v: string | undefined, major: number) => {
  const n = Number((v ?? "").split(".")[0]);
  return Number.isFinite(n) && n > 0 && n < major;
};

/** Technology entries that count as legacy for the outdated website rule. */
export function legacyTechnology(technology: string[]): string[] {
  return technology.filter((t) => {
    const version = t.split(" ").pop();
    if (t === "Flash" || t === "Frames" || t.startsWith("AngularJS")) return true;
    if (t.startsWith("jQuery ")) return below(version, 3);
    if (t.startsWith("Bootstrap ")) return below(version, 4);
    if (t.startsWith("WordPress ")) return below(version, 6);
    if (t.startsWith("Joomla ")) return below(version, 4);
    if (t.startsWith("Drupal ")) return below(version, 9);
    return false;
  });
}

/* --------------------------------- Signals -------------------------------- */

const COPYRIGHT = /(?:©|\(c\)|copyright)[^0-9]{0,25}((?:19|20)\d{2})(?:\s*(?:-|to|\u2013|\u2014|\/)\s*((?:19|20)\d{2}))?/gi;
const HIRING = /\b(?:we(?:'|’)?re hiring|we are hiring|join our team|vacancies|vacancy|job openings|open positions|now recruiting|career opportunities|apply now for)\b/gi;
const JOB_WORDS = /\b(?:officer|manager|engineer|developer|executive|assistant|analyst|intern|representative|accountant|driver|designer|specialist|coordinator|supervisor|technician|nurse|teacher|marketer|cashier|receptionist)\b/i;

function copyrightYear(text: string): number | undefined {
  const max = new Date().getUTCFullYear() + 1;
  let best: number | undefined;
  for (const m of text.matchAll(COPYRIGHT)) {
    for (const y of [m[1], m[2]]) {
      const n = Number(y);
      if (n >= 1990 && n <= max && (!best || n > best)) best = n;
    }
  }
  return best;
}

function hiringSnippets(text: string, pageUrl: string, headings: string[]): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(HIRING)) {
    const i = m.index ?? 0;
    const snippet = collapse(text.slice(Math.max(0, i - 60), i + 100));
    if (!out.some((o) => o.includes(m[0]))) out.push(snippet.slice(0, 160));
    if (out.length >= 4) break;
  }
  let path = "";
  try {
    path = new URL(pageUrl).pathname.toLowerCase();
  } catch {
    // keep empty
  }
  if (/careers?|jobs?|vacanc/.test(path)) {
    const jobs = headings.filter((h) => h.length <= 80 && JOB_WORDS.test(h)).slice(0, 3);
    if (jobs.length) out.push(`Careers page lists ${jobs.join(", ")}`);
  }
  return out.slice(0, 5);
}

/* ---------------------------------- Pages --------------------------------- */

export type PageKind = "about" | "services" | "products" | "contact" | "team" | "careers" | "pricing" | "solutions";

const KIND_RULES: [PageKind, RegExp][] = [
  ["team", /\b(?:team|leadership|management|our[-_ ]people|board|directors|founders?|executives?|staff)\b/],
  ["contact", /\b(?:contact|contact[-_ ]us|get[-_ ]in[-_ ]touch|reach[-_ ]us|find[-_ ]us|locations?)\b/],
  ["careers", /\b(?:careers?|jobs?|vacanc(?:y|ies)|join[-_ ]us|work[-_ ]with[-_ ]us)\b/],
  ["about", /\b(?:about|about[-_ ]us|who[-_ ]we[-_ ]are|our[-_ ]story|company|profile|history)\b/],
  ["services", /\b(?:services?|what[-_ ]we[-_ ]do|our[-_ ]work|expertise|capabilities)\b/],
  ["products", /\b(?:products?|catalog(?:ue)?|shop|store)\b/],
  ["solutions", /\b(?:solutions?|industries|sectors)\b/],
  ["pricing", /\b(?:pricing|prices|plans|rates|packages)\b/],
];

/** Which research page a link points to, from its address and its text. */
export function classifyPage(url: string, linkText?: string): PageKind | null {
  let path = "";
  try {
    path = decodeURIComponent(new URL(url).pathname).toLowerCase();
  } catch {
    return null;
  }
  if (/\.(?:pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp[34])$/.test(path)) return null;
  const text = (linkText ?? "").toLowerCase();
  for (const [kind, re] of KIND_RULES) if (re.test(path.replace(/\//g, " ")) || re.test(text)) return kind;
  return null;
}

const PARKED = /this domain (?:is|may be) for sale|buy this domain|domain (?:is )?parked|parked free|sedoparking|parkingcrew|hugedomains|dan\.com|afternic|domain parking|this domain name is available/i;
const DEFAULT_SERVER = /apache2 (?:ubuntu|debian) default page|welcome to nginx!?|iis windows server|^it works!?$|^index of \/|default web site page|test page for the (?:apache|nginx)|this is the default (?:web )?page/i;
const SUSPENDED = /account (?:has been )?suspended|this account has been suspended|bandwidth limit exceeded|website is suspended/i;

/** Spots parked domains, default server pages and suspended hosting. */
export function detectPlaceholderPage(extract: Pick<PageExtract, "title" | "text">): "parked" | "default_server_page" | "suspended" | null {
  const title = extract.title ?? "";
  const text = extract.text.slice(0, 4000);
  const short = extract.text.length < 1500;
  if (PARKED.test(title) || (short && PARKED.test(text))) return "parked";
  if (SUSPENDED.test(title) || (short && SUSPENDED.test(text))) return "suspended";
  if (DEFAULT_SERVER.test(title.trim()) || (short && DEFAULT_SERVER.test(text.slice(0, 300)))) return "default_server_page";
  return null;
}

const SKIP_FILES = /\.(?:pdf|jpe?g|png|gif|webp|svg|zip|rar|docx?|xlsx?|pptx?|mp[34]|avi|mov|exe|dmg|apk)$/i;
const bareHost = (h: string) => h.toLowerCase().replace(/^www\d?\./, "");

export function extractPage(html: string, pageUrl: string, opts: { maxTextChars?: number } = {}): PageExtract {
  const empty: PageExtract = { url: pageUrl, emails: [], phones: [], whatsapp: [], socials: [], people: [], internalLinks: [], hasViewport: false, technology: [], hiring: [], offerings: [], text: "", h1Count: 0, images: 0, imagesWithoutAlt: 0, assets: [] };
  let root: HTMLElement;
  let base: URL;
  try {
    root = parse(html, { comment: false, blockTextElements: { script: true, noscript: true, style: true } });
    base = new URL(pageUrl);
  } catch {
    return empty;
  }

  const meta = (sel: string) => collapse(root.querySelector(sel)?.getAttribute("content") ?? "") || undefined;
  const title = collapse(root.querySelector("title")?.text ?? "") || undefined;
  const description = meta('meta[name="description"]') ?? meta('meta[property="og:description"]');
  const generator = meta('meta[name="generator"]');
  const viewport = meta('meta[name="viewport"]') ?? "";

  // JSON LD first, while the script elements are still in the tree.
  const emails: string[] = [];
  const phones: string[] = [];
  const socials: { platform: string; url: string }[] = [];
  const people: { name: string; title?: string; linkedinUrl?: string }[] = [];
  let siteName = meta('meta[property="og:site_name"]');
  let address: PageExtract["address"];
  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown;
    try {
      data = JSON.parse(script.rawText);
    } catch {
      continue;
    }
    for (const node of flattenLd(data)) {
      const types = typesOf(node);
      if (types.some((t) => t === "Person")) continue;
      if (!types.some((t) => ORG_TYPES.test(t))) continue;
      siteName ??= str(node.name);
      for (const t of list(node.telephone)) if (typeof t === "string") phones.push(t);
      for (const e of list(node.email)) if (typeof e === "string") emails.push(e);
      for (const s of list(node.sameAs)) if (typeof s === "string") {
        const social = socialOf(s);
        if (social) socials.push(social);
      }
      const a = list(node.address).find(isObj);
      if (a && !address) address = { street: str(a.streetAddress), city: str(a.addressLocality), region: str(a.addressRegion), country: str(a.addressCountry) };
      for (const key of ["founder", "founders", "employee", "employees", "member", "members", "author"]) {
        for (const person of list(node[key])) {
          if (!isObj(person)) continue;
          const name = str(person.name);
          if (name && name.length <= 60) people.push({ name, title: str(person.jobTitle) ?? (key.startsWith("founder") ? "Founder" : undefined) });
        }
      }
    }
  }

  // Links: internal pages, contacts, socials and WhatsApp.
  const whatsapp: string[] = [];
  const internal = new Map<string, string>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = (a.getAttribute("href") ?? "").trim();
    if (!href) continue;
    if (/^mailto:/i.test(href)) {
      emails.push(href);
      continue;
    }
    if (/^tel:/i.test(href)) {
      phones.push(decodeURIComponent(href.slice(4)).trim());
      continue;
    }
    if (/^(?:javascript|data|sms):/i.test(href)) continue;
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    const wa = whatsappOf(u.toString());
    if (wa) {
      whatsapp.push(wa);
      continue;
    }
    const social = socialOf(u.toString());
    if (social) {
      socials.push(social);
      continue;
    }
    if (bareHost(u.hostname) !== bareHost(base.hostname)) continue;
    u.hash = "";
    if (SKIP_FILES.test(u.pathname)) continue;
    const key = u.toString();
    if (!internal.has(key) && internal.size < 200) internal.set(key, collapse(a.text || a.getAttribute("aria-label") || a.getAttribute("title") || "").slice(0, 80));
  }

  const technology = detectTechnology(root, html, generator);

  // What the page loads, for the page weight sample. Inline data is skipped.
  const assets: PageExtract["assets"] = [];
  const addAsset = (kind: "script" | "style" | "image", ref: string | undefined) => {
    if (!ref || /^data:/i.test(ref) || assets.length >= 80) return;
    try {
      const u = new URL(ref.trim(), base);
      if ((u.protocol === "http:" || u.protocol === "https:") && !assets.some((a) => a.url === u.toString())) assets.push({ kind, url: u.toString() });
    } catch {
      // ignore malformed addresses
    }
  };
  for (const s of root.querySelectorAll("script[src]")) addAsset("script", s.getAttribute("src"));
  for (const l of root.querySelectorAll("link[href]")) if (/\bstylesheet\b/i.test(l.getAttribute("rel") ?? "")) addAsset("style", l.getAttribute("href"));
  const imgs = root.querySelectorAll("img");
  for (const img of imgs) addAsset("image", img.getAttribute("src") ?? img.getAttribute("data-src"));
  const imagesWithoutAlt = imgs.filter((img) => img.getAttribute("alt") === undefined).length;
  const htmlLang = root.querySelector("html")?.getAttribute("lang")?.trim() || undefined;

  // Visible text only from here on.
  for (const el of root.querySelectorAll("script,style,noscript,template,svg,iframe")) el.remove();
  const body = root.querySelector("body") ?? root;
  const fullText = collapse(body.structuredText ?? body.text);
  const text = fullText.slice(0, opts.maxTextChars ?? 20000);
  emails.push(...emailsInText(fullText));
  phones.push(...phonesInText(body.structuredText ?? fullText));
  people.push(...peopleFromDom(body));

  const headings = body.querySelectorAll("h1,h2,h3,h4").map((h) => collapse(h.text)).filter(Boolean);
  // Counted before navigation and footers are removed below.
  const h1Count = body.querySelectorAll("h1").length;
  const hiring = hiringSnippets(fullText, pageUrl, headings);

  // Services and products, without navigation and footer noise.
  let offerings: string[] = [];
  const offeringPage = /services?|products?|solutions?|what[-_]we[-_]do|offer/i.test(base.pathname) || headings.slice(0, 3).some((h) => /services|products|solutions|what we do|we offer/i.test(h));
  if (offeringPage) {
    for (const el of body.querySelectorAll("nav,header,footer,aside")) el.remove();
    for (const el of body.querySelectorAll("[class],[id]")) {
      const marker = `${el.getAttribute("class") ?? ""} ${el.getAttribute("id") ?? ""}`;
      if (/\b(?:nav|navbar|menu|footer|breadcrumb|sidebar)\b/i.test(marker)) el.remove();
    }
    offerings = [...new Set(body.querySelectorAll("h2,h3,h4,li").map((el) => collapse(el.text)).filter((t) => t.length >= 3 && t.length <= 80 && !/^(?:home|about|contact|read more|learn more|get started)$/i.test(t)))].slice(0, 30);
  }

  const dedupeBy = <T>(items: T[], key: (t: T) => string) => {
    const seen = new Set<string>();
    return items.filter((i) => {
      const k = key(i);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  return {
    url: pageUrl,
    title,
    description,
    siteName,
    emails: dedupeBy(emails.map((e) => normaliseEmail(e)).filter((e): e is string => !!e), (e) => e),
    phones: dedupeBy(phones.map((p) => collapse(p)).filter((p) => digitsOf(p).length >= 7), (p) => digitsOf(p).slice(-9)),
    whatsapp: dedupeBy(whatsapp, (w) => w),
    socials: dedupeBy(socials, (s) => s.url.toLowerCase()),
    people: dedupeBy(people, (p) => p.name.toLowerCase()).slice(0, 20),
    internalLinks: [...internal].map(([url, t]) => ({ url, text: t })),
    hasViewport: /width\s*=\s*device-width|initial-scale/i.test(viewport),
    copyrightYear: copyrightYear(fullText),
    generator,
    technology,
    hiring,
    offerings,
    address,
    text,
    htmlLang,
    h1Count,
    images: imgs.length,
    imagesWithoutAlt,
    assets,
  };
}
