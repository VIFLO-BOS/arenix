import type { Solution, IndustryCard } from "@/types/content";

/**
 * Sector solutions. `capabilityStatus` is honest. "delivered" only where a named portfolio
 * project exists in that sector, "proposed" marks capabilities we offer but have not yet shipped
 * publicly, "mixed" where both apply.
 */
export const solutionsFixture: Solution[] = [
  {
    slug: "education",
    sector: "Education",
    title: "Learning, assessment and academic operations",
    summary: "Learning management, assessment and evaluation platforms for schools, training providers and academies.",
    description:
      "Education products have to serve several audiences at once. Learners, instructors, administrators and sometimes parents, each with very different needs. We design role aware platforms where content delivery, assessment, grading and reporting share one source of truth.",
    needs: ["Course and content delivery with progress tracking", "Secure assessments, grading and analytics", "Administrator reporting across cohorts", "Access that works on low end devices and patchy networks"],
    useCases: [
      { title: "Learning management", detail: "Courses, modules, enrolment, progress and certificates, with instructor and administrator roles." },
      { title: "Assessment and evaluation", detail: "Test authoring, timed delivery, automatic and manual grading, result analytics." },
      { title: "Academic operations", detail: "Cohort management, scheduling, communications and reporting." },
    ],
    workflow: ["Discovery with academic and admin stakeholders", "Role and data model design", "Pilot with one cohort", "Full rollout and training"],
    architectureNotes: "Role based web applications with MongoDB or PostgreSQL, media delivery through a CDN, assessment integrity controls (timing, attempt limits, audit) and exportable reporting.",
    proofProjectSlugs: ["arenox-lms", "annotrix"],
    capabilityStatus: "mixed",
    published: true,
    sortOrder: 1,
  },
  {
    slug: "healthcare",
    sector: "Healthcare and Wellness",
    title: "Patient facing websites and clinic operations",
    summary: "Clinic websites with appointment requests, service information and content, built with privacy in mind.",
    description:
      "For clinics and wellness practices the website is often the first consultation. It must explain services clearly, make it easy to request an appointment and respect the sensitivity of health related data. We have delivered a public clinic website and offer operations tooling as a scoped extension.",
    needs: ["Clear service and practitioner information", "Appointment requests that reach the right person", "Mobile first performance for patients on phones", "Privacy aware forms and consent"],
    useCases: [
      { title: "Clinic website", detail: "Services, practitioners, packages, articles and an appointment request flow." },
      { title: "Appointment coordination", detail: "Request handling, confirmations and reminders through configured channels." },
      { title: "Practice operations (proposed)", detail: "Scheduling and client records, scoped per practice and regulatory context." },
    ],
    workflow: ["Content and service inventory", "Design and build the public site", "Appointment flow and notifications", "Analytics and iteration"],
    architectureNotes: "Static first Next.js site with server handled forms, consent capture, minimal data retention and no third party trackers by default.",
    proofProjectSlugs: ["passion-nutrition-clinic"],
    capabilityStatus: "mixed",
    published: true,
    sortOrder: 2,
  },
  {
    slug: "retail",
    sector: "Retail and Distribution",
    title: "Branch, inventory and sales management",
    summary: "Systems that keep stock, sales and staff in step across branches, with management reporting that reconciles.",
    description:
      "Retail operations break down at the seams between branches, stock and cash. Our branch management work targets those seams. A single system for inventory, sales, staff and approvals with accurate reporting for owners.",
    needs: ["Inventory visibility across locations", "Sales recording tied to stock movement", "Staff roles and approvals", "Owner level dashboards"],
    useCases: [
      { title: "Branch manager", detail: "Per branch inventory, sales, expenses and staff with head office consolidation." },
      { title: "Inventory and purchasing", detail: "Stock levels, transfers, reorder points and supplier records." },
      { title: "Sales and reporting", detail: "Point of sale style recording with daily, weekly and monthly reports." },
    ],
    workflow: ["Branch observation and process map", "Module rollout starting with inventory", "Reporting calibration", "Training and support"],
    architectureNotes: "Role separated web application, immutable transaction log, reconciliation reports, and connectivity tolerant interfaces.",
    proofProjectSlugs: ["arenix-branch-manager"],
    capabilityStatus: "mixed",
    published: true,
    sortOrder: 3,
  },
  {
    slug: "workforce",
    sector: "Workforce and HR",
    title: "Staff management and workforce operations",
    summary: "Employee records, attendance, approvals and management dashboards for organisations managing distributed teams.",
    description:
      "Workforce systems carry sensitive data and need strict role boundaries. Our staff management and dashboard work gives managers accurate, timely information while protecting employee privacy.",
    needs: ["Reliable employee records and documents", "Attendance, leave and approvals with history", "Manager dashboards and reporting", "Strict access control and audit"],
    useCases: [
      { title: "Staff management", detail: "Employee profiles, departments, roles, leave and approval workflows." },
      { title: "Operations dashboard", detail: "Headcount, attendance and approval metrics for management." },
      { title: "Payroll adjacent data (proposed)", detail: "Structured exports to payroll providers, scoped per organisation." },
    ],
    workflow: ["Role and policy mapping", "Core records module", "Approvals and dashboards", "Hardening and rollout"],
    architectureNotes: "Server enforced permissions, field level privacy for sensitive data, an audit trail for every change, and reporting from the same records.",
    proofProjectSlugs: ["paylio-staff-management", "paylio-dashboard"],
    capabilityStatus: "mixed",
    published: true,
    sortOrder: 4,
  },
  {
    slug: "hospitality-services",
    sector: "Hospitality and Home Services",
    title: "Service ordering and operations for customer facing businesses",
    summary: "Customer ordering, scheduling and service operations for laundry, cleaning and similar service businesses.",
    description:
      "Service businesses need a frictionless customer front door and a dependable operations back office. CleNest is our public example. A laundry and cleaning platform with customer ordering and service operations.",
    needs: ["Simple customer ordering on mobile", "Scheduling and status tracking", "Operations views for staff", "Payments and notifications through configured providers"],
    useCases: [
      { title: "Service ordering platform", detail: "Catalogue, pricing, order flow, tracking and customer accounts." },
      { title: "Operations console", detail: "Order queue, assignment, status updates and reporting." },
      { title: "Customer communications", detail: "Status notifications via email and configured messaging channels." },
    ],
    workflow: ["Service catalogue and pricing model", "Customer ordering flow", "Operations console", "Launch and iterate on real orders"],
    architectureNotes: "Next.js platform with customer and staff roles, an order state machine, a notification outbox and payment provider adapters.",
    proofProjectSlugs: ["clenest"],
    capabilityStatus: "delivered",
    published: true,
    sortOrder: 5,
  },
  {
    slug: "startups",
    sector: "Startups and New Products",
    title: "From validated idea to a product customers can use",
    summary: "Focused MVPs, product engineering and a path to scale for founders who need a dependable technical partner.",
    description:
      "Founders need speed without creating a rebuild problem six months later. We help define the narrowest valuable product, build it on a structure that can grow, and instrument it so decisions come from usage.",
    needs: ["Clear MVP scope", "Fast, careful delivery", "Architecture that survives growth", "Honest technical advice"],
    useCases: [
      { title: "MVP build", detail: "Core product, authentication, admin console and analytics in a focused release." },
      { title: "Technical partnership", detail: "Ongoing engineering capacity with product and architecture input." },
      { title: "Due diligence readiness", detail: "Documentation, security posture and code quality investors and partners expect." },
    ],
    workflow: ["Wedge definition", "Architecture and tenancy decisions", "Weekly releases", "Scale when data says so"],
    architectureNotes: "See SaaS Product Engineering. Tenant aware data, roles, background jobs, monitoring and feature flags from day one.",
    proofProjectSlugs: ["nethuk", "clenest"],
    capabilityStatus: "mixed",
    published: true,
    sortOrder: 6,
  },
];

export const industriesFixture: IndustryCard[] = solutionsFixture.map((s) => ({
  key: s.slug,
  label: s.sector,
  summary: s.summary,
  useCases: s.useCases.map((u) => u.title),
  deliveredProjectSlugs: s.proofProjectSlugs,
}));
