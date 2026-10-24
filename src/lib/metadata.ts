import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export function pageMetadata(input: { title: string; description: string; path: string; image?: string; noIndex?: boolean; type?: "website" | "article" }): Metadata {
  const url = `${siteConfig.url}${input.path}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: input.type ?? "website",
      images: input.image ? [{ url: input.image }] : undefined,
    },
    twitter: { card: "summary_large_image", title: input.title, description: input.description, images: input.image ? [input.image] : undefined },
  };
}

export function organizationJsonLd(input: { email?: string; phone?: string; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.legalName,
    alternateName: siteConfig.brand,
    url: siteConfig.url,
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.sameAs && input.sameAs.length ? { sameAs: input.sameAs } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${siteConfig.url}${it.path}` })),
  };
}
