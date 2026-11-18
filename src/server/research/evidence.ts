import { createHash } from "node:crypto";
import { REGISTRATION_LABEL, SOURCE_LABEL, VERIFICATION_LABEL, WEBSITE_STATUS_LABEL, type RegistrationStatus, type VerificationLevel, type WebsiteStatus } from "@/types/research";

/**
 * The evidence pack. Everything AI is told about a business comes from here: numbered items
 * built from the stored research, each with its source. The AI must cite item ids, and
 * answers that cite ids which do not exist are discarded. Only public research goes in,
 * never CRM notes or client details, so it is safe to send to any provider tier. Pure.
 */

export interface EvidenceItem {
  id: string;
  text: string;
  source?: string;
}

/** The parts of a stored prospect the pack is built from. Plain data, as returned by lean(). */
export interface EvidenceProspect {
  name: string;
  domain?: string;
  location?: { country?: string; region?: string; city?: string };
  address?: string;
  industry?: string;
  sizeHint?: string;
  description?: string;
  offerings?: string[];
  registration?: { registry?: string; number?: string; status: RegistrationStatus; companyStatus?: string; sourceUrl?: string };
  website: { url?: string; status: WebsiteStatus; evidence: string[]; pagespeed?: { performance?: number; accessibility?: number; bestPractices?: number; seo?: number }; audit?: Record<string, unknown> };
  contacts: { kind: string; value: string; verification: VerificationLevel; sourceUrl?: string }[];
  people: { name: string; title?: string; verification: VerificationLevel; sourceUrl?: string }[];
  socials: { platform: string; url: string }[];
  hiringSignals: string[];
  technologyHints: string[];
  foundBy: { provider: string; sourceUrls: string[]; evidence?: string; confirmedUrls?: string[] }[];
}

