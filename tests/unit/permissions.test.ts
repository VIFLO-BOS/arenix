import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS, roleHas } from "@/server/auth/permissions";

describe("role matrix (least privilege)", () => {
  it("content managers cannot read CRM data or quotes", () => {
    expect(roleHas("CONTENT_MANAGER", "cms:write")).toBe(true);
    expect(roleHas("CONTENT_MANAGER", "inquiries:read")).toBe(false);
    expect(roleHas("CONTENT_MANAGER", "leads:read")).toBe(false);
    expect(roleHas("CONTENT_MANAGER", "proposals:read")).toBe(false);
    expect(roleHas("CONTENT_MANAGER", "settings:write")).toBe(false);
  });
  it("project managers see delivery records but not inquiries", () => {
    expect(roleHas("PROJECT_MANAGER", "projects:write")).toBe(true);
    expect(roleHas("PROJECT_MANAGER", "inquiries:read")).toBe(false);
    expect(roleHas("PROJECT_MANAGER", "team:manage")).toBe(false);
  });
  it("business development cannot approve proposals or manage the team", () => {
    expect(roleHas("BUSINESS_DEVELOPMENT", "proposals:send")).toBe(true);
    expect(roleHas("BUSINESS_DEVELOPMENT", "proposals:approve")).toBe(false);
    expect(roleHas("BUSINESS_DEVELOPMENT", "team:manage")).toBe(false);
    expect(roleHas("BUSINESS_DEVELOPMENT", "cms:write")).toBe(false);
  });
  it("super admin and admin have every permission", () => {
    const all = ROLE_PERMISSIONS.SUPER_ADMIN;
    expect(all.size).toBeGreaterThan(15);
    for (const p of all) expect(roleHas("ADMIN", p)).toBe(true);
  });
});
