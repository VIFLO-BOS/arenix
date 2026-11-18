import mongoose, { Schema, Types, type Model } from "mongoose";
import {
  AI_PROVIDERS,
  OUTREACH_CHANNELS,
  OUTREACH_DRAFT_STATUSES,
  PROSPECT_SEARCH_STATUSES,
  REGISTRATION_STATUSES,
  RESEARCH_TASK_STATUSES,
  SCORE_BANDS,
  SUPPRESSION_KINDS,
  VERIFICATION_LEVELS,
  WEBSITE_STATUSES,
  type AiProviderId,
  type CrawlSettings,
  type ModelPrice,
  type ScoringWeights,
  type TargetingSettings,
  type OutreachChannel,
  type OutreachDraftStatus,
  type ProspectSearchStatus,
  type ProviderSettings,
  type RegistrationStatus,
  type ResearchTaskStatus,
  type ScoreBand,
  type SuppressionKind,
  type VerificationLevel,
  type WebsiteStatus,
} from "@/types/research";

/**
 * Lead research collections. Everything here is additive. Discovered businesses live in
 * Prospect until a person adds them to the existing CRM (Organization, Client and Lead in
 * crm.ts), so this is a research workspace and not a second lead database.
 *
 * Models use explicit interfaces with new Schema<Doc>() like the rest of the project
 * (InferSchemaType made the type check very slow).
 */

/* ------------------------------ Interfaces ----------------------------- */