export function buildEvidence(p: EvidenceProspect): EvidenceItem[] {
  const items: Omit<EvidenceItem, "id">[] = [];
  const add = (text: string, source?: string) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (t) items.push({ text: t.slice(0, 500), source });
  };

  add(`Business name is ${p.name}.`);
  const place = [p.location?.city, p.location?.region, p.location?.country].filter(Boolean).join(", ");
  if (place) add(`Located in ${place}.`);
  if (p.address) add(`Address listed as ${p.address}.`);
  if (p.industry) add(`Industry recorded as ${p.industry}.`);
  if (p.sizeHint) add(`Size signal. ${p.sizeHint}`);
  if (p.description) add(`The business describes itself as follows. ${p.description}`, p.website.url);
  if (p.offerings?.length) add(`Services or products listed on its website include ${p.offerings.slice(0, 20).join("; ")}.`, p.website.url);

  if (p.registration) {
    const r = p.registration;
    if (r.status === "VERIFIED") add(`Registered with ${r.registry ?? "a registry"}${r.number ? `, number ${r.number}` : ""}${r.companyStatus ? `, status ${r.companyStatus}` : ""}.`, r.sourceUrl);
    else add(`Company registration is ${REGISTRATION_LABEL[r.status].toLowerCase()}.`);
  }

  add(`Website status is ${WEBSITE_STATUS_LABEL[p.website.status]}${p.website.url ? ` for ${p.website.url}` : ""}.`, p.website.url);
  for (const e of p.website.evidence.slice(0, 6)) add(`Website check. ${e}`, p.website.url);
  const ps = p.website.pagespeed;
  if (ps && (ps.performance ?? ps.accessibility ?? ps.seo) !== undefined) {
    add(`PageSpeed mobile scores out of 100. Performance ${ps.performance ?? "unknown"}, accessibility ${ps.accessibility ?? "unknown"}, best practices ${ps.bestPractices ?? "unknown"}, SEO ${ps.seo ?? "unknown"}.`, "Google PageSpeed Insights");
  }
  const audit = p.website.audit;
  if (audit) {
    const broken = (audit.brokenLinks as { checked?: number; broken?: string[] } | undefined) ?? undefined;
    if (broken?.checked) add(`${broken.broken?.length ?? 0} of ${broken.checked} sampled internal links are broken.`, p.website.url);
    if (typeof audit.hasViewport === "boolean") add(audit.hasViewport ? "The home page is set up for mobile screens." : "The home page has no mobile viewport setting.", p.website.url);
    if (typeof audit.https === "boolean") add(audit.https ? "The site uses HTTPS." : "The site does not use HTTPS.", p.website.url);
    if (typeof audit.copyrightYear === "number") add(`The latest copyright year on the site is ${audit.copyrightYear}.`, p.website.url);
    const sp = audit.speed as { responseMs?: number; htmlKb?: number; compressed?: boolean; scripts?: number; styles?: number; images?: number; estimatedPageKb?: number; sampled?: number } | undefined;
    if (sp?.responseMs !== undefined) {
      add(
        `Measured by our crawler from a server abroad (a rough guide, not a phone test). The home page took ${(sp.responseMs / 1000).toFixed(1)} seconds to arrive, its HTML is ${sp.htmlKb} KB${sp.compressed ? " and compressed" : " and not compressed"}, it loads ${sp.scripts} scripts, ${sp.styles} stylesheets and ${sp.images} images${sp.sampled ? `, and the whole page weighs about ${((sp.estimatedPageKb ?? 0) / 1024).toFixed(1)} MB` : ""}.`,
        p.website.url,
      );
    }
    const b = audit.basics as { title?: boolean; metaDescription?: boolean; h1Count?: number; lang?: boolean; images?: number; imagesWithoutAlt?: number } | undefined;
    if (b) {
      add(
        `Home page basics. Title ${b.title ? "present" : "missing"}, search description ${b.metaDescription ? "present" : "missing"}, ${b.h1Count ?? 0} main headings (h1), page language ${b.lang ? "set" : "not set"}, ${b.imagesWithoutAlt ?? 0} of ${b.images ?? 0} images without alt text.`,
        p.website.url,
      );
    }
  }
  if (p.technologyHints.length) add(`Technology seen on the website includes ${p.technologyHints.join(", ")}.`, p.website.url);
  for (const h of p.hiringSignals.slice(0, 4)) add(`Hiring signal. ${h}`, p.website.url);

  for (const c of p.contacts.slice(0, 8)) add(`Public ${c.kind.toLowerCase()} ${c.value} (${VERIFICATION_LABEL[c.verification].toLowerCase()}).`, c.sourceUrl);
  for (const x of p.people.slice(0, 10)) add(`${x.name}${x.title ? `, ${x.title}` : ""} (${VERIFICATION_LABEL[x.verification].toLowerCase()}).`, x.sourceUrl);
  if (p.socials.length) add(`Social profiles found on ${p.socials.map((s) => s.platform).join(", ")}.`);

  for (const f of p.foundBy.slice(0, 6)) {
    const label = SOURCE_LABEL[f.provider] ?? f.provider;
    const confirmed = f.confirmedUrls?.length ? ` The source page was fetched and mentions the business.` : "";
    add(`${label} found this business${f.evidence ? `, noting ${f.evidence}` : ""}.${confirmed}`, f.confirmedUrls?.[0] ?? f.sourceUrls[0]);
  }

  return items.map((it, i) => ({ id: `E${i + 1}`, ...it }));
}

/** The pack as numbered lines for a prompt. */
export function evidenceText(items: EvidenceItem[]): string {
  return items.map((it) => `[${it.id}] ${it.text}${it.source ? ` (source ${it.source})` : ""}`).join("\n");
}

/** Fingerprint of the pack. A stored summary with a different fingerprint is out of date. */
export function evidenceHash(items: EvidenceItem[]): string {
  return createHash("sha256").update(items.map((i) => i.text).join("\n")).digest("hex").slice(0, 24);
}
