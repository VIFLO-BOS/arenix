import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "docs/qa/visual";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 250, height: 640 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
for (const [name, path, scroll] of [["n-home-top", "/", 0], ["n-home-services", "/", 2600], ["n-work", "/work", 900], ["n-contact", "/contact", 700], ["n-case", "/work/clenest", 0]]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate((y) => window.scrollTo(0, y), scroll);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-250.png` });
  console.log("shot", name);
}
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /open menu/i }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/n-menu-250.png` });
console.log("shot menu");
await browser.close();
