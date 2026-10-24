import { describe, expect, it } from "vitest";
import { consultationRequestSchema, contactFormSchema, fieldErrors, passwordSchema, projectRequestSchema } from "@/lib/validation/forms";
import { portfolioSchema, settingsSchema } from "@/lib/validation/admin";

describe("contactFormSchema", () => {
  const valid = { name: "Ada Lovelace", email: "ada@example.com", subject: "Website rebuild", message: "We need a new corporate website with a CMS and booking.", consent: true, website: "" };
  it("accepts a valid submission", () => {
    expect(contactFormSchema.safeParse(valid).success).toBe(true);
  });
  it("requires consent and a real email", () => {
    const r1 = contactFormSchema.safeParse({ ...valid, consent: false });
    expect(r1.success).toBe(false);
    if (!r1.success) expect(fieldErrors(r1.error).consent).toBeTruthy();
    const r2 = contactFormSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r2.success).toBe(false);
  });
  it("rejects honeypot content", () => {
    expect(contactFormSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });
});

describe("projectRequestSchema", () => {
  it("validates budget/timeline enums and optional fields", () => {
    const base = { name: "Ada", email: "ada@example.com", serviceCategory: "Custom Software & Web Applications", goal: "Replace spreadsheets with a staff system.", message: "We manage 40 staff across three branches using spreadsheets and WhatsApp groups.", consent: true, website: "" };
    expect(projectRequestSchema.safeParse(base).success).toBe(true);
    expect(projectRequestSchema.safeParse({ ...base, budgetRange: "₦1m to ₦3m", timeline: "1 to 3 months" }).success).toBe(true);
    expect(projectRequestSchema.safeParse({ ...base, budgetRange: "a million dollars" }).success).toBe(false);
  });
});

describe("consultationRequestSchema", () => {
  it("only accepts known consultation types", () => {
    const base = { consultationType: "discovery", name: "Ada", email: "ada@example.com", summary: "Discuss a new product idea.", consent: true, website: "", preferredWindows: [] };
    expect(consultationRequestSchema.safeParse(base).success).toBe(true);
    expect(consultationRequestSchema.safeParse({ ...base, consultationType: "lunch" }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("enforces length and mix", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercaseletters").success).toBe(false);
    expect(passwordSchema.safeParse("Correct-Horse-Battery-9").success).toBe(true);
  });
});

describe("portfolioSchema", () => {
  const base = { slug: "clenest", title: "CleNest", teaser: "Laundry and cleaning platform.", description: "A web platform for a laundry business with ordering and operations.", status: "LIVE", services: "", technologies: "", goals: "", features: "", outcomes: "", relatedSlugs: "" };
  it("requires https live URLs", () => {
    expect(portfolioSchema.safeParse({ ...base, liveUrl: "https://www.clenest.site" }).success).toBe(true);
    expect(portfolioSchema.safeParse({ ...base, liveUrl: "http://www.clenest.site" }).success).toBe(false);
  });
  it("splits line lists", () => {
    const r = portfolioSchema.safeParse({ ...base, features: "Ordering\n\nTracking \n" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.features).toEqual(["Ordering", "Tracking"]);
  });
  it("rejects bad slugs", () => {
    expect(portfolioSchema.safeParse({ ...base, slug: "Not A Slug" }).success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("normalises WhatsApp digits", () => {
    const r = settingsSchema.safeParse({ section: "contact", whatsappDigits: "+234 (0)801 234-5678" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.whatsappDigits).toBe("23408012345678");
  });
});
