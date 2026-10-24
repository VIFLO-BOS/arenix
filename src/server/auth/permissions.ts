import type { Role } from "@/server/db/models/user";

export type Permission =
  | "dashboard:read"
  | "analytics:read"
  | "inquiries:read"
  | "inquiries:write"
  | "leads:read"
  | "leads:write"
  | "clients:read"
  | "clients:write"
  | "bookings:read"
  | "bookings:write"
  | "proposals:read"
  | "proposals:write"
  | "proposals:approve"
  | "proposals:send"
  | "projects:read"
  | "projects:write"
  | "cms:read"
  | "cms:write"
  | "cms:publish"
  | "media:write"
  | "team:manage"
  | "settings:write"
  | "audit:read";

const ALL: Permission[] = [
  "dashboard:read",
  "analytics:read",
  "inquiries:read",
  "inquiries:write",
  "leads:read",
  "leads:write",
  "clients:read",
  "clients:write",
  "bookings:read",
  "bookings:write",
  "proposals:read",
  "proposals:write",
  "proposals:approve",
  "proposals:send",
  "projects:read",
  "projects:write",
  "cms:read",
  "cms:write",
  "cms:publish",
  "media:write",
  "team:manage",
  "settings:write",
  "audit:read",
];

/**
 * Least-privilege role matrix. Content managers cannot read CRM/quotes; project managers
 * only see delivery records (object-level checks narrow that further in the services).
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set(ALL),
  // ADMIN has every permission; only SUPER_ADMIN may grant/revoke the SUPER_ADMIN role (enforced in team service).
  ADMIN: new Set(ALL),
  BUSINESS_DEVELOPMENT: new Set<Permission>([
    "dashboard:read",
    "analytics:read",
    "inquiries:read",
    "inquiries:write",
    "leads:read",
    "leads:write",
    "clients:read",
    "clients:write",
    "bookings:read",
    "bookings:write",
    "proposals:read",
    "proposals:write",
    "proposals:send",
    "projects:read",
  ]),
  CONTENT_MANAGER: new Set<Permission>(["dashboard:read", "cms:read", "cms:write", "cms:publish", "media:write"]),
  PROJECT_MANAGER: new Set<Permission>([
    "dashboard:read",
    "projects:read",
    "projects:write",
    "clients:read",
    "bookings:read",
    "proposals:read",
  ]),
};

export function roleHas(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  BUSINESS_DEVELOPMENT: "Business development",
  CONTENT_MANAGER: "Content manager",
  PROJECT_MANAGER: "Project manager",
};
