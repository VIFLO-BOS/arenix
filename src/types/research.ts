/**
 * Shared constants for lead research (business discovery, website research and AI
 * analysis). Plain values only, so both server code and admin pages can import them.
 */

export const AI_PROVIDERS = ["anthropic", "gemini", "openai"] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

/** Names shown to staff, including the Found by column of the results table. */
export const AI_PROVIDER_LABEL: Record<AiProviderId, string> = {
  anthropic: "Claude",
  gemini: "Gemini",
  openai: "ChatGPT",
};

/** Environment variable that holds each provider's API key. Keys never live in the database. */
export const AI_PROVIDER_ENV: Record<AiProviderId, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
};

/**
 * The kinds of work AI is used for. Each one has its own model setting per provider.
 * Parsing pages, extracting contacts and the base score are plain code and never use AI.
 */
export const AI_TASKS = ["research", "extract", "analyse", "write"] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_TASK_LABEL: Record<AiTask, string> = {
  research: "Web research",
  extract: "Reading a request",
  analyse: "Scoring and summaries",
  write: "Answers and drafts",
};

export const AI_TASK_HINT: Record<AiTask, string> = {
  research: "Finds businesses on the web with source links",
  extract: "Turns a typed request into search filters",
  analyse: "Qualifies a business and explains the score",
  write: "Research assistant answers and outreach drafts",
};

export const WEBSITE_STATUSES = ["HAS_WEBSITE", "OUTDATED_WEBSITE", "BROKEN_WEBSITE", "NO_WEBSITE_FOUND", "WEBSITE_STATUS_UNKNOWN"] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export const VERIFICATION_LEVELS = ["VERIFIED", "PARTLY_VERIFIED", "UNVERIFIED"] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const REGISTRATION_STATUSES = ["VERIFIED", "NOT_CHECKED", "NOT_FOUND"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const SCORE_BANDS = ["HIGH_PRIORITY", "QUALIFIED", "POTENTIAL", "LOW_PRIORITY"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const PROSPECT_SEARCH_STATUSES = ["QUEUED", "RUNNING", "DONE", "FAILED", "CANCELLED"] as const;
export type ProspectSearchStatus = (typeof PROSPECT_SEARCH_STATUSES)[number];

export const RESEARCH_TASK_TYPES = ["discover", "verify", "crawl", "audit", "enrich", "analyse"] as const;
export type ResearchTaskType = (typeof RESEARCH_TASK_TYPES)[number];

export const RESEARCH_TASK_STATUSES = ["PENDING", "RUNNING", "DONE", "FAILED", "CANCELLED", "SKIPPED"] as const;
export type ResearchTaskStatus = (typeof RESEARCH_TASK_STATUSES)[number];

export const OUTREACH_CHANNELS = ["EMAIL", "LINKEDIN", "WHATSAPP"] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

/** DRAFT waits for review. APPROVED is scheduled and shows as due on its date. SENT was sent by a person. */
export const OUTREACH_DRAFT_STATUSES = ["DRAFT", "APPROVED", "SENT", "ARCHIVED"] as const;
export type OutreachDraftStatus = (typeof OUTREACH_DRAFT_STATUSES)[number];

export const SUPPRESSION_KINDS = ["DOMAIN", "EMAIL", "PHONE"] as const;
export type SuppressionKind = (typeof SUPPRESSION_KINDS)[number];

/** Price of one model, in US dollars per one million tokens. */
export interface ModelPrice {
  provider: AiProviderId;
  model: string;
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface ProviderSettings {
  enabled: boolean;
  /** May this provider take over when a provider ahead of it cannot run? */
  allowFallback: boolean;
  monthlyCapUsd: number;
  models: Record<AiTask, string>;
}

export interface ResearchSettings {
  providers: Record<AiProviderId, ProviderSettings>;
  /** Preference order. The first enabled provider is the main one. */
  providerOrder: AiProviderId[];
  budget: { monthlyCapUsd: number; perSearchCapUsd: number };
  prices: ModelPrice[];
  /** Fee for built in web search, in US dollars per 1,000 searches. */
  searchPricePer1000: Record<AiProviderId, number>;
  crawl: CrawlSettings;
  scoring: ScoringWeights;
  targeting: TargetingSettings;
  /** Prospects not added to Leads and untouched for this many months are deleted. */
  retentionMonths: number;
  /** Google Places requests allowed per month. The default stays inside the free allowance. */
  placesMonthlyLimit: number;
}

export interface CrawlSettings {
  depth: number;
  pagesPerSite: number;
  timeoutSeconds: number;
  retries: number;
  delaySeconds: number;
  maxPageKb: number;
  pagesPerDay: number;
}

/** Most points each signal can add to the base score. They need not add up to 100. */
export interface ScoringWeights {
  websiteNeed: number;
  industryFit: number;
  size: number;
  reachability: number;
  decisionMaker: number;
  hiring: number;
}

export interface TargetingSettings {
  /** Industries areniX most wants to serve. Matching ones score higher on industry fit. */
  industries: string[];
  /** Countries offered first in the search form. */
  countries: string[];
}

/** Ids written to the Found by column for sources that are not AI providers. */
export const DATA_SOURCES = ["google_places", "openstreetmap", "companies_house", "manual"] as const;
export type DataSourceId = (typeof DATA_SOURCES)[number];

export const SOURCE_LABEL: Record<string, string> = {
  ...AI_PROVIDER_LABEL,
  google_places: "Google Maps",
  openstreetmap: "OpenStreetMap",
  companies_house: "Companies House",
  manual: "Manual",
};

export const WEBSITE_STATUS_LABEL: Record<WebsiteStatus, string> = {
  HAS_WEBSITE: "Has website",
  OUTDATED_WEBSITE: "Outdated website",
  BROKEN_WEBSITE: "Broken website",
  NO_WEBSITE_FOUND: "No website found",
  WEBSITE_STATUS_UNKNOWN: "Unknown",
};

export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  HIGH_PRIORITY: "High priority",
  QUALIFIED: "Qualified",
  POTENTIAL: "Potential",
  LOW_PRIORITY: "Low priority",
};

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  VERIFIED: "Verified",
  PARTLY_VERIFIED: "Partly verified",
  UNVERIFIED: "Unverified",
};

export const REGISTRATION_LABEL: Record<RegistrationStatus, string> = {
  VERIFIED: "Verified",
  NOT_CHECKED: "Not checked",
  NOT_FOUND: "Not found",
};

/** Questions the research assistant offers as buttons. */
export const ASSISTANT_PRESETS = [
  { id: "what", label: "What does this company do?" },
  { id: "who", label: "Who should we contact?" },
  { id: "services", label: "What areniX services fit?" },
  { id: "problems", label: "What problems are visible in its digital presence?" },
  { id: "why", label: "Why is it a good prospect?" },
] as const;

export const DRAFT_KINDS = ["intro", "email", "linkedin", "whatsapp"] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];

export const DRAFT_KIND_LABEL: Record<DraftKind, string> = {
  intro: "Draft an introduction",
  email: "Draft an email",
  linkedin: "Draft a LinkedIn message",
  whatsapp: "Draft a WhatsApp message",
};
