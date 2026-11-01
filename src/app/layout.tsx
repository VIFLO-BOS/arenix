import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteConfig } from "@/config/site";
import "./globals.css";

/**
 * Brand type. Montserrat for headings and interface text, Roboto for body copy. The variable
 * font files live in ./fonts (SIL Open Font License), so builds never download fonts from
 * Google. next/font still generates size adjusted fallbacks, so there is no layout shift.
 */
const montserrat = localFont({ src: "./fonts/montserrat-latin-wght.woff2", variable: "--font-montserrat", weight: "500 800", display: "swap" });
const roboto = localFont({ src: "./fonts/roboto-latin-wght.woff2", variable: "--font-roboto", weight: "400 700", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "areniX | Software, Websites and Business Systems", template: "%s | areniX" },
  description: siteConfig.description,
  applicationName: "areniX",
  openGraph: { type: "website", siteName: "areniX", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06132A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-ink focus:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
