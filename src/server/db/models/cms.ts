import mongoose, { Schema, Types, type Model } from "mongoose";
import {
  PROJECT_STATUSES,
  type MediaKind,
  type ProjectStatus,
} from "@/types/content";

/* ------------------------------ Interfaces ----------------------------- */

export interface ProjectMediaSub {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  kind: MediaKind;
  pageLabel?: string;
  device?: "desktop" | "mobile";
  isAuthenticScreenshot: boolean;
  approvedForPublication: boolean;
  width?: number;
  height?: number;
  sortOrder: number;
}

export interface PortfolioProjectDoc {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  teaser: string;
  description: string;
  clientOrOwner?: string;
  publishedRole?: string;
  industry?: string;
  services: string[];
  technologies: string[];
  status: ProjectStatus;
  year?: number;
  coverMedia?: ProjectMediaSub;
  gallery: ProjectMediaSub[];
  challenge?: string;
  goals: string[];
  approach?: string;
  features: string[];
  outcomes: string[];
  engineeringNotes?: string;
  liveUrl?: string;
  repoUrl?: string;
  isLiveUrlPublic: boolean;
  approvedForPublication: boolean;
  featured: boolean;
  sortOrder: number;
  relatedSlugs: string[];
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FaqItemSub {
  question: string;
  answer: string;
}

export interface ServiceDoc {
  _id: Types.ObjectId;
  slug: string;
  index: string;
  title: string;
  shortTitle?: string;
  summary: string;
  description: string;
  problems: string[];
  deliverables: string[];
  workflow: { title: string; detail: string }[];
  technicalApproach?: string;
  heroStyle: string;
  faqs: FaqItemSub[];
  relatedProjectSlugs: string[];
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolutionDoc {
  _id: Types.ObjectId;
  slug: string;
  sector: string;
  title: string;
  summary: string;
  description: string;
  needs: string[];
  useCases: { title: string; detail: string }[];
  workflow: string[];
  architectureNotes?: string;
  proofProjectSlugs: string[];
  capabilityStatus: "delivered" | "proposed" | "mixed";
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnologyDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  category: string;
  description?: string;
  projectSlugs: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleDoc {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  coverSrc?: string;
  coverAlt?: string;
  readingTime: number;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareerOpeningDoc {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  summary: string;
  description: string;
  requirements: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestimonialDoc {
  _id: Types.ObjectId;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  approved: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FaqDoc {
  _id: Types.ObjectId;
  question: string;
  answer: string;
  scope: string;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAssetDoc {
  _id: Types.ObjectId;
  filename: string;
  originalName?: string;
  url: string;
  storageDriver: "local" | "s3";
  storageKey: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  alt: string;
  caption?: string;
  isAuthenticScreenshot: boolean;
  approvedForPublication: boolean;
  uploadedBy?: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteSettingDoc {
  _id: Types.ObjectId;
  key: string;
  brand: {
    legalName: string;
    shortName: string;
    tagline: string;
    description: string;
    logoUrl: string;
    accentColor: string;
  };
  contact: {
    email: string;
    phone: string;
    whatsappDigits: string;
    addressLine: string;
    city: string;
    country: string;
    showLocation: boolean;
  };
  socials: {
    linkedin: string;
    github: string;
    x: string;
    instagram: string;
    youtube: string;
  };
  booking: {
    mode: "request" | "calcom";
    publicEventLink: string;
    operatingHoursNote: string;
  };
  notifications: { inquiryEmails: string[]; bookingEmails: string[] };
  seo: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    ogImageUrl: string;
    indexable: boolean;
  };
  home: {
    heroHeadline: string;
    heroSupport: string;
    showreelVideoUrl: string;
    showreelPosterUrl: string;
    featuredProjectSlugs: string[];
    showcaseProjectSlugs: string[];
  };
  legal: {
    privacyMarkdown: string;
    termsMarkdown: string;
    privacyReviewed: boolean;
    termsReviewed: boolean;
  };
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------- Schemas -------------------------------- */

const ProjectMediaSchema = new Schema<ProjectMediaSub>(
  {
    id: { type: String, required: true },
    src: { type: String, required: true },
    alt: { type: String, required: true },
    caption: { type: String },
    kind: {
      type: String,
      enum: ["screenshot", "video", "illustration", "device-mockup"],
      default: "screenshot",
    },
    pageLabel: { type: String },
    device: { type: String, enum: ["desktop", "mobile"] },
    isAuthenticScreenshot: { type: Boolean, default: false },
    approvedForPublication: { type: Boolean, default: false },
    width: { type: Number },
    height: { type: Number },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const PortfolioProjectSchema = new Schema<PortfolioProjectDoc>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: true },
    teaser: { type: String, required: true },
    description: { type: String, required: true },
    clientOrOwner: { type: String },
    publishedRole: { type: String },
    industry: { type: String },
    services: [{ type: String }],
    technologies: [{ type: String }],
    status: { type: String, enum: PROJECT_STATUSES, required: true },
    year: { type: Number },
    coverMedia: { type: ProjectMediaSchema },
    gallery: [ProjectMediaSchema],
    challenge: { type: String },
    goals: [{ type: String }],
    approach: { type: String },
    features: [{ type: String }],
    outcomes: [{ type: String }],
    engineeringNotes: { type: String },
    liveUrl: { type: String },
    repoUrl: { type: String },
    isLiveUrlPublic: { type: Boolean, default: false },
    approvedForPublication: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    relatedSlugs: [{ type: String }],
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);
PortfolioProjectSchema.index({
  title: "text",
  teaser: "text",
  industry: "text",
});

const FaqItemSchema = new Schema<FaqItemSub>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);
const TitleDetailSchema = new Schema<{ title: string; detail: string }>(
  { title: { type: String }, detail: { type: String } },
  { _id: false },
);

const ServiceSchema = new Schema<ServiceDoc>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    index: { type: String, required: true },
    title: { type: String, required: true },
    shortTitle: { type: String },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    problems: [{ type: String }],
    deliverables: [{ type: String }],
    workflow: [TitleDetailSchema],
    technicalApproach: { type: String },
    heroStyle: { type: String, default: "grid" },
    faqs: [FaqItemSchema],
    relatedProjectSlugs: [{ type: String }],
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const SolutionSchema = new Schema<SolutionDoc>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    sector: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    needs: [{ type: String }],
    useCases: [TitleDetailSchema],
    workflow: [{ type: String }],
    architectureNotes: { type: String },
    proofProjectSlugs: [{ type: String }],
    capabilityStatus: {
      type: String,
      enum: ["delivered", "proposed", "mixed"],
      default: "proposed",
    },
    published: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const TechnologySchema = new Schema<TechnologyDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    description: { type: String },
    projectSlugs: [{ type: String }],
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ArticleSchema = new Schema<ArticleDoc>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, default: "Engineering" },
    tags: [{ type: String }],
    coverSrc: { type: String },
    coverAlt: { type: String },
    readingTime: { type: Number, default: 1 },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);
ArticleSchema.index({ title: "text", excerpt: "text", content: "text" });

const CareerOpeningSchema = new Schema<CareerOpeningDoc>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    location: { type: String, default: "Remote" },
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const TestimonialSchema = new Schema<TestimonialDoc>(
  {
    quote: { type: String, required: true },
    author: { type: String, required: true },
    role: { type: String },
    company: { type: String },
    approved: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const FaqSchema = new Schema<FaqDoc>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    scope: { type: String, default: "general", index: true },
    sortOrder: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const MediaAssetSchema = new Schema<MediaAssetDoc>(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    url: { type: String, required: true },
    storageDriver: { type: String, enum: ["local", "s3"], default: "local" },
    storageKey: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    alt: { type: String, default: "" },
    caption: { type: String },
    isAuthenticScreenshot: { type: Boolean, default: false },
    approvedForPublication: { type: Boolean, default: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

const SiteSettingSchema = new Schema<SiteSettingDoc>(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    brand: {
      legalName: { type: String, default: "areniX Technologies Limited" },
      shortName: { type: String, default: "areniX" },
      tagline: {
        type: String,
        default: "We build technology that moves ideas forward.",
      },
      description: { type: String, default: "" },
      logoUrl: { type: String, default: "" },
      accentColor: { type: String, default: "" },
    },
    contact: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      whatsappDigits: { type: String, default: "" },
      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      showLocation: { type: Boolean, default: false },
    },
    socials: {
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      x: { type: String, default: "" },
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    booking: {
      mode: { type: String, enum: ["request", "calcom"], default: "request" },
      publicEventLink: { type: String, default: "" },
      operatingHoursNote: {
        type: String,
        default: "Monday to Friday, 9am to 5pm Lagos time",
      },
    },
    notifications: {
      inquiryEmails: [{ type: String }],
      bookingEmails: [{ type: String }],
    },
    seo: {
      defaultTitle: {
        type: String,
        default: "areniX | Software, Websites and Business Systems",
      },
      titleTemplate: { type: String, default: "%s | areniX" },
      defaultDescription: { type: String, default: "" },
      ogImageUrl: { type: String, default: "" },
      indexable: { type: Boolean, default: true },
    },
    home: {
      heroHeadline: {
        type: String,
        default: "We build technology that moves ideas forward.",
      },
      heroSupport: { type: String, default: "" },
      showreelVideoUrl: { type: String, default: "" },
      showreelPosterUrl: { type: String, default: "" },
      featuredProjectSlugs: [{ type: String }],
      showcaseProjectSlugs: [{ type: String }],
    },
    legal: {
      privacyMarkdown: { type: String, default: "" },
      termsMarkdown: { type: String, default: "" },
      privacyReviewed: { type: Boolean, default: false },
      termsReviewed: { type: Boolean, default: false },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, minimize: false },
);

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

export const PortfolioProjectModel = model<PortfolioProjectDoc>(
  "PortfolioProject",
  PortfolioProjectSchema,
);
export const ServiceModel = model<ServiceDoc>("Service", ServiceSchema);
export const SolutionModel = model<SolutionDoc>("Solution", SolutionSchema);
export const TechnologyModel = model<TechnologyDoc>(
  "Technology",
  TechnologySchema,
);
export const ArticleModel = model<ArticleDoc>("Article", ArticleSchema);
export const CareerOpeningModel = model<CareerOpeningDoc>(
  "CareerOpening",
  CareerOpeningSchema,
);
export const TestimonialModel = model<TestimonialDoc>(
  "Testimonial",
  TestimonialSchema,
);
export const FaqModel = model<FaqDoc>("Faq", FaqSchema);
export const MediaAsset = model<MediaAssetDoc>("MediaAsset", MediaAssetSchema);
export const SiteSetting = model<SiteSettingDoc>(
  "SiteSetting",
  SiteSettingSchema,
);
