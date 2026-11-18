import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy for the public site. Scripts, styles, images, fonts and data may
 * only come from this site, nothing may embed the site in a frame, forms may only post here,
 * and plugins are off. Inline scripts stay allowed because public pages are prebuilt for
 * speed and a per request nonce would force every page to render on each visit. The admin
 * dashboard gets a stricter nonce based policy from src/proxy.ts instead.
 */
const publicCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  // Only the optional Cal.com booking embed is framed.
  "frame-src 'self' https://cal.com https://app.cal.com",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // Browsers only ever use HTTPS for this site and its subdomains, for two years.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // AGENTS.md is maintained by hand, so next dev must not rewrite it.
  agentRules: false,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [250, 320, 390, 430, 640, 768, 1024, 1280, 1440, 1920],
    remotePatterns: [],
  },
  serverExternalPackages: ["mongoose"],
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The admin dashboard gets its own stricter policy from the proxy.
      { source: "/((?!admin).*)", headers: [{ key: "Content-Security-Policy", value: publicCsp }] },
    ];
  },
};

export default nextConfig;
