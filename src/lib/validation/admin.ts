import { z } from "zod";
import { PROJECT_STATUSES } from "@/types/content";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optStr = (max = 2000) => z.string().trim().max(max).optional().or(z.literal(""));
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const httpsUrl = z.string().trim().url().refine((u) => u.startsWith("https://"), "Must be an https:// URL");
const lines = z
  .string()
  .max(20000)
  .optional()
  .transform((v) => (v ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const num = (min = 0, max = 1e12) => z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().min(min).max(max).optional());
const dateOpt = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : new Date(String(v))), z.date().optional());

export const idSchema = z.object({ id: objectId });

export const inquiryStatusSchema = z.object({ id: objectId, status: z.enum(["NEW", "REVIEWED", "QUALIFIED", "CONVERTED", "SPAM", "CLOSED"]), note: optStr(1000) });
export const inquiryNoteSchema = z.object({ id: objectId, body: z.string().trim().min(1, "Write a note").max(4000) });
export const assignSchema = z.object({ id: objectId, userId: z.union([objectId, z.literal("")]) });

export const leadUpdateSchema = z.object({
  id: objectId,
  title: optStr(200),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST", "ON_HOLD", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedTo: z.union([objectId, z.literal("")]).optional(),
  estimatedValue: num(),
  currency: optStr(3),
  followUpAt: dateOpt,
  followUpNote: optStr(500),
  lostReason: optStr(500),
  note: optStr(2000),
});
export const leadActivitySchema = z.object({ id: objectId, kind: z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP"]), body: z.string().trim().min(1, "Write something").max(4000) });

export const clientSchema = z.object({
  id: z.union([objectId, z.literal("")]).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: optStr(40),
  whatsapp: optStr(40),
  jobTitle: optStr(120),
  organizationName: optStr(160),
  preferredContact: z.enum(["EMAIL", "PHONE", "WHATSAPP"]).default("EMAIL"),
  tags: optStr(300),
  notes: optStr(4000),
  marketingConsent: bool.optional(),
});

export const bookingTransitionSchema = z.object({
  id: objectId,
  status: z.enum(["REQUESTED", "CONFIRMED", "RESCHEDULED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
  startsAt: dateOpt,
  durationMinutes: num(5, 480),
  meetingUrl: z.union([httpsUrl, z.literal("")]).optional(),
  note: optStr(1000),
});

export const proposalVersionSchema = z.object({
  summary: optStr(4000),
  scope: optStr(20000),
  deliverables: lines,
  lineItems: z
    .string()
    .max(20000)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          // "Label | qty | unit amount | description"
          const [label = "", qty = "1", unit = "0", ...desc] = l.split("|").map((s) => s.trim());
          return { label, quantity: Number(qty) || 1, unitAmount: Number(unit) || 0, description: desc.join(" | ") || undefined };
        })
        .filter((li) => li.label),
    ),
  currency: z.string().trim().length(3).default("NGN"),
  taxRatePercent: num(0, 100),
  validUntil: dateOpt,
  notes: optStr(4000),
});
export const proposalCreateSchema = proposalVersionSchema.extend({
  title: z.string().trim().min(3).max(200),
  leadId: z.union([objectId, z.literal("")]).optional(),
  clientId: z.union([objectId, z.literal("")]).optional(),
});
export const proposalVersionAddSchema = proposalVersionSchema.extend({ id: objectId });
export const proposalTransitionSchema = z.object({ id: objectId, status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]), note: optStr(1000), sentTo: z.union([z.email(), z.literal("")]).optional() });

