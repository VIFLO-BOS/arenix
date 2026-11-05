/**
 * Captures authentic screenshots of PUBLIC portfolio sites with Playwright and writes WebP
 * files to public/screenshots/<slug>/. Only pages listed here are captured, never login,
 * dashboard, account or tracking routes. Review every image before publishing.
 *
 *   npm run screenshots
 *   npm run screenshots -- --only clenest
 *   npm run screenshots -- --only shopme,leadforge
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";

type Target = {
  slug: string;
  base: string;
  /**
   * `allowSignInScreen` permits exactly one public sign in page (no credentials are entered and
   * nothing behind it is visited). Every other blocked path stays blocked.
   */
  shots: { file: string; path: string; device: "desktop" | "mobile"; scrollToText?: string; fullPage?: boolean; allowSignInScreen?: boolean }[];
};

const TARGETS: Target[] = [
  {
    slug: "passion-nutrition-clinic",
    base: "https://passion-nutrition-clinic.vercel.app",
    shots: [
      { file: "home-desktop", path: "/", device: "desktop" },
      { file: "services-desktop", path: "/", device: "desktop", scrollToText: "Services" },
      { file: "appointment-desktop", path: "/appointment", device: "desktop" },
      { file: "home-mobile", path: "/", device: "mobile" },
    ],
  },
  {
    slug: "clenest",
    base: "https://www.clenest.site",
    shots: [
      { file: "home-desktop", path: "/", device: "desktop" },
      { file: "services-desktop", path: "/services", device: "desktop" },
      { file: "pricing-desktop", path: "/pricing", device: "desktop" },
      { file: "home-mobile", path: "/", device: "mobile" },
    ],
  },
  {
    slug: "shopme",
    base: "https://web-cyan-chi-9m3i15jvqi.vercel.app",
    shots: [
      { file: "home-desktop", path: "/", device: "desktop" },
      { file: "marketplace-desktop", path: "/marketplace", device: "desktop" },
      { file: "wholesale-desktop", path: "/wholesale", device: "desktop" },
      { file: "home-mobile", path: "/", device: "mobile" },
    ],
  },
  {
    slug: "leadforge",
    base: "https://leadforge-ashy.vercel.app",
    shots: [
      { file: "home-desktop", path: "/", device: "desktop" },
      { file: "product-desktop", path: "/product", device: "desktop" },
      { file: "about-desktop", path: "/about", device: "desktop" },
      { file: "home-mobile", path: "/", device: "mobile" },
    ],
  },
  {
    slug: "khreeolife",
    base: "https://khreoolife.vercel.app",
    shots: [
      { file: "home-desktop", path: "/", device: "desktop" },
      { file: "projects-desktop", path: "/projects", device: "desktop" },
      { file: "events-desktop", path: "/events", device: "desktop" },
      { file: "home-mobile", path: "/", device: "mobile" },
    ],
  },
  {
    slug: "giles-financial-consulting",
    base: "https://gilesfc-preview.vercel.app",
    shots: [
      { file: "home-desktop", path: "/", device: "desktop" },
      { file: "services-desktop", path: "/services/", device: "desktop" },
      { file: "about-desktop", path: "/about-us/", device: "desktop" },
      { file: "home-mobile", path: "/", device: "mobile" },
    ],
  },
  {
    // The ArenoX homepage is deliberately not captured. Course, pricing and programs pages
    // represent the product instead.
    slug: "arenox-lms",
    base: "https://areno-x-pmlx.vercel.app",
    shots: [
      { file: "courses-desktop", path: "/courses", device: "desktop" },
      { file: "pricing-desktop", path: "/pricing", device: "desktop" },
      { file: "program-desktop", path: "/program", device: "desktop" },
      { file: "courses-mobile", path: "/courses", device: "mobile" },
    ],
  },
  {
    // Paylio is a private system. Only its public sign in screen is captured.
    slug: "paylio-staff-management",
    base: "https://data-base-frontend-psi.vercel.app",
    shots: [{ file: "signin-desktop", path: "/login", device: "desktop", allowSignInScreen: true }],
  },
  {
    // Annotrix holds candidate results. Only its public sign in screen is captured.
    slug: "annotrix",
    base: "https://annotrix.vercel.app",
    shots: [{ file: "signin-desktop", path: "/login", device: "desktop", allowSignInScreen: true }],
  },
];

