// Visual spot-checks of the public site at desktop and the 250px floor.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "C:/Users/user/AppData/Local/Temp/claude/c--Personal-Software-Project-arenix/bdb0a30b-0c2f-449a-8242-cf087ce1e214/scratchpad/visual";
await mkdir(OUT, { recursive: true });
const shots = [
  { name: "home-1440", path: "/", width: 1440, height: 900, full: false },
  { name: "home-250-full", path: "/", width: 250, height: 700, full: true },
  { name: "work-250-full", path: "/work", width: 250, height: 700, full: true },
  { name: "case-390", path: "/work/clenest", width: 390, height: 844, full: false },
  { name: "services-1440", path: "/services", width: 1440, height: 900, full: false },
  { name: "start-project-320", path: "/start-project", width: 320, height: 800, full: true },
  { name: "admin-login-250", path: "/admin/login", width: 250, height: 700, full: true },
];
const browser = await chromium.launch({ headless: true });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: s.full });
  console.log(`${s.name}: overflow=${overflow}px`);
  await ctx.close();
}
await browser.close();
