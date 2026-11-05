import "server-only";
import { cache } from "react";
import { connectDb } from "@/server/db/connect";
import {
  ArticleModel,
  CareerOpeningModel,
  FaqModel,
  PortfolioProjectModel,
  ServiceModel,
  SiteSetting,
  SolutionModel,
  TechnologyModel,
  TestimonialModel,
} from "@/server/db/models/cms";
import { servicesFixture } from "@/content/services";
import { solutionsFixture } from "@/content/solutions";
import { technologiesFixture } from "@/content/technologies";
import { projectsFixture } from "@/content/projects";
import {
  articlesFixture,
  careersFixture,
  faqsFixture,
  legalFixture,
  testimonialsFixture,
} from "@/content/misc";
import type {
  Article,
  CareerOpening,
  Faq,
  PortfolioProject,
  Service,
  Solution,
  Technology,
  Testimonial,
} from "@/types/content";
import { toPlain } from "@/lib/utils";

/**
 * Public content repository. Reads MongoDB first; if the database is unreachable or a
 * collection is empty (not seeded yet), falls back to the typed fixtures so the marketing
 * site never renders empty because of infrastructure. The source is reported so admin can
 * show "content source: database | fixture".
 */
export type ContentSource = "database" | "fixture";

async function withFallback<T>(
  read: () => Promise<T[]>,
  fixture: T[],
): Promise<{ items: T[]; source: ContentSource }> {
  try {
    await connectDb();
    const items = await read();
    if (items.length > 0) return { items: toPlain(items), source: "database" };
    return { items: fixture, source: "fixture" };
  } catch (err) {
    if (process.env.NODE_ENV !== "test")
      console.warn(
        "[content] database unavailable, using fixtures:",
        err instanceof Error ? err.message : err,
      );
    return { items: fixture, source: "fixture" };
  }
}

type Lean<T> = Omit<T, "_id" | "__v" | "createdAt" | "updatedAt">;

function strip<
  T extends {
    _id?: unknown;
    __v?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  },
