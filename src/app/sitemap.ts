import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getPublishedArticles, getPublishedProjects, getServices, getSolutions } from "@/server/repositories/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const statics = ["", "/about", "/services", "/work", "/solutions", "/technologies", "/process", "/insights", "/lab", "/careers", "/contact", "/book-consultation", "/start-project", "/privacy", "/terms"];
  const [projects, services, solutions, articles] = await Promise.all([getPublishedProjects(), getServices(), getSolutions(), getPublishedArticles()]);
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: (p === "" ? "weekly" : "monthly") as "weekly" | "monthly", priority: p === "" ? 1 : 0.7 })),
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...solutions.map((s) => ({ url: `${base}/solutions/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${base}/work/${p.slug}`, lastModified: p.publishedAt ? new Date(p.publishedAt) : now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...articles.map((a) => ({ url: `${base}/insights/${a.slug}`, lastModified: a.publishedAt ? new Date(a.publishedAt) : now, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
