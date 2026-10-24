/**
 * Visual/responsive QA: loads every public route at 250–1920px widths, checks for horizontal
 * overflow and console errors, saves screenshots to docs/qa/screens and writes
 * docs/qa/responsive-report.md.
 *
 *   npm run qa:responsive                      # against http://localhost:3000
 *   BASE_URL=https://example.com npm run qa:responsive
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = [250, 320, 375, 430, 768, 1024, 1440, 1920];
const ROUTES = ["/", "/about", "/services", "/services/custom-software-web-applications", "/work", "/work/clenest", "/work/nethuk", "/solutions", "/solutions/education", "/technologies", "/process", "/insights", "/insights/honest-portfolio-screenshots-and-case-studies", "/lab", "/careers", "/contact", "/book-consultation", "/start-project", "/privacy", "/terms", "/does-not-exist", "/admin/login"];

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    try {
      return await chromium.launch({ headless: true, channel: "msedge" });
    } catch {
      return await chromium.launch({ headless: true, channel: "chrome" });
    }
  }
}

type Row = { route: string; width: number; status: number | null; overflow: number; errors: string[]; h1: boolean };

async function main() {
  const outDir = path.join(process.cwd(), "docs", "qa", "screens");
  await mkdir(outDir, { recursive: true });
  const browser = await launch();
  const rows: Row[] = [];
  try {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: width < 768 ? 800 : 1000 }, reducedMotion: "no-preference" });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text().slice(0, 160));
      });
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));
      for (const route of ROUTES) {
        errors.length = 0;
        let status: number | null = null;
        try {
          const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60000 });
          status = res?.status() ?? null;
          await page.waitForTimeout(400);
          const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
          const h1 = (await page.locator("h1").count()) > 0;
          if ([250, 320, 768, 1440].includes(width)) {
            await page.screenshot({ path: path.join(outDir, `${route === "/" ? "home" : route.replace(/^\//, "").replace(/[\/\[\]]/g, "_")}-${width}.png`), fullPage: width <= 320 });
          }
          rows.push({ route, width, status, overflow, errors: [...errors], h1 });
          const flag = overflow > 0 ? `OVERFLOW +${overflow}px` : errors.length ? `${errors.length} console error(s)` : "ok";
          console.log(`${String(width).padStart(4)}px ${route.padEnd(58)} ${status} ${flag}`);
        } catch (err) {
          rows.push({ route, width, status, overflow: -1, errors: [err instanceof Error ? err.message : String(err)], h1: false });
          console.log(`${String(width).padStart(4)}px ${route.padEnd(58)} FAILED ${err instanceof Error ? err.message.split("\n")[0] : err}`);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const problems = rows.filter((r) => r.overflow !== 0 || r.errors.length || (r.status !== null && r.status >= 500) || (!r.h1 && r.status === 200));
  const md = [
    `# Responsive QA report`,
    ``,
    `Base URL: ${BASE}  `,
    `Run: ${new Date().toISOString()}  `,
    `Widths: ${WIDTHS.join(", ")}px · Routes: ${ROUTES.length}`,
    ``,
    `## Summary`,
    ``,
    `- Checks: ${rows.length}`,
    `- Horizontal overflow: ${rows.filter((r) => r.overflow > 0).length}`,
    `- Pages with console errors: ${rows.filter((r) => r.errors.length).length}`,
    `- Load failures: ${rows.filter((r) => r.overflow === -1).length}`,
    `- Missing h1 (200 pages): ${rows.filter((r) => !r.h1 && r.status === 200).length}`,
    ``,
    `## Problems`,
    ``,
    problems.length ? `| Route | Width | Status | Overflow | Errors |\n|---|---|---|---|---|\n${problems.map((p) => `| ${p.route} | ${p.width} | ${p.status ?? "—"} | ${p.overflow === -1 ? "load failed" : `${p.overflow}px`} | ${p.errors.join("<br>").replace(/\|/g, "\\|") || "—"} |`).join("\n")}` : "None.",
    ``,
    `## All checks`,
    ``,
    `| Route | Width | Status | Overflow | h1 | Errors |`,
    `|---|---|---|---|---|---|`,
    ...rows.map((r) => `| ${r.route} | ${r.width} | ${r.status ?? "—"} | ${r.overflow === -1 ? "fail" : r.overflow} | ${r.h1 ? "yes" : "no"} | ${r.errors.length} |`),
    ``,
  ].join("\n");
  await writeFile(path.join(process.cwd(), "docs", "qa", "responsive-report.md"), md);
  console.log(`\nReport: docs/qa/responsive-report.md (${problems.length} problem rows)`);
  process.exitCode = problems.some((p) => p.overflow > 0 || p.overflow === -1) ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
