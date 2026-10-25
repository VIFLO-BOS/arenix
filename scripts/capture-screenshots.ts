/**
 * Captures authentic screenshots of PUBLIC portfolio sites with Playwright and writes WebP
 * files to public/screenshots/<slug>/. Only pages listed here are captured, never login,
 * dashboard, account or tracking routes. Review every image before publishing.
 *
 *   npm run screenshots
 *   npm run screenshots -- --only clenest
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";

type Target = {
  slug: string;
  base: string;
  shots: { file: string; path: string; device: "desktop" | "mobile"; scrollToText?: string; fullPage?: boolean }[];
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
];

const BLOCKED = /\/(login|signin|sign-in|dashboard|admin|account|track|api)\b/i;
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
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : undefined;
  const browser = await launch();
  const results: string[] = [];
  try {
    for (const target of TARGETS.filter((t) => !only || t.slug === only)) {
      const dir = path.join(process.cwd(), "public", "screenshots", target.slug);
      await mkdir(dir, { recursive: true });
      for (const shot of target.shots) {
        if (BLOCKED.test(shot.path)) {
          console.warn(`Skipping blocked path ${shot.path}`);
          continue;
        }
        const context = await browser.newContext({ viewport: VIEWPORTS[shot.device], deviceScaleFactor: shot.device === "mobile" ? 2 : 1, isMobile: shot.device === "mobile", hasTouch: shot.device === "mobile", userAgent: shot.device === "mobile" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" : undefined, reducedMotion: "reduce" });
        const page = await context.newPage();
        const url = `${target.base}${shot.path}`;
        try {
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
          if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
          if (BLOCKED.test(new URL(page.url()).pathname)) throw new Error(`Redirected to blocked path ${page.url()}`);
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
  const manifest = `# Screenshot capture log\n\nCaptured ${new Date().toISOString()} with Playwright (reduced motion, cookie banners dismissed).\nBlocked paths: login, dashboard, admin, account, track, api.\n\n${results.map((r) => `- ${r}`).join("\n")}\n`;
  await mkdir(path.join(process.cwd(), "docs"), { recursive: true });
  await writeFile(path.join(process.cwd(), "docs", "screenshot-log.md"), manifest);
  console.log(`\n${results.length} screenshots written. Log: docs/screenshot-log.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