const BLOCKED = /\/(login|signin|sign-in|dashboard|admin|account|track|api)\b/i;
const SIGN_IN_SCREEN = /^\/(login|signin|sign-in)\/?$/i;

/** A path is blocked unless the shot explicitly allows a bare public sign in screen. */
function isBlocked(pathname: string, allowSignInScreen?: boolean) {
  if (allowSignInScreen && SIGN_IN_SCREEN.test(pathname)) return false;
  return BLOCKED.test(pathname);
}
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    console.warn("Bundled Chromium unavailable, trying Microsoft Edge / Chrome channel…", err instanceof Error ? err.message.split("\n")[0] : err);
    try {
      return await chromium.launch({ headless: true, channel: "msedge" });
    } catch {
      return await chromium.launch({ headless: true, channel: "chrome" });
    }
  }
}

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  // Dismiss obvious cookie banners by common button text (best effort, never clicks links).
  for (const text of ["Accept", "Accept all", "Got it", "OK"]) {
    const btn = page.getByRole("button", { name: new RegExp(`^${text}$`, "i") }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => undefined);
      break;
    }
  }
  await page.waitForTimeout(800);
}

async function main() {
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1]?.split(",").map((s) => s.trim()) : undefined;
  const browser = await launch();
  const results: string[] = [];
  try {
    for (const target of TARGETS.filter((t) => !only || only.includes(t.slug))) {
      const dir = path.join(process.cwd(), "public", "screenshots", target.slug);
      await mkdir(dir, { recursive: true });
      for (const shot of target.shots) {
        if (isBlocked(shot.path, shot.allowSignInScreen)) {
          console.warn(`Skipping blocked path ${shot.path}`);
          continue;
        }
        const context = await browser.newContext({ viewport: VIEWPORTS[shot.device], deviceScaleFactor: shot.device === "mobile" ? 2 : 1, isMobile: shot.device === "mobile", hasTouch: shot.device === "mobile", userAgent: shot.device === "mobile" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" : undefined, reducedMotion: "reduce" });
        const page = await context.newPage();
        const url = `${target.base}${shot.path}`;
        try {
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
          if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
          if (isBlocked(new URL(page.url()).pathname, shot.allowSignInScreen)) throw new Error(`Redirected to blocked path ${page.url()}`);
          await settle(page);
          if (shot.scrollToText) {
            const heading = page.getByRole("heading", { name: new RegExp(shot.scrollToText, "i") }).first();
            const section = page.locator(`section:has-text("${shot.scrollToText}")`).first();
            if (await heading.count()) {
              await heading.scrollIntoViewIfNeeded();
              await page.evaluate(() => window.scrollBy(0, -80));
            } else if (await section.count()) {
              await section.scrollIntoViewIfNeeded();
              await page.evaluate(() => window.scrollBy(0, -80));
            } else {
              // Fallback: move past the hero so the capture differs from the homepage shot.
              await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 1.05)));
            }
            await page.waitForTimeout(900);
          }
          const png = await page.screenshot({ type: "png", fullPage: !!shot.fullPage });
          const out = path.join(dir, `${shot.file}.webp`);
          await writeFile(out, await sharp(png).webp({ quality: 82 }).toBuffer());
          results.push(`${target.slug}/${shot.file}.webp ← ${url} (${shot.device})`);
          console.log(`✓ ${target.slug}/${shot.file}.webp`);
        } catch (err) {
          console.error(`✗ ${target.slug}/${shot.file}: ${err instanceof Error ? err.message : err}`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  const manifest = `# Screenshot capture log\n\nCaptured ${new Date().toISOString()} with Playwright (reduced motion, cookie banners dismissed).\nBlocked paths: login, dashboard, admin, account, track, api. A bare public sign in screen is captured only where a shot sets allowSignInScreen.\n\n${results.map((r) => `- ${r}`).join("\n")}\n`;
  await mkdir(path.join(process.cwd(), "docs"), { recursive: true });
  await writeFile(path.join(process.cwd(), "docs", "screenshot-log.md"), manifest);
  console.log(`\n${results.length} screenshots written. Log: docs/screenshot-log.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
