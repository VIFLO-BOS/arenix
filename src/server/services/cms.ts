import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db/connect";
import { ArticleModel, CareerOpeningModel, FaqModel, MediaAsset, PortfolioProjectModel, ServiceModel, SiteSetting, SolutionModel, TechnologyModel, TestimonialModel } from "@/server/db/models/cms";
import { recordAudit } from "./audit";
import { deleteStoredFile } from "./storage";
import { isSafeExternalUrl } from "@/lib/links";
import type { CurrentUser } from "@/server/auth/session";
import type { ProjectMedia, ProjectStatus } from "@/types/content";

/* ------------------------------ Portfolio ---------------------------- */

export async function adminListPortfolio() {
  await connectDb();
  return PortfolioProjectModel.find().sort({ sortOrder: 1 }).lean();
}

export async function adminGetPortfolio(slug: string) {
  await connectDb();
  return PortfolioProjectModel.findOne({ slug }).lean();
}

type PortfolioInput = {
  originalSlug?: string;
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
  challenge?: string;
  goals: string[];
  approach?: string;
  features: string[];
  outcomes: string[];
  engineeringNotes?: string;
  liveUrl?: string;
  repoUrl?: string;
  isLiveUrlPublic?: boolean;
  approvedForPublication?: boolean;
  featured?: boolean;
  published?: boolean;
  sortOrder?: number;
  relatedSlugs: string[];
};

export async function upsertPortfolio(actor: CurrentUser, input: PortfolioInput) {
  await connectDb();
  // Publication rules: a public live URL requires a valid https URL; publishing requires approval.
  const liveUrl = input.liveUrl && isSafeExternalUrl(input.liveUrl) ? input.liveUrl : undefined;
  const isLiveUrlPublic = !!liveUrl && !!input.isLiveUrlPublic;
  const approved = !!input.approvedForPublication;
  const published = !!input.published && approved;
  const existing = await PortfolioProjectModel.findOne({ slug: input.originalSlug || input.slug });
  if (input.originalSlug && input.originalSlug !== input.slug && (await PortfolioProjectModel.exists({ slug: input.slug }))) throw new Error("Another project already uses that slug.");
  if (!existing && (await PortfolioProjectModel.exists({ slug: input.slug }))) throw new Error("A project with that slug already exists.");

  const data = {
    slug: input.slug,
    title: input.title,
    teaser: input.teaser,
    description: input.description,
    clientOrOwner: input.clientOrOwner || undefined,
    publishedRole: input.publishedRole || undefined,
    industry: input.industry || undefined,
    services: input.services,
    technologies: input.technologies,
    status: input.status,
    year: input.year,
    challenge: input.challenge || undefined,
    goals: input.goals,
    approach: input.approach || undefined,
    features: input.features,
    outcomes: input.outcomes,
    engineeringNotes: input.engineeringNotes || undefined,
    liveUrl,
    repoUrl: input.repoUrl && isSafeExternalUrl(input.repoUrl) ? input.repoUrl : undefined,
    isLiveUrlPublic,
    approvedForPublication: approved,
    featured: !!input.featured,
    published,
    sortOrder: input.sortOrder ?? 0,
    relatedSlugs: input.relatedSlugs.filter((s) => s !== input.slug),
    ...(published && !existing?.publishedAt ? { publishedAt: new Date() } : {}),
  };
  const doc = existing ? await PortfolioProjectModel.findByIdAndUpdate(existing._id, { $set: data }, { new: true }) : await PortfolioProjectModel.create({ ...data, gallery: [] });
  await recordAudit({ actor, action: existing ? "portfolio.update" : "portfolio.create", entityType: "PortfolioProject", entityId: input.slug, metadata: { published, isLiveUrlPublic } });
  return doc!;
}

export async function upsertPortfolioMedia(actor: CurrentUser, slug: string, media: Omit<ProjectMedia, "id"> & { id?: string }, setAsCover?: boolean) {
  await connectDb();
  const doc = await PortfolioProjectModel.findOne({ slug });
  if (!doc) throw new Error("Project not found.");
  const id = media.id || `${slug}-${Date.now().toString(36)}`;
  const entry: ProjectMedia = { ...media, id };
  const idx = doc.gallery.findIndex((g) => g.id === id);
  if (idx >= 0) doc.gallery[idx] = entry as never;
  else doc.gallery.push(entry as never);
  doc.gallery.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (setAsCover || (!doc.coverMedia && entry.approvedForPublication)) doc.coverMedia = entry as never;
  else if (doc.coverMedia?.id === id) doc.coverMedia = entry as never;
  await doc.save();
  await recordAudit({ actor, action: "portfolio.media", entityType: "PortfolioProject", entityId: slug, metadata: { mediaId: id, approved: entry.approvedForPublication } });
}

export async function removePortfolioMedia(actor: CurrentUser, slug: string, mediaId: string) {
  await connectDb();
  const doc = await PortfolioProjectModel.findOne({ slug });
  if (!doc) throw new Error("Project not found.");
  doc.gallery = doc.gallery.filter((g) => g.id !== mediaId) as never;
  if (doc.coverMedia?.id === mediaId) doc.coverMedia = (doc.gallery.find((g) => g.approvedForPublication) as never) ?? undefined;
  await doc.save();
  await recordAudit({ actor, action: "portfolio.media_removed", entityType: "PortfolioProject", entityId: slug, metadata: { mediaId } });
}

export async function deletePortfolio(actor: CurrentUser, slug: string) {
  await connectDb();
  await PortfolioProjectModel.deleteOne({ slug });
  await recordAudit({ actor, action: "portfolio.delete", entityType: "PortfolioProject", entityId: slug, severity: "WARN" });
}