export interface LeadResearchSettingsDoc {
  _id: Types.ObjectId;
  key: string;
  providers: Record<AiProviderId, ProviderSettings>;
  providerOrder: AiProviderId[];
  budget: { monthlyCapUsd: number; perSearchCapUsd: number };
  prices: ModelPrice[];
  searchPricePer1000: Record<AiProviderId, number>;
  crawl?: Partial<CrawlSettings>;
  scoring?: Partial<ScoringWeights>;
  targeting?: Partial<TargetingSettings>;
  retentionMonths?: number;
  placesMonthlyLimit?: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** One row per external call (AI request, search, crawl), with its estimated cost. */
export interface ApiUsageDoc {
  _id: Types.ObjectId;
  /** An AI provider id, or a data source such as google_places, pagespeed or crawler. */
  provider: string;
  model?: string;
  /** What the call was for, for example research, analyse or provider_test. */
  feature: string;
  inputTokens: number;
  outputTokens: number;
  searchCalls: number;
  /** Pages fetched or API requests made, for sources that are not billed by token. */
  units?: number;
  costUsd: number;
  ok: boolean;
  errorKind?: string;
  errorMessage?: string;
  durationMs?: number;
  /** Set when a different model served the request than the one asked for. */
  requestedModel?: string;
  searchId?: Types.ObjectId;
  prospectId?: Types.ObjectId;
  userId?: Types.ObjectId;
  createdAt: Date;
}

export interface ResearchTaskDoc {
  _id: Types.ObjectId;
  type: string;
  status: ResearchTaskStatus;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  searchId?: Types.ObjectId;
  prospectId?: Types.ObjectId;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedBy?: string;
  lockedUntil?: Date;
  /**
   * Set while the task is pending or running and removed when it ends. The unique index
   * on it is what stops the same job being queued twice.
   */
  activeKey?: string;
  cancelRequested: boolean;
  error?: string;
  createdBy?: Types.ObjectId;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProspectSearchDoc {
  _id: Types.ObjectId;
  query: string;
  filters: Record<string, unknown>;
  providers: string[];
  status: ProspectSearchStatus;
  progress: { total: number; done: number; failed: number };
  estimatedCostUsd: number;
  actualCostUsd: number;
  /** Hash of the query, filters and providers. Stops the same search running twice in a day. */
  queryHash: string;
  cancelRequested: boolean;
  errorLog: string[];
  createdBy?: Types.ObjectId;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProspectContact {
  _id?: Types.ObjectId;
  kind: "EMAIL" | "PHONE" | "WHATSAPP";
  value: string;
  verification: VerificationLevel;
  sourceUrl?: string;
  seenAt: Date;
}

export interface ProspectPerson {
  _id?: Types.ObjectId;
  name: string;
  title?: string;
  linkedinUrl?: string;
  sourceUrl?: string;
  verification: VerificationLevel;
  seenAt: Date;
}

/** Which AI or data source found the business. Feeds the Found by column. */
export interface ProspectFoundBy {
  provider: string;
  searchId?: Types.ObjectId;
  sourceUrls: string[];
  /** The short quote or note the source gave for the match. */
  evidence?: string;
  /** Source pages that were fetched and really mention the business. */
  confirmedUrls?: string[];
  /** Set once the source pages were checked, whatever the outcome. */
  checkedAt?: Date;
  at: Date;
}

export const RESEARCH_STATES = ["IDLE", "QUEUED", "RUNNING", "DONE", "FAILED"] as const;
export type ResearchState = (typeof RESEARCH_STATES)[number];

export interface ProspectScore {
  value: number;
  band: ScoreBand;
  /** Points per signal, for the explanation. */
  breakdown: Record<string, number>;
  /** Why each signal scored what it did. */
  explanations?: Record<string, string>;
  base?: number;
  aiAdjustment: number;
  reasons: string[];
  scoredAt: Date;
}

export interface ProspectSummary {
  /** Verified facts. Each one names the stored evidence it rests on. */
  facts: string[];
  observations: string[];
  assumptions: string[];
  opportunities: string[];
  services: string[];
  whatTheyDo?: string;
  digitalPresence?: string;
  challenges?: string[];
  whyApproach?: string;
  outreachStrategy?: string;
  model?: string;
  /** Fingerprint of the research the summary was written from. A change means it is out of date. */
  inputHash?: string;
  generatedAt: Date;
}

export interface ProspectWebsite {
  url?: string;
  status: WebsiteStatus;
  evidence: string[];
  /** Results of the last visit (see SiteCheck in src/server/research/types.ts). */
  audit?: Record<string, unknown>;
  pagespeed?: { performance?: number; accessibility?: number; bestPractices?: number; seo?: number; fetchedAt: Date };
  /** Failed visits, kept so a site is only called broken after two failures an hour apart. */
  failures: { at: Date; reason: string }[];
  /** Sources that were checked and list no website. Two are needed for NO_WEBSITE_FOUND. */
  noWebsiteSources: string[];
  pagesCrawled?: number;
  crawledAt?: Date;
  checkedAt?: Date;
}

export interface ProspectDoc {
  _id: Types.ObjectId;
  name: string;
  normalisedName: string;
  domain?: string;
  location: { country?: string; region?: string; city?: string };
  address?: string;
  industry?: string;
  sizeHint?: string;
  description?: string;
  offerings: string[];
  registration: { registry?: string; number?: string; status: RegistrationStatus; companyStatus?: string; sourceUrl?: string; note?: string; checkedBy?: Types.ObjectId; checkedAt?: Date };
  website: ProspectWebsite;
  contacts: ProspectContact[];
  people: ProspectPerson[];
  socials: { platform: string; url: string }[];
  hiringSignals: string[];
  technologyHints: string[];
  foundBy: ProspectFoundBy[];
  /** Overall: VERIFIED when a source page or the business's own site confirms it. */
  verification: VerificationLevel;
  /** Google's terms allow the place id to be stored. Names and addresses from Google are not. */
  googlePlaceId?: string;
  osmId?: string;
  score?: ProspectScore;
  summary?: ProspectSummary;
  research: { state: ResearchState; step?: string; error?: string; updatedAt?: Date };
  assistantLog: { question: string; answer: string; model?: string; askedBy?: Types.ObjectId; at: Date }[];
  leadId?: Types.ObjectId;
  dismissedAt?: Date;
  optedOutAt?: Date;
  lastResearchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutreachDraftDoc {
  _id: Types.ObjectId;
  prospectId: Types.ObjectId;
  leadId?: Types.ObjectId;
  channel: OutreachChannel;
  kind: string;
  /** 0 is the first message, 1 and 2 are follow ups. */
  step: number;
  /** Groups a first message with its follow ups. */
  sequenceId?: string;
  /** Email address, phone number or profile link the message is for, when known. */
  to?: string;
  subject?: string;
  body: string;
  model?: string;
  status: OutreachDraftStatus;
  dueAt?: Date;
  sentAt?: Date;
  sentBy?: Types.ObjectId;
  stoppedReason?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Opt outs. Only a hash of the address or number is stored, so the list holds no contact
 * details. Domains are business addresses and are kept readable as the hint.
 */
export interface SuppressionDoc {
  _id: Types.ObjectId;
  kind: SuppressionKind;
  valueHash: string;
  /** The domain for DOMAIN entries, a masked form for the others. */
  hint?: string;
  reason?: string;
  addedBy?: Types.ObjectId;
  createdAt: Date;
}

/* ------------------------------- Schemas -------------------------------- */

const TaskModelsSchema = new Schema(
  {
    research: { type: String, required: true },
    extract: { type: String, required: true },
    analyse: { type: String, required: true },
    write: { type: String, required: true },
  },
  { _id: false },
);

const ProviderSettingsSchema = new Schema<ProviderSettings>(
  {
    enabled: { type: Boolean, default: false },
    allowFallback: { type: Boolean, default: false },
    monthlyCapUsd: { type: Number, default: 5, min: 0 },
    models: { type: TaskModelsSchema, required: true },
  },
  { _id: false },
);

const ModelPriceSchema = new Schema<ModelPrice>(
  {
    provider: { type: String, enum: AI_PROVIDERS, required: true },
    model: { type: String, required: true },
    inputPerMTok: { type: Number, required: true, min: 0 },
    outputPerMTok: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// Defaults are applied in src/server/ai/settings.ts, which merges stored values over
// DEFAULT_RESEARCH_SETTINGS, so new settings can be added later without a migration.
const LeadResearchSettingsSchema = new Schema<LeadResearchSettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: "lead-research" },
    providers: {
      anthropic: { type: ProviderSettingsSchema },
      gemini: { type: ProviderSettingsSchema },
      openai: { type: ProviderSettingsSchema },
    },
    providerOrder: [{ type: String, enum: AI_PROVIDERS }],
    budget: {
      monthlyCapUsd: { type: Number, min: 0 },
      perSearchCapUsd: { type: Number, min: 0 },
    },
    prices: { type: [ModelPriceSchema], default: undefined },
    searchPricePer1000: {
      anthropic: { type: Number, min: 0 },
      gemini: { type: Number, min: 0 },
      openai: { type: Number, min: 0 },
    },
    // Validated and defaulted by mergeResearchSettings, so stored as plain objects.
    crawl: { type: Schema.Types.Mixed },
    scoring: { type: Schema.Types.Mixed },
    targeting: { type: Schema.Types.Mixed },
    retentionMonths: { type: Number, min: 1 },
    placesMonthlyLimit: { type: Number, min: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, minimize: false },
);

const ApiUsageSchema = new Schema<ApiUsageDoc>(
  {
    provider: { type: String, required: true },
    model: { type: String },
    feature: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    searchCalls: { type: Number, default: 0 },
    units: { type: Number },
    costUsd: { type: Number, default: 0 },
    ok: { type: Boolean, required: true },
    errorKind: { type: String },
    errorMessage: { type: String },
    durationMs: { type: Number },
    requestedModel: { type: String },
    searchId: { type: Schema.Types.ObjectId, ref: "ProspectSearch" },
    prospectId: { type: Schema.Types.ObjectId, ref: "Prospect" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ApiUsageSchema.index({ createdAt: -1 });
ApiUsageSchema.index({ provider: 1, createdAt: -1 });
ApiUsageSchema.index({ searchId: 1 }, { sparse: true });

const ResearchTaskSchema = new Schema<ResearchTaskDoc>(
  {
    type: { type: String, required: true },
    status: { type: String, enum: RESEARCH_TASK_STATUSES, default: "PENDING" },
    payload: { type: Schema.Types.Mixed },
    result: { type: Schema.Types.Mixed },
    searchId: { type: Schema.Types.ObjectId, ref: "ProspectSearch" },
    prospectId: { type: Schema.Types.ObjectId, ref: "Prospect" },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    runAfter: { type: Date, default: Date.now },
    lockedBy: { type: String },
    lockedUntil: { type: Date },
    activeKey: { type: String },
    cancelRequested: { type: Boolean, default: false },
    error: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true },
);
ResearchTaskSchema.index({ status: 1, runAfter: 1 });
ResearchTaskSchema.index({ searchId: 1, status: 1 });
ResearchTaskSchema.index({ activeKey: 1 }, { unique: true, sparse: true });

const ProspectSearchSchema = new Schema<ProspectSearchDoc>(
  {
    query: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    providers: [{ type: String }],
    status: { type: String, enum: PROSPECT_SEARCH_STATUSES, default: "QUEUED", index: true },
    progress: {
      total: { type: Number, default: 0 },
      done: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    estimatedCostUsd: { type: Number, default: 0 },
    actualCostUsd: { type: Number, default: 0 },
    queryHash: { type: String, required: true, index: true },
    cancelRequested: { type: Boolean, default: false },
    errorLog: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    finishedAt: { type: Date },
  },
  { timestamps: true, minimize: false },
);
ProspectSearchSchema.index({ createdAt: -1 });

const ProspectContactSchema = new Schema<ProspectContact>({
  kind: { type: String, enum: ["EMAIL", "PHONE", "WHATSAPP"], required: true },
  value: { type: String, required: true },
  verification: { type: String, enum: VERIFICATION_LEVELS, default: "UNVERIFIED" },
  sourceUrl: { type: String },
  seenAt: { type: Date, default: Date.now },
});

const ProspectPersonSchema = new Schema<ProspectPerson>({
  name: { type: String, required: true },
  title: { type: String },
  linkedinUrl: { type: String },
  sourceUrl: { type: String },
  verification: { type: String, enum: VERIFICATION_LEVELS, default: "UNVERIFIED" },
  seenAt: { type: Date, default: Date.now },
});

const ProspectFoundBySchema = new Schema<ProspectFoundBy>(
  {
    provider: { type: String, required: true },
    searchId: { type: Schema.Types.ObjectId, ref: "ProspectSearch" },
    sourceUrls: [{ type: String }],
    evidence: { type: String },
    confirmedUrls: [{ type: String }],
    checkedAt: { type: Date },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ProspectSchema = new Schema<ProspectDoc>(
  {
    name: { type: String, required: true, trim: true },
    normalisedName: { type: String, required: true, index: true },
    domain: { type: String, lowercase: true, trim: true },
    location: {
      country: { type: String },
      region: { type: String },
      city: { type: String },
    },
    address: { type: String },
    industry: { type: String },
    sizeHint: { type: String },
    description: { type: String },
    offerings: [{ type: String }],
    registration: {
      registry: { type: String },
      number: { type: String },
      status: { type: String, enum: REGISTRATION_STATUSES, default: "NOT_CHECKED" },
      companyStatus: { type: String },
      sourceUrl: { type: String },
      note: { type: String },
      checkedBy: { type: Schema.Types.ObjectId, ref: "User" },
      checkedAt: { type: Date },
    },
    website: {
      url: { type: String },
      status: { type: String, enum: WEBSITE_STATUSES, default: "WEBSITE_STATUS_UNKNOWN" },
      evidence: [{ type: String }],
      audit: { type: Schema.Types.Mixed },
      pagespeed: { type: Schema.Types.Mixed },
      failures: [{ _id: false, at: { type: Date, required: true }, reason: { type: String, required: true } }],
      noWebsiteSources: [{ type: String }],
      pagesCrawled: { type: Number },
      crawledAt: { type: Date },
      checkedAt: { type: Date },
    },
    contacts: [ProspectContactSchema],
    people: [ProspectPersonSchema],
    socials: [{ _id: false, platform: { type: String, required: true }, url: { type: String, required: true } }],
    hiringSignals: [{ type: String }],
    technologyHints: [{ type: String }],
    foundBy: [ProspectFoundBySchema],
    verification: { type: String, enum: VERIFICATION_LEVELS, default: "UNVERIFIED" },
    googlePlaceId: { type: String },
    osmId: { type: String },
    score: {
      type: new Schema(
        {
          value: { type: Number, required: true, min: 0, max: 100 },
          band: { type: String, enum: SCORE_BANDS, required: true },
          breakdown: { type: Schema.Types.Mixed, default: {} },
          explanations: { type: Schema.Types.Mixed },
          base: { type: Number },
          aiAdjustment: { type: Number, default: 0 },
          reasons: [{ type: String }],
          scoredAt: { type: Date, default: Date.now },
        },
        { _id: false, minimize: false },
      ),
    },
    summary: {
      type: new Schema(
        {
          facts: [{ type: String }],
          observations: [{ type: String }],
          assumptions: [{ type: String }],
          opportunities: [{ type: String }],
          services: [{ type: String }],
          whatTheyDo: { type: String },
          digitalPresence: { type: String },
          challenges: [{ type: String }],
          whyApproach: { type: String },
          outreachStrategy: { type: String },
          model: { type: String },
          inputHash: { type: String },
          generatedAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    },
    research: {
      state: { type: String, enum: RESEARCH_STATES, default: "IDLE" },
      step: { type: String },
      error: { type: String },
      updatedAt: { type: Date },
    },
    assistantLog: [
      {
        _id: false,
        question: { type: String, required: true },
        answer: { type: String, required: true },
        model: { type: String },
        askedBy: { type: Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    dismissedAt: { type: Date },
    optedOutAt: { type: Date },
    lastResearchedAt: { type: Date },
  },
  { timestamps: true },
);
ProspectSchema.index({ domain: 1 }, { sparse: true });
ProspectSchema.index({ googlePlaceId: 1 }, { sparse: true });
ProspectSchema.index({ osmId: 1 }, { sparse: true });
ProspectSchema.index({ "contacts.value": 1 });
ProspectSchema.index({ leadId: 1 }, { sparse: true });
ProspectSchema.index({ "foundBy.searchId": 1 });
ProspectSchema.index({ "score.value": -1 });
ProspectSchema.index({ updatedAt: 1 });
ProspectSchema.index({ createdAt: -1 });

const OutreachDraftSchema = new Schema<OutreachDraftDoc>(
  {
    prospectId: { type: Schema.Types.ObjectId, ref: "Prospect", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    channel: { type: String, enum: OUTREACH_CHANNELS, required: true },
    kind: { type: String, default: "email" },
    step: { type: Number, default: 0, min: 0, max: 2 },
    sequenceId: { type: String, index: true },
    to: { type: String },
    subject: { type: String },
    body: { type: String, required: true },
    model: { type: String },
    status: { type: String, enum: OUTREACH_DRAFT_STATUSES, default: "DRAFT" },
    dueAt: { type: Date },
    sentAt: { type: Date },
    sentBy: { type: Schema.Types.ObjectId, ref: "User" },
    stoppedReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
OutreachDraftSchema.index({ status: 1, dueAt: 1 });

const SuppressionSchema = new Schema<SuppressionDoc>(
  {
    kind: { type: String, enum: SUPPRESSION_KINDS, required: true },
    valueHash: { type: String, required: true, unique: true },
    hint: { type: String },
    reason: { type: String },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const LeadResearchSettings = model<LeadResearchSettingsDoc>("LeadResearchSettings", LeadResearchSettingsSchema);
export const ApiUsage = model<ApiUsageDoc>("ApiUsage", ApiUsageSchema);
export const ResearchTask = model<ResearchTaskDoc>("ResearchTask", ResearchTaskSchema);
export const ProspectSearch = model<ProspectSearchDoc>("ProspectSearch", ProspectSearchSchema);
export const Prospect = model<ProspectDoc>("Prospect", ProspectSchema);
export const OutreachDraft = model<OutreachDraftDoc>("OutreachDraft", OutreachDraftSchema);
export const Suppression = model<SuppressionDoc>("Suppression", SuppressionSchema);