>(doc: T): Lean<T> {
  const { _id, __v, createdAt, updatedAt, ...rest } = doc as T & {
    _id?: unknown;
    __v?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  void _id;
  void __v;
  void createdAt;
  void updatedAt;
  return rest;
}

export const getPublishedProjects = cache(
  async (): Promise<PortfolioProject[]> => {
    const { items } = await withFallback<PortfolioProject>(
      async () => {
        const docs = await PortfolioProjectModel.find({
          published: true,
          approvedForPublication: true,
        })
          .sort({ sortOrder: 1 })
          .lean();
        return docs.map((d) => ({
          ...(strip(d) as unknown as PortfolioProject),
          publishedAt: d.publishedAt
            ? new Date(d.publishedAt).toISOString()
            : undefined,
        }));
      },
      projectsFixture
        .filter((p) => p.published && p.approvedForPublication)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
    return items;
  },
);

export async function getProjectBySlug(
  slug: string,
): Promise<PortfolioProject | null> {
  const all = await getPublishedProjects();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getFeaturedProjects(limit = 8) {
  const all = await getPublishedProjects();
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}

export const getServices = cache(async (): Promise<Service[]> => {
  const { items } = await withFallback<Service>(
    async () =>
      (
        await ServiceModel.find({ published: true })
          .sort({ sortOrder: 1 })
          .lean()
      ).map((d) => strip(d) as unknown as Service),
    servicesFixture.filter((s) => s.published),
  );
  return items;
});

export async function getServiceBySlug(slug: string) {
  return (await getServices()).find((s) => s.slug === slug) ?? null;
}

export const getSolutions = cache(async (): Promise<Solution[]> => {
  const { items } = await withFallback<Solution>(
    async () =>
      (
        await SolutionModel.find({ published: true })
          .sort({ sortOrder: 1 })
          .lean()
      ).map((d) => strip(d) as unknown as Solution),
    solutionsFixture.filter((s) => s.published),
  );
  return items;
});

export async function getSolutionBySlug(slug: string) {
  return (await getSolutions()).find((s) => s.slug === slug) ?? null;
}

export const getTechnologies = cache(async (): Promise<Technology[]> => {
  const { items } = await withFallback<Technology>(
    async () =>
      (await TechnologyModel.find({ published: true }).lean()).map(
        (d) => strip(d) as unknown as Technology,
      ),
    technologiesFixture.filter((t) => t.published),
  );
  return items;
});

export const getPublishedArticles = cache(async (): Promise<Article[]> => {
  const { items } = await withFallback<Article>(
    async () =>
      (
        await ArticleModel.find({ published: true })
          .sort({ publishedAt: -1 })
          .lean()
      ).map((d) => ({
        ...(strip(d) as unknown as Article),
        publishedAt: d.publishedAt
          ? new Date(d.publishedAt).toISOString()
          : undefined,
      })),
    articlesFixture.filter((a) => a.published),
  );
  return items;
});

export async function getArticleBySlug(slug: string) {
  return (await getPublishedArticles()).find((a) => a.slug === slug) ?? null;
}

export const getCareers = cache(async (): Promise<CareerOpening[]> => {
  try {
    await connectDb();
    const docs = await CareerOpeningModel.find({ published: true }).lean();
    return docs.map((d) => strip(d) as unknown as CareerOpening);
  } catch {
    return careersFixture.filter((c) => c.published);
  }
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  try {
    await connectDb();
    const docs = await TestimonialModel.find({
      published: true,
      approved: true,
    }).lean();
    return docs.map((d) => ({
      ...(strip(d) as unknown as Testimonial),
      id: d._id.toString(),
    }));
  } catch {
    return testimonialsFixture.filter((t) => t.published && t.approved);
  }
});

export const getFaqs = cache(async (scope?: string): Promise<Faq[]> => {
  const { items } = await withFallback<Faq>(
    async () =>
      (
        await FaqModel.find({ published: true }).sort({ sortOrder: 1 }).lean()
      ).map((d) => ({ ...(strip(d) as unknown as Faq), id: d._id.toString() })),
    faqsFixture.filter((f) => f.published),
  );
  return scope
    ? items.filter((f) => f.scope === scope || f.scope === "general")
    : items;
});

export type PublicSettings = {
  brand: {
    legalName: string;
    shortName: string;
    tagline: string;
    description: string;
    logoUrl: string;
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
  source: ContentSource;
};

const defaultSettings: PublicSettings = {
  brand: {
    legalName: "areniX Technologies Limited",
    shortName: "areniX",
    tagline: "We build technology that moves ideas forward.",
    description:
      "areniX designs and engineers digital products that help businesses work smarter, serve customers better, and scale with confidence.",
    logoUrl: "",
  },
  contact: {
    email: "",
    phone: "",
    whatsappDigits: "",
    addressLine: "",
    city: "",
    country: "",
    showLocation: false,
  },
  socials: { linkedin: "", github: "", x: "", instagram: "", youtube: "" },
  booking: {
    mode: "request",
    publicEventLink: "",
    operatingHoursNote: "Monday to Friday, 9am to 5pm Lagos time",
  },
  seo: {
    defaultTitle: "areniX | Software, Websites and Business Systems",
    titleTemplate: "%s | areniX",
    defaultDescription:
      "areniX designs and engineers digital products that help businesses work smarter, serve customers better, and scale with confidence.",
    ogImageUrl: "",
    indexable: true,
  },
  home: {
    heroHeadline: "We build technology that moves ideas forward.",
    heroSupport: "",
    showreelVideoUrl: "",
    showreelPosterUrl: "",
    featuredProjectSlugs: [],
    showcaseProjectSlugs: [],
  },
  legal: {
    privacyMarkdown: legalFixture.privacyMarkdown,
    termsMarkdown: legalFixture.termsMarkdown,
    privacyReviewed: false,
    termsReviewed: false,
  },
  source: "fixture",
};

/** Site settings merged with environment fallbacks (env wins when the DB value is empty). */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  let merged: PublicSettings = { ...defaultSettings };
  try {
    await connectDb();
    const doc = await SiteSetting.findOne({ key: "site" }).lean();
    if (doc) {
      // Empty strings in the DB mean "not set", so drop them so defaults/env fallbacks apply.
      const stripEmpty = <T>(section: T): T => {
        if (!section || typeof section !== "object") return section;
        return Object.fromEntries(
          Object.entries(section as Record<string, unknown>).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined,
          ),
        ) as T;
      };
      const raw = toPlain(doc) as unknown as Record<string, unknown>;
      const d = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, stripEmpty(v)]),
      ) as unknown as Partial<PublicSettings>;
      merged = {
        brand: { ...defaultSettings.brand, ...(d.brand ?? {}) },
        contact: { ...defaultSettings.contact, ...(d.contact ?? {}) },
        socials: { ...defaultSettings.socials, ...(d.socials ?? {}) },
        booking: { ...defaultSettings.booking, ...(d.booking ?? {}) },
        seo: { ...defaultSettings.seo, ...(d.seo ?? {}) },
        home: { ...defaultSettings.home, ...(d.home ?? {}) },
        legal: {
          ...defaultSettings.legal,
          ...(d.legal ?? {}),
          privacyMarkdown:
            d.legal?.privacyMarkdown || defaultSettings.legal.privacyMarkdown,
          termsMarkdown:
            d.legal?.termsMarkdown || defaultSettings.legal.termsMarkdown,
        },
        source: "database",
      };
    }
  } catch {
    /* fixtures */
  }
  // Environment-provided contact details fill empty DB fields.
  merged.contact.whatsappDigits = (
    merged.contact.whatsappDigits ||
    process.env.NEXT_PUBLIC_WHATSAPP_E164_DIGITS ||
    ""
  ).replace(/\D/g, "");
  merged.contact.email =
    merged.contact.email || process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "";
  merged.contact.phone =
    merged.contact.phone || process.env.NEXT_PUBLIC_BUSINESS_PHONE || "";
  if (
    process.env.SCHEDULER_PROVIDER === "calcom" &&
    process.env.SCHEDULER_PUBLIC_EVENT_LINK
  ) {
    merged.booking = {
      ...merged.booking,
      mode: "calcom",
      publicEventLink:
        merged.booking.publicEventLink ||
        process.env.SCHEDULER_PUBLIC_EVENT_LINK,
    };
  }
  return merged;
});