/* ------------------------------ Content ------------------------------ */

const contentModels = {
  service: ServiceModel,
  solution: SolutionModel,
  technology: TechnologyModel,
  article: ArticleModel,
  career: CareerOpeningModel,
  testimonial: TestimonialModel,
  faq: FaqModel,
} as const;
export type ContentKind = keyof typeof contentModels;

export async function adminListContent(kind: ContentKind) {
  await connectDb();
  const model = contentModels[kind];
  const sort: Record<string, 1 | -1> = kind === "article" ? { publishedAt: -1, createdAt: -1 } : kind === "faq" || kind === "service" || kind === "solution" ? { sortOrder: 1 } : { createdAt: -1 };
  return (model as typeof ServiceModel).find().sort(sort).lean();
}

export async function adminGetContentBySlug(kind: "service" | "solution" | "technology" | "article" | "career", slug: string) {
  await connectDb();
  return (contentModels[kind] as typeof ServiceModel).findOne({ slug }).lean();
}

export async function adminGetContentById(kind: "testimonial" | "faq", id: string) {
  await connectDb();
  if (!Types.ObjectId.isValid(id)) return null;
  return (contentModels[kind] as typeof FaqModel).findById(id).lean();
}

export async function upsertContentBySlug(actor: CurrentUser, kind: "service" | "solution" | "technology" | "article" | "career", originalSlug: string | undefined, data: Record<string, unknown> & { slug: string }) {
  await connectDb();
  const model = contentModels[kind] as typeof ServiceModel;
  const key = originalSlug || data.slug;
  if (originalSlug && originalSlug !== data.slug && (await model.exists({ slug: data.slug }))) throw new Error("That slug is already in use.");
  const existing = await model.findOne({ slug: key });
  const doc = existing ? await model.findByIdAndUpdate(existing._id, { $set: data }, { new: true }) : await model.create(data);
  await recordAudit({ actor, action: `${kind}.${existing ? "update" : "create"}`, entityType: kind, entityId: data.slug });
  return doc;
}

export async function upsertContentById(actor: CurrentUser, kind: "testimonial" | "faq", id: string | undefined, data: Record<string, unknown>) {
  await connectDb();
  const model = contentModels[kind] as typeof FaqModel;
  const doc = id ? await model.findByIdAndUpdate(id, { $set: data }, { new: true }) : await model.create(data);
  if (!doc) throw new Error("Record not found.");
  await recordAudit({ actor, action: `${kind}.${id ? "update" : "create"}`, entityType: kind, entityId: doc._id.toString() });
  return doc;
}

export async function deleteContent(actor: CurrentUser, kind: ContentKind, idOrSlug: string) {
  await connectDb();
  const model = contentModels[kind] as typeof ServiceModel;
  const filter = Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24 ? { _id: idOrSlug } : { slug: idOrSlug };
  await model.deleteOne(filter);
  await recordAudit({ actor, action: `${kind}.delete`, entityType: kind, entityId: idOrSlug, severity: "WARN" });
}

/* -------------------------------- Media ------------------------------ */

export async function listMediaAssets(page = 1) {
  await connectDb();
  const limit = 40;
  const [items, total] = await Promise.all([MediaAsset.find({ deletedAt: { $exists: false } }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("uploadedBy", "name").lean(), MediaAsset.countDocuments({ deletedAt: { $exists: false } })]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function createMediaAsset(actor: CurrentUser, input: { filename: string; originalName: string; url: string; storageKey: string; mime: string; size: number; width?: number; height?: number; alt: string; isAuthenticScreenshot: boolean; approvedForPublication: boolean }) {
  await connectDb();
  const doc = await MediaAsset.create({ ...input, storageDriver: "local", uploadedBy: actor.id });
  await recordAudit({ actor, action: "media.upload", entityType: "MediaAsset", entityId: doc._id.toString(), metadata: { mime: input.mime, size: input.size } });
  return doc;
}

export async function updateMediaAsset(actor: CurrentUser, id: string, patch: { alt?: string; caption?: string; approvedForPublication?: boolean; isAuthenticScreenshot?: boolean }) {
  await connectDb();
  await MediaAsset.updateOne({ _id: id }, { $set: patch });
  await recordAudit({ actor, action: "media.update", entityType: "MediaAsset", entityId: id, metadata: patch });
}

export async function deleteMediaAsset(actor: CurrentUser, id: string) {
  await connectDb();
  const doc = await MediaAsset.findById(id);
  if (!doc) return;
  const inUse = await PortfolioProjectModel.exists({ $or: [{ "gallery.src": doc.url }, { "coverMedia.src": doc.url }] });
  if (inUse) throw new Error("This file is used by a portfolio project. Remove it from the project first.");
  doc.deletedAt = new Date();
  await doc.save();
  await deleteStoredFile(doc.storageKey);
  await recordAudit({ actor, action: "media.delete", entityType: "MediaAsset", entityId: id, severity: "WARN" });
}

/* ------------------------------ Settings ----------------------------- */

export async function getSettingsDoc() {
  await connectDb();
  const existing = await SiteSetting.findOne({ key: "site" });
  if (existing) return existing;
  return SiteSetting.create({ key: "site" });
}

export async function updateSettingsSection(actor: CurrentUser, section: string, patch: Record<string, unknown>) {
  await connectDb();
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) set[`${section}.${k}`] = v;
  set.updatedBy = actor.id;
  await SiteSetting.updateOne({ key: "site" }, { $set: set }, { upsert: true });
  await recordAudit({ actor, action: "settings.update", entityType: "SiteSetting", entityId: section, metadata: { keys: Object.keys(patch) } });
}
