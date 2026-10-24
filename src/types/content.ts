/**
 * Shared content types used by fixtures, Mongoose models (as plain shapes) and UI.
 * Keep these JSON-serialisable: server components pass them to client components.
 */

export type ProjectStatus = "LIVE" | "COMPLETED" | "IN_DEVELOPMENT" | "CONCEPT" | "PRIVATE";

export const PROJECT_STATUSES: ProjectStatus[] = ["LIVE", "COMPLETED", "IN_DEVELOPMENT", "CONCEPT", "PRIVATE"];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  LIVE: "Live",
  COMPLETED: "Completed",
  IN_DEVELOPMENT: "In Development",
  CONCEPT: "Concept",
  PRIVATE: "Private System",
};

export type MediaKind = "screenshot" | "video" | "illustration" | "device-mockup";

export type ProjectMedia = {
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
};

export type PortfolioProject = {
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
  coverMedia?: ProjectMedia;
  gallery: ProjectMedia[];
  challenge?: string;
  goals?: string[];
  approach?: string;
  features: string[];
  outcomes?: string[];
  engineeringNotes?: string;
  liveUrl?: string;
  repoUrl?: string;
  isLiveUrlPublic: boolean;
  approvedForPublication: boolean;
  featured: boolean;
  sortOrder: number;
  relatedSlugs: string[];
  published: boolean;
  publishedAt?: string;
};

export type FaqItem = { question: string; answer: string };

export type Service = {
  slug: string;
  index: string;
  title: string;
  shortTitle?: string;
  summary: string;
  description: string;
  problems: string[];
  deliverables: string[];
  workflow: { title: string; detail: string }[];
  technicalApproach: string;
  heroStyle: "grid" | "stack" | "frame" | "orbit" | "split" | "ledger" | "flow" | "cloud";
  faqs: FaqItem[];
  relatedProjectSlugs: string[];
  published: boolean;
  sortOrder: number;
};

export type Solution = {
  slug: string;
  sector: string;
  title: string;
  summary: string;
  description: string;
  needs: string[];
  useCases: { title: string; detail: string }[];
  workflow: string[];
  architectureNotes: string;
  proofProjectSlugs: string[];
  capabilityStatus: "delivered" | "proposed" | "mixed";
  published: boolean;
  sortOrder: number;
};

export type TechnologyCategory =
  | "Frontend"
  | "Backend"
  | "Databases"
  | "Mobile"
  | "Cloud and Deployment"
  | "Architecture and Integration"
  | "Design and Motion";

export type Technology = {
  name: string;
  slug: string;
  category: TechnologyCategory;
  description: string;
  projectSlugs: string[];
  published: boolean;
};

export type ProcessStep = {
  index: string;
  title: string;
  summary: string;
  deliverables: string[];
  expectation: string;
};

export type Article = {
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
  publishedAt?: string;
};

export type CareerOpening = {
  slug: string;
  title: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  summary: string;
  description: string;
  requirements: string[];
  published: boolean;
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  approved: boolean;
  published: boolean;
};

export type Faq = FaqItem & { id: string; scope: string; sortOrder: number; published: boolean };

export type IndustryCard = {
  key: string;
  label: string;
  summary: string;
  useCases: string[];
  deliveredProjectSlugs: string[];
};

export type ConsultationType = {
  key: string;
  label: string;
  durationMinutes: number;
  description: string;
};

export const CONSULTATION_TYPES: ConsultationType[] = [
  { key: "discovery", label: "Discovery call", durationMinutes: 30, description: "A first conversation about your goals, constraints and whether areniX is the right partner." },
  { key: "website", label: "Website development", durationMinutes: 30, description: "Corporate websites, landing pages, content platforms and performance improvements." },
  { key: "custom-software", label: "Custom software", durationMinutes: 45, description: "Web applications, internal tools and bespoke platforms." },
  { key: "enterprise", label: "Enterprise and business systems", durationMinutes: 45, description: "Operations, workforce, inventory and reporting systems." },
  { key: "mobile", label: "Mobile application", durationMinutes: 30, description: "React Native and companion mobile experiences for existing products." },
  { key: "consulting", label: "Technical consulting", durationMinutes: 45, description: "Architecture reviews, audits, migrations and delivery planning." },
];
