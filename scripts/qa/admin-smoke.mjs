// Admin smoke test: logs in with the bootstrap admin and visits every dashboard route.
import { chromium } from "playwright";
import mongoose from "mongoose";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
// Credentials come from the environment or from .env.local. Nothing is embedded here.
const envLocal = (() => {
  try {
    return Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
    );
  } catch {
    return {};
  }
})();
const EMAIL = process.env.ADMIN_EMAIL ?? envLocal.BOOTSTRAP_ADMIN_EMAIL ?? "admin@arenix.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? envLocal.BOOTSTRAP_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("Set ADMIN_PASSWORD or BOOTSTRAP_ADMIN_PASSWORD in .env.local");
const ROUTES = ["/admin", "/admin/inquiries", "/admin/leads", "/admin/leads?view=board", "/admin/clients", "/admin/clients/new", "/admin/bookings", "/admin/proposals", "/admin/proposals/new", "/admin/projects", "/admin/projects/new", "/admin/portfolio", "/admin/portfolio/clenest", "/admin/portfolio/new", "/admin/content", "/admin/content?tab=article", "/admin/content?tab=faq", "/admin/content/service/custom-software-web-applications", "/admin/content/article/new", "/admin/media", "/admin/notifications", "/admin/analytics", "/admin/team", "/admin/settings", "/admin/audit"];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message.slice(0, 200)));

await page.goto(`${BASE}/admin/login`);
await page.getByLabel(/email/i).fill(EMAIL);
await page.getByLabel(/password/i).fill(PASSWORD);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 60000 });
console.log("login ok ->", page.url());

let failures = 0;
for (const r of ROUTES) {
  consoleErrors.length = 0;
  const res = await page.goto(`${BASE}${r}`, { waitUntil: "networkidle", timeout: 120000 });
  const status = res?.status();
  const text = await page.locator("body").innerText();
  const errorish = /unexpected error|Access denied|Application error/i.test(text);
  const h1 = await page.locator("h1").count();
  const ok = status === 200 && !errorish && h1 > 0;
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${status} ${r}${errorish ? " (error text)" : ""}${h1 === 0 ? " (no h1)" : ""}${consoleErrors.length ? ` console: ${consoleErrors.join(" | ")}` : ""}`);
}

// Exercise one mutation: add a FAQ then check it appears.
await page.goto(`${BASE}/admin/content?tab=faq`);
const q = `Smoke question ${Date.now()}`;
await page.getByLabel(/^question/i).fill(q);
await page.getByLabel(/^answer/i).fill("Smoke answer written by the admin smoke test.");
await page.getByRole("button", { name: /save faq/i }).click();
await page.getByText(/FAQ saved/i).waitFor({ timeout: 30000 }).catch(() => {});
await page.waitForLoadState("networkidle");
await page.waitForTimeout(2000);
const appears = (await page.locator("body").innerText()).includes(q);
console.log(`${appears ? "✓" : "✗"} FAQ create + list refresh`);
if (!appears) failures++;

// Confirm the e2e created consultation request can be opened (if any)
await page.goto(`${BASE}/admin/bookings`);
const firstRef = page.locator("a[href^='/admin/bookings/']").first();
if (await firstRef.count()) {
  await firstRef.click();
  await page.waitForLoadState("networkidle");
  console.log(`✓ booking detail renders: ${page.url()}`);
}

// Sign out through the account menu in the top bar.
await page.getByRole("button", { name: /account menu/i }).click();
await page.getByRole("menuitem", { name: /sign out/i }).click();
await page.waitForURL(/\/admin\/login/);
console.log("logout ok");
await browser.close();

// Remove the FAQ this run created so test data never reaches the public site.
try {
  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/arenix");
  const r = await mongoose.connection.db.collection("faqs").deleteMany({ question: /^Smoke question/ });
  console.log(`cleaned ${r.deletedCount} smoke FAQ(s)`);
  await mongoose.disconnect();
} catch (e) {
  console.log("cleanup skipped", e.message);
}
console.log(failures ? `FAILURES: ${failures}` : "ALL ADMIN ROUTES OK");
process.exit(failures ? 1 : 0);
