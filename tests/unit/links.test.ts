import { describe, expect, it } from "vitest";
import { bookConsultationHref, buildWhatsAppUrl, hostnameOf, isSafeExternalUrl, startProjectHref, whatsappMessageFor } from "@/lib/links";

describe("buildWhatsAppUrl", () => {
  it("returns null when no number is configured", () => {
    expect(buildWhatsAppUrl("", "hi")).toBeNull();
    expect(buildWhatsAppUrl(undefined, "hi")).toBeNull();
    expect(buildWhatsAppUrl("123", "hi")).toBeNull();
  });
  it("strips non-digits and encodes the message", () => {
    expect(buildWhatsAppUrl("+234 801 234 5678", "Hello areniX, I'd like to discuss a project.")).toBe("https://wa.me/2348012345678?text=Hello%20areniX%2C%20I'd%20like%20to%20discuss%20a%20project.");
  });
  it("rejects implausible lengths", () => {
    expect(buildWhatsAppUrl("1234567890123456", "x")).toBeNull();
  });
});

describe("isSafeExternalUrl", () => {
  it("accepts public https URLs only", () => {
    expect(isSafeExternalUrl("https://www.clenest.site")).toBe(true);
    expect(isSafeExternalUrl("https://passion-nutrition-clinic.vercel.app/")).toBe(true);
    expect(isSafeExternalUrl("http://example.com")).toBe(false);
    expect(isSafeExternalUrl("https://localhost:3000")).toBe(false);
    expect(isSafeExternalUrl("https://192.168.1.4")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
  });
});

describe("CTA hrefs", () => {
  it("carries service/project context", () => {
    expect(startProjectHref({ service: "SaaS Product Engineering" })).toBe("/start-project?service=SaaS+Product+Engineering");
    expect(startProjectHref()).toBe("/start-project");
    expect(bookConsultationHref({ type: "discovery" })).toBe("/book-consultation?type=discovery");
  });
  it("builds contextual WhatsApp messages", () => {
    expect(whatsappMessageFor({ service: "Websites" })).toContain("Websites");
    expect(whatsappMessageFor({ project: "CleNest" })).toContain("CleNest");
    expect(whatsappMessageFor()).toBe("Hello areniX, I'd like to discuss a project.");
  });
  it("extracts hostnames", () => {
    expect(hostnameOf("https://www.clenest.site/x")).toBe("clenest.site");
  });
});
