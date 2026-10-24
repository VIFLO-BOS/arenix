import type { Technology, TechnologyCategory } from "@/types/content";

export const TECH_CATEGORIES: TechnologyCategory[] = [
  "Frontend",
  "Backend",
  "Databases",
  "Mobile",
  "Cloud and Deployment",
  "Architecture and Integration",
  "Design and Motion",
];

/** Technologies areniX actively works with. Project mapping lists only known portfolio entries. */
export const technologiesFixture: Technology[] = [
  { name: "TypeScript", slug: "typescript", category: "Frontend", description: "Strict typing across web, mobile and services.", projectSlugs: ["clenest", "passion-nutrition-clinic", "paylio-staff-management", "arenox-lms", "annotrix", "arenix-branch-manager"], published: true },
  { name: "React", slug: "react", category: "Frontend", description: "Component model for marketing sites, dashboards and apps.", projectSlugs: ["clenest", "passion-nutrition-clinic", "paylio-dashboard", "arenox-lms"], published: true },
  { name: "Next.js", slug: "nextjs", category: "Frontend", description: "App Router, server components, image optimisation and routing.", projectSlugs: ["clenest", "passion-nutrition-clinic"], published: true },
  { name: "Tailwind CSS", slug: "tailwind", category: "Frontend", description: "Token driven styling with design system discipline.", projectSlugs: ["clenest", "passion-nutrition-clinic"], published: true },
  { name: "Node.js", slug: "nodejs", category: "Backend", description: "Server runtime for APIs, jobs and integrations.", projectSlugs: ["clenest", "paylio-staff-management", "arenox-lms", "annotrix"], published: true },
  { name: "NestJS", slug: "nestjs", category: "Backend", description: "Structured service architecture for larger back ends.", projectSlugs: [], published: true },
  { name: "Express", slug: "express", category: "Backend", description: "Lightweight HTTP services and webhooks.", projectSlugs: [], published: true },
  { name: "Zod", slug: "zod", category: "Backend", description: "Schema validation at every boundary.", projectSlugs: ["clenest"], published: true },
  { name: "MongoDB", slug: "mongodb", category: "Databases", description: "Document database for flexible operational data. Community Edition supported for self hosting.", projectSlugs: [], published: true },
  { name: "Mongoose", slug: "mongoose", category: "Databases", description: "Typed schemas, indexes and validation for MongoDB.", projectSlugs: [], published: true },
  { name: "PostgreSQL", slug: "postgresql", category: "Databases", description: "Relational database for transactional and reporting workloads.", projectSlugs: [], published: true },
  { name: "Prisma", slug: "prisma", category: "Databases", description: "Typed ORM and migrations for SQL databases.", projectSlugs: [], published: true },
  { name: "React Native", slug: "react-native", category: "Mobile", description: "Cross platform mobile apps sharing TypeScript logic with the web.", projectSlugs: [], published: true },
  { name: "Vercel", slug: "vercel", category: "Cloud and Deployment", description: "Hosting and edge network for Next.js applications.", projectSlugs: ["passion-nutrition-clinic"], published: true },
  { name: "Docker", slug: "docker", category: "Cloud and Deployment", description: "Reproducible service packaging and local environments.", projectSlugs: [], published: true },
  { name: "GitHub Actions", slug: "github-actions", category: "Cloud and Deployment", description: "Continuous integration for typecheck, lint, tests and deployments.", projectSlugs: [], published: true },
  { name: "Object storage (S3 compatible)", slug: "object-storage", category: "Cloud and Deployment", description: "Media and document storage with signed uploads.", projectSlugs: [], published: true },
  { name: "REST and Webhooks", slug: "rest-webhooks", category: "Architecture and Integration", description: "Verified, idempotent integrations with third party platforms.", projectSlugs: ["clenest"], published: true },
  { name: "Role based access control", slug: "rbac", category: "Architecture and Integration", description: "Server enforced permissions and audit trails.", projectSlugs: ["paylio-staff-management", "arenix-branch-manager", "arenox-lms"], published: true },
  { name: "Transactional email (Resend)", slug: "resend", category: "Architecture and Integration", description: "Outbox backed email delivery with status tracking.", projectSlugs: [], published: true },
  { name: "Playwright", slug: "playwright", category: "Architecture and Integration", description: "End to end tests and automated screenshot pipelines.", projectSlugs: [], published: true },
  { name: "Figma", slug: "figma", category: "Design and Motion", description: "Flows, prototypes and design systems.", projectSlugs: [], published: true },
  { name: "GSAP and ScrollTrigger", slug: "gsap", category: "Design and Motion", description: "Scroll linked storytelling where motion carries meaning.", projectSlugs: [], published: true },
  { name: "Motion for React", slug: "motion", category: "Design and Motion", description: "Component and route transitions with reduced motion fallbacks.", projectSlugs: [], published: true },
  { name: "Lenis", slug: "lenis", category: "Design and Motion", description: "Smooth scrolling that keeps native behaviour intact.", projectSlugs: [], published: true },
];
