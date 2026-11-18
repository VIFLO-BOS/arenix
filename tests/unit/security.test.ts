import { describe, expect, it } from "vitest";
import { safeHref } from "@/components/ui/markdown";
import { literalPattern } from "@/lib/utils";
import { safeErrorMessage } from "@/app/admin/(dashboard)/run-action";
import { AuthorizationError } from "@/server/auth/session";

describe("safe links in admin written text", () => {
  it("keeps web, email, phone, anchor and site links", () => {
    for (const href of ["https://www.arenixtech.com.ng/", "http://example.org/a", "mailto:hello@example.org", "tel:+2348031234567", "#section", "/contact", "./terms"]) {
      expect(safeHref(href)).toBe(href);
    }
  });

  it("turns script, data and other links into dead links", () => {
    for (const href of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox", "//evil.example/x", "file:///etc/passwd", "evil.example"]) {
      expect(safeHref(href), href).toBe("#");
    }
  });
});

describe("literal search patterns", () => {
  it("matches the typed text literally and ignores case", () => {
    const p = literalPattern("a.b(c)*[x]");
    expect(p.test("A.B(C)*[X]")).toBe(true);
    expect(p.test("aXb(c)*[x]")).toBe(false);
  });

  it("cannot be turned into a slow pattern", () => {
    const p = literalPattern("(a+)+$");
    const started = Date.now();
    expect(p.test(`${"a".repeat(5000)}!`)).toBe(false);
    expect(Date.now() - started).toBeLessThan(50);
  });

  it("caps the length", () => {
    expect(literalPattern("x".repeat(500)).source.length).toBe(100);
  });
});

describe("error messages shown in the admin", () => {
  it("shows messages the app wrote on purpose", () => {
    expect(safeErrorMessage(new Error("Lead not found"))).toBe("Lead not found");
    expect(safeErrorMessage(new AuthorizationError())).toMatch(/permission/);
  });

  it("hides internal errors", () => {
    class MongoServerError extends Error {
      constructor() {
        super("E11000 duplicate key error collection: arenix.users index: email_1 dup key");
        this.name = "MongoServerError";
      }
    }
    expect(safeErrorMessage(new MongoServerError())).toMatch(/^Something went wrong/);
    expect(safeErrorMessage(new TypeError("Cannot read properties of undefined"))).toMatch(/^Something went wrong/);
    expect(safeErrorMessage("plain string")).toMatch(/^Something went wrong/);
  });
});
