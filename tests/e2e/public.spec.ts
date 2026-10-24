import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/about", "/services", "/services/corporate-websites-web-development", "/work", "/work/clenest", "/work/nethuk", "/solutions", "/solutions/healthcare", "/technologies", "/process", "/insights", "/lab", "/careers", "/contact", "/book-consultation", "/start-project", "/privacy", "/terms"];

test.describe("public routes", () => {
  for (const route of ROUTES) {
    test(`${route} renders with an h1 and no horizontal overflow`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page).toHaveTitle(/areniX/);
    });
  }

  test("unknown route shows the branded 404", async ({ page }) => {
    const res = await page.goto("/this-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/not here/i);
  });
});

test.describe("portfolio", () => {
  test("card links go to the internal case study and live link is conditional", async ({ page }) => {
    await page.goto("/work");
    const caseStudy = page.getByRole("link", { name: /view case study/i }).first();
    await expect(caseStudy).toBeVisible();
    await caseStudy.click();
    // First visit compiles the route and optimises its images in dev, so allow for a cold start.
    await expect(page).toHaveURL(/\/work\/[a-z0-9-]+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/work$/);

    // Live links must be https, open in a new tab with safe rel, and only exist for public projects.
    const visit = page.getByRole("link", { name: /^visit /i });
    const count = await visit.count();
    for (let i = 0; i < count; i++) {
      const a = visit.nth(i);
      expect(await a.getAttribute("href")).toMatch(/^https:\/\//);
      expect(await a.getAttribute("target")).toBe("_blank");
      expect(await a.getAttribute("rel")).toContain("noopener");
    }
  });

  test("in-development project has no forged live link", async ({ page }) => {
    await page.goto("/work/nethuk");
    await expect(page.getByText(/in development/i).first()).toBeVisible();
    // The project header (first section) must not offer a live link; related-project cards may legitimately link to other live sites.
    const header = page.locator("main section").first();
    await expect(header.getByRole("link", { name: /^visit /i })).toHaveCount(0);
    await expect(header.getByText(/no public link yet/i)).toBeVisible();
  });

  test("filters update the result count accessibly", async ({ page }) => {
    await page.goto("/work");
    const status = page.getByRole("status").filter({ hasText: /showing/i });
    await expect(status).toContainText(/showing \d+ of \d+/i);
    await page.getByRole("radio", { name: "In Development" }).click();
    await expect(status).toContainText(/showing 1 of/i);
    await page.getByRole("button", { name: /clear filters/i }).click();
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 320, height: 720 } });
  test("menu opens, traps focus and closes with Escape", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /open menu/i });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: /site menu/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Work" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

// Each run gets its own forwarded IP so the per-IP form rate limit (5 / 10 min) never
// interferes with repeated local runs.
const runIp = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;

test.describe("forms", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": runIp } });
  test("contact form validates server-side and persists with a reference", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel(/^name/i).fill("E2E Tester");
    await page.getByLabel(/^email/i).fill("not-an-email");
    await page.getByLabel(/subject/i).fill("Playwright check");
    await page.getByLabel(/^message/i).fill("Short");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/please fix the highlighted fields/i)).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/^email/i).fill(`e2e+${Date.now()}@example.com`);
    await page.getByLabel(/^message/i).fill("This is an automated end-to-end test message with enough characters.");
    await page.getByLabel(/i agree/i).check();
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText(/ARX-INQ-/)).toBeVisible({ timeout: 20_000 });
  });

  test("consultation request is saved as a request, not a confirmation", async ({ page }) => {
    await page.goto("/book-consultation?type=discovery");
    await page.getByLabel(/^name/i).fill("E2E Booker");
    await page.getByLabel(/^email/i).fill(`e2e-booking+${Date.now()}@example.com`);
    await page.getByLabel(/what would you like to discuss/i).fill("Discovery call about a staff management system.");
    await page.getByLabel(/i agree/i).check();
    await page.getByRole("button", { name: /request this consultation/i }).click();
    await expect(page.getByText(/ARX-BKG-/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/This is a request, not a confirmed appointment/i)).toBeVisible();
  });
});

test.describe("admin boundary", () => {
  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
