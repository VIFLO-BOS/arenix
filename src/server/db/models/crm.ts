import mongoose, { Schema, Types, type Model } from "mongoose";

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST", "ON_HOLD", "ARCHIVED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const INQUIRY_TYPES = ["CONTACT", "PROJECT"] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];
export const INQUIRY_STATUSES = ["NEW", "REVIEWED", "QUALIFIED", "CONVERTED", "SPAM", "CLOSED"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const BOOKING_STATUSES = ["REQUESTED", "CONFIRMED", "RESCHEDULED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PROPOSAL_STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROJECT_STATUSES_INTERNAL = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export type InternalProjectStatus = (typeof PROJECT_STATUSES_INTERNAL)[number];
export const MILESTONE_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export type ContactMethod = "EMAIL" | "PHONE" | "WHATSAPP";

/* ------------------------------ Interfaces ----------------------------- */

export interface StatusEvent {
  from?: string;
  to: string;
  actorId?: Types.ObjectId;
  actorLabel?: string;
  note?: string;
  at: Date;
}

export interface NoteEntry {
  _id?: Types.ObjectId;
  body: string;
  authorId?: Types.ObjectId;
  authorLabel?: string;
  at: Date;
}

export interface OrganizationDoc {
  _id: Types.ObjectId;
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientDoc {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  organizationId?: Types.ObjectId;
  jobTitle?: string;
  preferredContact: ContactMethod;
  tags: string[];
  notes?: string;
  source?: string;
  marketingConsent: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  _id?: Types.ObjectId;
  filename: string;
  mime: string;
  size: number;
  storageKey: string;
  url?: string;
}

export interface InquiryDoc {
  _id: Types.ObjectId;
  reference: string;
  type: InquiryType;
  status: InquiryStatus;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject?: string;
  serviceCategory?: string;
  solutionContext?: string;
  projectContext?: string;
  goal?: string;
  message: string;
  features?: string;
  budgetRange?: string;
  timeline?: string;
  preferredContact: ContactMethod;
  consent: boolean;
  attachments: Attachment[];
  source: string;
  sourcePath?: string;
  idempotencyKey?: string;
  ipHash?: string;
  userAgent?: string;
  spamScore: number;
  leadId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  internalNotes: NoteEntry[];
  statusHistory: StatusEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export type LeadActivityKind = "NOTE" | "CALL" | "EMAIL" | "MEETING" | "WHATSAPP" | "STATUS" | "ASSIGNMENT" | "SYSTEM";

export interface LeadActivity {
  _id?: Types.ObjectId;
  kind: LeadActivityKind;
  body: string;
  authorId?: Types.ObjectId;
  authorLabel?: string;
  at: Date;
}

export interface LeadDoc {
  _id: Types.ObjectId;
  title: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: string;
  serviceCategory?: string;
  clientId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  inquiryId?: Types.ObjectId;
  bookingIds: Types.ObjectId[];
  proposalIds: Types.ObjectId[];
  assignedTo?: Types.ObjectId;
  estimatedValue?: number;
  currency: string;
  followUpAt?: Date;
  followUpNote?: string;
  lostReason?: string;
  activities: LeadActivity[];
  statusHistory: StatusEvent[];
  firstResponseAt?: Date;
  wonAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingEvent {
  kind: string;
  payloadId?: string;
  at: Date;
  note?: string;
}

export interface BookingDoc {
  _id: Types.ObjectId;
  reference: string;
  status: BookingStatus;
  consultationType: string;
  serviceContext?: string;
  provider: "none" | "calcom";
  externalId?: string;
  externalUid?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  summary?: string;
  preferredWindows: string[];
  visitorTimezone?: string;
  startsAt?: Date;
  endsAt?: Date;
  durationMinutes?: number;
  meetingUrl?: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
  consent: boolean;
  leadId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  events: BookingEvent[];
  statusHistory: StatusEvent[];
  ipHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalLineItem {
  label: string;
  description?: string;
  quantity: number;
  unitAmount: number;
}

export interface ProposalVersion {
  version: number;
  summary?: string;
  scope?: string;
  deliverables: string[];
  lineItems: ProposalLineItem[];
  currency: string;
  taxRatePercent?: number;
  validUntil?: Date;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

export interface ProposalDoc {
  _id: Types.ObjectId;
  reference: string;
  title: string;
  status: ProposalStatus;
  leadId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  currentVersion: number;
  versions: ProposalVersion[];
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  sentAt?: Date;
  sentTo?: string;
  decisionAt?: Date;
  decisionNote?: string;
  statusHistory: StatusEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  _id?: Types.ObjectId;
  title: string;
  dueAt?: Date;
  status: MilestoneStatus;
  completedAt?: Date;
}

export interface InternalProjectDoc {
  _id: Types.ObjectId;
  name: string;
  status: InternalProjectStatus;
  clientId?: Types.ObjectId;
  organizationId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  proposalId?: Types.ObjectId;
  ownerId?: Types.ObjectId;
  memberIds: Types.ObjectId[];
  summary?: string;
  startDate?: Date;
  deadline?: Date;
  progressPercent: number;
  milestones: Milestone[];
  notes: NoteEntry[];
  confidential: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------- Schemas -------------------------------- */

const StatusEventSchema = new Schema<StatusEvent>(
  {
    from: { type: String },
    to: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorLabel: { type: String },
    note: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const NoteSchema = new Schema<NoteEntry>({
  body: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User" },
  authorLabel: { type: String },
  at: { type: Date, default: Date.now },
});

const OrganizationSchema = new Schema<OrganizationDoc>(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String },
    industry: { type: String },
    notes: { type: String },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);
OrganizationSchema.index({ name: "text" });

const ClientSchema = new Schema<ClientDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String },
    whatsapp: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    jobTitle: { type: String },
    preferredContact: { type: String, enum: ["EMAIL", "PHONE", "WHATSAPP"], default: "EMAIL" },
    tags: [{ type: String }],
    notes: { type: String },
    source: { type: String },
    marketingConsent: { type: Boolean, default: false },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);
ClientSchema.index({ name: "text", email: "text" });

const AttachmentSchema = new Schema<Attachment>({
  filename: { type: String, required: true },
  mime: { type: String, required: true },
  size: { type: Number, required: true },
  storageKey: { type: String, required: true },
  url: { type: String },
});

const InquirySchema = new Schema<InquiryDoc>(
  {
    reference: { type: String, required: true, unique: true },
    type: { type: String, enum: INQUIRY_TYPES, required: true },
    status: { type: String, enum: INQUIRY_STATUSES, default: "NEW", index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    company: { type: String },
    phone: { type: String },
    subject: { type: String },
    serviceCategory: { type: String },
    solutionContext: { type: String },
    projectContext: { type: String },
    goal: { type: String },
    message: { type: String, required: true },
    features: { type: String },
    budgetRange: { type: String },
    timeline: { type: String },
    preferredContact: { type: String, enum: ["EMAIL", "PHONE", "WHATSAPP"], default: "EMAIL" },
    consent: { type: Boolean, required: true },
    attachments: [AttachmentSchema],
    source: { type: String, default: "website" },
    sourcePath: { type: String },
    idempotencyKey: { type: String, index: true, sparse: true },
    ipHash: { type: String },
    userAgent: { type: String },
    spamScore: { type: Number, default: 0 },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    internalNotes: [NoteSchema],
    statusHistory: [StatusEventSchema],
  },
  { timestamps: true },
);
InquirySchema.index({ createdAt: -1 });
InquirySchema.index({ name: "text", email: "text", company: "text", message: "text" });

const LeadActivitySchema = new Schema<LeadActivity>({
  kind: { type: String, enum: ["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP", "STATUS", "ASSIGNMENT", "SYSTEM"], required: true },
  body: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User" },
  authorLabel: { type: String },
  at: { type: Date, default: Date.now },
});

const LeadSchema = new Schema<LeadDoc>(
  {
    title: { type: String, required: true },
    status: { type: String, enum: LEAD_STATUSES, default: "NEW", index: true },
    priority: { type: String, enum: LEAD_PRIORITIES, default: "MEDIUM" },
    source: { type: String, default: "website" },
    serviceCategory: { type: String },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry" },
    bookingIds: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
    proposalIds: [{ type: Schema.Types.ObjectId, ref: "Proposal" }],
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    estimatedValue: { type: Number },
    currency: { type: String, default: "NGN" },
    followUpAt: { type: Date, index: true },
    followUpNote: { type: String },
    lostReason: { type: String },
    activities: [LeadActivitySchema],
    statusHistory: [StatusEventSchema],
    firstResponseAt: { type: Date },
    wonAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ title: "text" });

const BookingEventSchema = new Schema<BookingEvent>(
  {
    kind: { type: String, required: true },
    payloadId: { type: String },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false },
);

const BookingSchema = new Schema<BookingDoc>(
  {
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "REQUESTED", index: true },
    consultationType: { type: String, required: true },
    serviceContext: { type: String },
    provider: { type: String, enum: ["none", "calcom"], default: "none" },
    externalId: { type: String },
    externalUid: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String },
    company: { type: String },
    summary: { type: String },
    preferredWindows: [{ type: String }],
    visitorTimezone: { type: String },
    startsAt: { type: Date },
    endsAt: { type: Date },
    durationMinutes: { type: Number },
    meetingUrl: { type: String },
    rescheduleUrl: { type: String },
    cancelUrl: { type: String },
    consent: { type: Boolean, required: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    events: [BookingEventSchema],
    statusHistory: [StatusEventSchema],
    ipHash: { type: String },
  },
  { timestamps: true },
);
BookingSchema.index({ provider: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: "string" } } });
BookingSchema.index({ startsAt: 1 });
BookingSchema.index({ createdAt: -1 });

const ProposalLineItemSchema = new Schema<ProposalLineItem>(
  {
    label: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, default: 1 },
    unitAmount: { type: Number, default: 0 },
  },
  { _id: false },
);

const ProposalVersionSchema = new Schema<ProposalVersion>(
  {
    version: { type: Number, required: true },
    summary: { type: String },
    scope: { type: String },
    deliverables: [{ type: String }],
    lineItems: [ProposalLineItemSchema],
    currency: { type: String, default: "NGN" },
    taxRatePercent: { type: Number, default: 0 },
    validUntil: { type: Date },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ProposalSchema = new Schema<ProposalDoc>(
  {
    reference: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: { type: String, enum: PROPOSAL_STATUSES, default: "DRAFT", index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    currentVersion: { type: Number, default: 1 },
    versions: [ProposalVersionSchema],
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    sentAt: { type: Date },
    sentTo: { type: String },
    decisionAt: { type: Date },
    decisionNote: { type: String },
    statusHistory: [StatusEventSchema],
  },
  { timestamps: true },
);
ProposalSchema.index({ reference: 1, "versions.version": 1 }, { unique: true });

const MilestoneSchema = new Schema<Milestone>({
  title: { type: String, required: true },
  dueAt: { type: Date },
  status: { type: String, enum: MILESTONE_STATUSES, default: "PENDING" },
  completedAt: { type: Date },
});

const InternalProjectSchema = new Schema<InternalProjectDoc>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: PROJECT_STATUSES_INTERNAL, default: "PLANNED", index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    proposalId: { type: Schema.Types.ObjectId, ref: "Proposal" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    summary: { type: String },
    startDate: { type: Date },
    deadline: { type: Date },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    milestones: [MilestoneSchema],
    notes: [NoteSchema],
    confidential: { type: Boolean, default: true },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const Organization = model<OrganizationDoc>("Organization", OrganizationSchema);
export const Client = model<ClientDoc>("Client", ClientSchema);
export const Inquiry = model<InquiryDoc>("Inquiry", InquirySchema);
export const Lead = model<LeadDoc>("Lead", LeadSchema);
export const Booking = model<BookingDoc>("Booking", BookingSchema);
export const Proposal = model<ProposalDoc>("Proposal", ProposalSchema);
export const InternalProject = model<InternalProjectDoc>("InternalProject", InternalProjectSchema);
