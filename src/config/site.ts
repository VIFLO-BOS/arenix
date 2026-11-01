/**
 * Static site configuration. Values that depend on owner-supplied facts are read from
 * environment variables and are intentionally EMPTY by default so nothing is invented.
 */
export const siteConfig = {
  legalName: "areniX Technologies Limited",
  brand: "areniX",
  tagline: "We build technology that moves ideas forward.",
  description:
    "areniX designs and engineers digital products that help businesses work smarter, serve customers better, and scale with confidence.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  teamTimezone: "Africa/Lagos",
  contact: {
    // Only published when configured; the UI hides channels that are empty.
    whatsappDigits: (
      process.env.NEXT_PUBLIC_WHATSAPP_E164_DIGITS ?? ""
    ).replace(/\D/g, ""),
    email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "",
    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "",
  },
  analyticsDomain: process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN ?? "",
} as const;

export type SiteConfig = typeof siteConfig;