export const internalProjectSchema = z.object({
  id: z.union([objectId, z.literal("")]).optional(),
  name: z.string().trim().min(2).max(200),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNED"),
  clientId: z.union([objectId, z.literal("")]).optional(),
  leadId: z.union([objectId, z.literal("")]).optional(),
  proposalId: z.union([objectId, z.literal("")]).optional(),
  ownerId: z.union([objectId, z.literal("")]).optional(),
  memberIds: z.array(objectId).optional(),
  summary: optStr(4000),
  startDate: dateOpt,
  deadline: dateOpt,
  progressPercent: num(0, 100),
  confidential: bool.optional(),
});
export const milestoneSchema = z.object({ id: objectId, title: z.string().trim().min(1).max(200), dueAt: dateOpt });
export const milestoneStatusSchema = z.object({ id: objectId, milestoneId: objectId, status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"]) });
export const projectNoteSchema = z.object({ id: objectId, body: z.string().trim().min(1).max(4000) });

export const portfolioSchema = z.object({
  originalSlug: optStr(80),
  slug,
  title: z.string().trim().min(2).max(120),
  teaser: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(5000),
  clientOrOwner: optStr(160),
  publishedRole: optStr(160),
  industry: optStr(120),
  services: lines,
  technologies: lines,
  status: z.enum(PROJECT_STATUSES),
  year: num(2000, 2100),
  challenge: optStr(3000),
  goals: lines,
  approach: optStr(3000),
  features: lines,
  outcomes: lines,
  engineeringNotes: optStr(3000),
  liveUrl: z.union([httpsUrl, z.literal("")]).optional(),
  repoUrl: z.union([httpsUrl, z.literal("")]).optional(),
  isLiveUrlPublic: bool.optional(),
  approvedForPublication: bool.optional(),
  featured: bool.optional(),
  published: bool.optional(),
  sortOrder: num(0, 999),
  relatedSlugs: lines,
});

export const portfolioMediaSchema = z.object({
  slug,
  mediaId: optStr(120),
  src: z.string().trim().min(1, "Choose or paste an image path").max(500),
  alt: z.string().trim().min(5, "Describe what is on screen").max(300),
  caption: optStr(300),
  pageLabel: optStr(80),
  kind: z.enum(["screenshot", "video", "illustration", "device-mockup"]).default("screenshot"),
  device: z.enum(["desktop", "mobile", ""]).optional(),
  isAuthenticScreenshot: bool.optional(),
  approvedForPublication: bool.optional(),
  sortOrder: num(0, 999),
  setAsCover: bool.optional(),
});
export const portfolioMediaRemoveSchema = z.object({ slug, mediaId: z.string().min(1) });

export const serviceSchema = z.object({
  originalSlug: optStr(80),
  slug,
  index: z.string().trim().min(1).max(4),
  title: z.string().trim().min(2).max(120),
  shortTitle: optStr(60),
  summary: z.string().trim().min(10).max(400),
  description: z.string().trim().min(20).max(5000),
  problems: lines,
  deliverables: lines,
  workflow: lines, // "Title :: detail"
  technicalApproach: optStr(3000),
  heroStyle: z.enum(["grid", "stack", "frame", "orbit", "split", "ledger", "flow", "cloud"]).default("grid"),
  faqs: lines, // "Question :: answer"
  relatedProjectSlugs: lines,
  published: bool.optional(),
  sortOrder: num(0, 999),
});

export const solutionSchema = z.object({
  originalSlug: optStr(80),
  slug,
  sector: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(10).max(400),
  description: z.string().trim().min(20).max(5000),
  needs: lines,
  useCases: lines, // "Title :: detail"
  workflow: lines,
  architectureNotes: optStr(3000),
  proofProjectSlugs: lines,
  capabilityStatus: z.enum(["delivered", "proposed", "mixed"]).default("proposed"),
  published: bool.optional(),
  sortOrder: num(0, 999),
});

export const technologySchema = z.object({
  originalSlug: optStr(80),
  slug,
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(2).max(60),
  description: optStr(300),
  projectSlugs: lines,
  published: bool.optional(),
});

export const articleSchema = z.object({
  originalSlug: optStr(80),
  slug,
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(50).max(100000),
  author: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  tags: optStr(300),
  coverSrc: optStr(500),
  coverAlt: optStr(300),
  published: bool.optional(),
  publishedAt: dateOpt,
});

export const careerSchema = z.object({
  originalSlug: optStr(80),
  slug,
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().min(2).max(80),
  type: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
  summary: z.string().trim().min(10).max(400),
  description: z.string().trim().min(20).max(20000),
  requirements: lines,
  published: bool.optional(),
});

export const testimonialSchema = z.object({
  id: z.union([objectId, z.literal("")]).optional(),
  quote: z.string().trim().min(10).max(1000),
  author: z.string().trim().min(2).max(120),
  role: optStr(120),
  company: optStr(120),
  approved: bool.optional(),
  published: bool.optional(),
});

export const faqSchema = z.object({
  id: z.union([objectId, z.literal("")]).optional(),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  scope: z.string().trim().min(2).max(60).default("general"),
  sortOrder: num(0, 999),
  published: bool.optional(),
});

export const deleteSchema = z.object({ id: z.string().min(1), kind: z.enum(["service", "solution", "technology", "article", "career", "testimonial", "faq", "media", "portfolio"]) });

export const mediaUpdateSchema = z.object({ id: objectId, alt: z.string().trim().max(300), caption: optStr(300), approvedForPublication: bool.optional(), isAuthenticScreenshot: bool.optional() });

export const settingsSchema = z.object({
  section: z.enum(["brand", "contact", "socials", "booking", "notifications", "seo", "home", "legal"]),
  // brand
  legalName: optStr(160),
  shortName: optStr(60),
  tagline: optStr(200),
  description: optStr(500),
  logoUrl: optStr(500),
  accentColor: optStr(20),
  // contact
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: optStr(40),
  whatsappDigits: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ?? "").replace(/\D/g, "")),
  addressLine: optStr(200),
  city: optStr(80),
  country: optStr(80),
  showLocation: bool.optional(),
  // socials
  linkedin: z.union([httpsUrl, z.literal("")]).optional(),
  github: z.union([httpsUrl, z.literal("")]).optional(),
  x: z.union([httpsUrl, z.literal("")]).optional(),
  instagram: z.union([httpsUrl, z.literal("")]).optional(),
  youtube: z.union([httpsUrl, z.literal("")]).optional(),
  // booking
  mode: z.enum(["request", "calcom"]).optional(),
  publicEventLink: z.union([httpsUrl, z.literal("")]).optional(),
  operatingHoursNote: optStr(200),
  // notifications
  inquiryEmails: lines,
  bookingEmails: lines,
  // seo
  defaultTitle: optStr(120),
  titleTemplate: optStr(60),
  defaultDescription: optStr(300),
  ogImageUrl: optStr(500),
  indexable: bool.optional(),
  // home
  heroHeadline: optStr(160),
  heroSupport: optStr(400),
  showreelVideoUrl: optStr(500),
  showreelPosterUrl: optStr(500),
  featuredProjectSlugs: lines,
  showcaseProjectSlugs: lines,
  // legal
  privacyMarkdown: optStr(100000),
  termsMarkdown: optStr(100000),
  privacyReviewed: bool.optional(),
  termsReviewed: bool.optional(),
});

export const inviteSchema = z.object({ email: z.email(), name: z.string().trim().min(2).max(120), role: z.enum(["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT", "CONTENT_MANAGER", "PROJECT_MANAGER"]) });
export const roleChangeSchema = z.object({ id: objectId, role: z.enum(["SUPER_ADMIN", "ADMIN", "BUSINESS_DEVELOPMENT", "CONTENT_MANAGER", "PROJECT_MANAGER"]) });
export const activeSchema = z.object({ id: objectId, active: z.enum(["true", "false"]) });

export function splitPair(line: string): { a: string; b: string } {
  const [a = "", ...rest] = line.split("::");
  return { a: a.trim(), b: rest.join("::").trim() };
}
