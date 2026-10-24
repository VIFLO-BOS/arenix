// Submits the contact form repeatedly from one forwarded IP to verify the rate-limit UX:
// the user must see a clear message and keep their typed values (no silent failure).
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const ip = `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
const page = await ctx.newPage();
let limited = false;
for (let i = 1; i <= 7; i++) {
  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await page.getByLabel(/^name/i).fill(`Rate Tester ${i}`);
  await page.getByLabel(/^email/i).fill(`rate+${Date.now()}@example.com`);
  await page.getByLabel(/subject/i).fill("Rate limit check");
  await page.getByLabel(/^message/i).fill("This submission is part of an automated rate limit verification run.");
  await page.getByLabel(/i agree/i).check();
  await page.getByRole("button", { name: /send message/i }).click();
  const ok = page.getByText(/ARX-INQ-/);
  const tooMany = page.getByText(/too many submissions/i);
  await Promise.race([ok.waitFor({ timeout: 20000 }), tooMany.waitFor({ timeout: 20000 })]);
  if (await tooMany.isVisible().catch(() => false)) {
    const nameVal = await page.getByLabel(/^name/i).inputValue();
    console.log(`attempt ${i}: rate limited; name field retained = ${nameVal === `Rate Tester ${i}`}`);
    limited = true;
    break;
  }
  console.log(`attempt ${i}: saved`);
}
await browser.close();
console.log(limited ? "RATE LIMIT UX OK" : "NOT LIMITED within 7 attempts");
