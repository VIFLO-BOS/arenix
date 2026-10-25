# MASTER BUILD PROMPT, areniX Corporate Website & Business Operating Platform

## Role and objective

You are a coordinated senior team: creative director, brand designer, interactive UX engineer, Next.js/TypeScript full-stack architect, motion specialist, QA lead, accessibility specialist and technical SEO engineer.

Build a complete, original, production-ready digital headquarters for **areniX Technologies Limited**, publicly branded **areniX**. The deliverable comprises:

1. A **cinematic, design-led public marketing website**, every route and significant section has considered typography, layout, motion, and meaningful interactions.
2. A **real interactive portfolio** with authorized screenshots of actual project pages and working internal case-study links plus external `Visit Website` / `Open App` links only where public deployments exist.
3. Multi-channel **client acquisition**: service inquiries, WhatsApp click-to-chat, consultation scheduling, quote requests, consent-aware confirmation emails, and actionable calls to action.
4. A protected **areniX business dashboard**: leads, CRM, inquiries, bookings, project/quote pipeline, notifications, content management, portfolio media and settings.
5. A reliable engineering foundation with mobile responsiveness from **320px**, security, performance, SEO, accessibility, monitoring, and maintainable documentation.

This is not a static design exercise, copied Webflow template, generic dashboard starter, or portfolio-only one-pager. Produce working, connected functionality.

## Required reference websites, MUST analyze them before implementation

- https://altreex.webflow.io/
- https://onart-studio.webflow.io/project/voyage (and https://onart-studio.webflow.io/)
- https://visione.webflow.io/
- https://monoform-template.webflow.io/
- https://nexifye.webflow.io/

Inspect public homepage, navigation, sections, linked service/about/work/case-study/content/contact pages wherever available. Review actual responsive behavior, hover, menu, scrolling and transitions **where observable**. Write a concise `docs/design-reference-audit.md` with what is observed and what remains unverified. The provided five URLs are mandatory inspirations for the *marketing experience across all pages*; translate their **design principles**, not their logos, code, layout clones, text, photos, or proprietary assets. If a reference is inaccessible, explicitly record the limitation and continue with the supplied design requirements.

At minimum synthesize:
- **Altreex:** editorial/creative layouts, large project grids, expressive service composition.
- **Onart / Voyage:** oversized case-study heading, service/industry/year metadata, full-width imagery, project goals/outcomes, gallery and related-project routing.
- **Visione:** cinematic media storytelling, bold typography and immersive section pacing.
- **Monoform:** refined minimalism, strict typographic hierarchy, editorial whitespace, selected-work structure.
- **Nexifye:** technology/consulting credibility, dashboard/product imagery, service clarity, conversion-driven presentation.

Create a **unique areniX look** using a near-black/graphite + selective off-white editorial theme, restrained brand accent sourced from actual logo assets when supplied, striking type, intelligent motion, polished screens, and exceptional readability. Do not fabricate a brand guide if none was provided; record temporary design-token assumptions.

## Non-negotiable pages and interactions

Build the route inventory specified in `02_PUBLIC_WEBSITE_PAGES.md`:

`/`, `/about`, `/services`, `/services/[slug]`, `/work`, `/work/[slug]`, `/solutions`, `/solutions/[slug]`, `/technologies`, `/process`, `/insights`, `/insights/[slug]`, `/lab`, `/careers`, `/contact`, `/book-consultation`, `/start-project`, `/privacy`, `/terms`, and genuine not-found/error/loading pages. Keep routes navigable and genuinely populated. Avoid dead placeholder pages.

Every public page needs page-specific section composition and motion. Reuse the *system*, not one generic section template everywhere. Ensure mobile-friendly equivalents and reduced-motion fallbacks.

## Portfolio, make actual work the centerpiece

Initial project roster:

- **Passion Nutrition Clinic**, healthcare/nutrition website; known public URL: https://passion-nutrition-clinic.vercel.app/
- **Paylio Staff Management**, staff/workforce system; publish only approved, non-sensitive screenshots and facts.
- **Paylio Dashboard**, operations/admin dashboard; connect to the same case study where the modules are one delivery.
- **netHuk**, *In Development*; do not assume industry, features, URL, release date or production readiness.
- **CleNest**, laundry and cleaning service web platform; known public URL: https://www.clenest.site
- **ArenoX LMS**, education/learning platform; only confirmed capabilities.
- **Annotrix**, assessment and evaluation platform; only confirmed capabilities.
- **AreniX Branch Manager**, retail/inventory/sales/operations management solution; state delivery status truthfully.

Use real project images: chosen live website pages, dashboards, mobile pages and screenshot galleries. Automate screenshots of genuinely public accessible pages using Playwright where permitted; sanitize customer/user/private data. Each card must support **View Case Study** (internal `/work/[slug]`) and **Visit Website / Open App** (external URL, new tab) only where valid/public; no invented URLs. Build detailed, distinctive case studies with challenge, implementation, gallery, engineering contributions, verified outcomes, related projects. CMS-configurable content and media.

## Conversion & customer contact

- Configurable company WhatsApp click-to-chat CTA on site navigation, service pages, portfolio CTA and mobile sticky action where appropriate. Use real official number supplied in configuration, never CleNest's or an invented number. Prefill service/project context. Plain click-to-chat **does not** synchronize messages to CRM; do not promise this without official approved integration.
- `/book-consultation`: genuine appointment availability, selected consultation type, timezone-aware date/time, booking confirmation, reschedule/cancel. Prefer configured scheduling provider integration (e.g., Cal.com hosted/embedded + verified webhook) for first release. If no credentials/availability integration exists, show an honest **request a consultation** form, not fake slots or a fake confirmed appointment.
- `/start-project`: functioning detailed service/quote request. Validate, persist to DB, notify authorized staff, return a real reference ID/confirmation after success. Protect against spam and unsafe files.
- `/contact`: functioning general inquiry, clearly visible verified email and channels when configured.

## Private business dashboard

Create authenticated, server-authorized `/admin` with:
- KPI overview (real data, useful filters)
- CRM contacts/organizations, leads and follow-ups
- Inquiry queue and qualification workflow
- Bookings/calendar (sync status and provider identifiers)
- Proposals/quotes with status and versioning, controlled sending
- Internal client project register and milestones
- CMS: portfolio, screenshots, home features, services, technologies, case studies, posts, testimonials, careers, FAQs, SEO
- Notifications and activity/audit log
- Team invitations and roles
- Brand and integration settings

Use a restrained modern SaaS interface, not scroll-jacking or huge headline animations inside operational tables. Roles: `SUPER_ADMIN`, `ADMIN`, `BUSINESS_DEVELOPMENT`, `CONTENT_MANAGER`, `PROJECT_MANAGER`; enforce server-side least privilege. Do not allow public admin signup. Do not expose internal client materials to public pages.

A **client portal** is phase-two/three architecture unless deliberately included in the agreed build scope; never give customers admin accounts. Support later `/portal` for their own projects, milestones, files and approved communications.

## Technology baseline

Prefer TypeScript + Next.js App Router + React + Tailwind CSS v4 + accessible component primitives + GSAP/ScrollTrigger (complex scroll storytelling) + Motion for React (UI/component transitions) + CSS for simple interactions; optionally Lenis or Three.js *only* where justified. Use PostgreSQL + Prisma, secure auth (Auth.js or better-auth evaluated against requirements), server-side Zod validation, email through Resend, object storage for media, and Vercel hosting where viable. Scheduling provider and CMS decisions must be documented; because the dashboard requires content management, prefer a unified CMS module unless the team substantiates an external solution. No uncontrolled overlapping animation systems.

Configure integration secrets in environment variables, and provide functional local mocks only for development/testing clearly labeled *demo*; never masquerade them as live production integrations.

## Implementation workflow

1. Audit existing repository and source materials; do not replace existing work blindly.
2. Review five references. Produce reference audit, page inventory, design/motion specs and media inventory.
3. Establish brand tokens, navigation, shared layout, reusable motion components, site data schemas, auth and DB.
4. Build and verify the entire public marketing UI with accurate project content and responsive motion.
5. Implement functioning contact, quote, WhatsApp links, booking provider or clearly labeled booking-request fallback.
6. Implement dashboard, RBAC, CRM pipeline, CMS/media, booking sync, proposal workflow and notifications.
7. Test every route, click target, form, protected endpoint and responsive breakpoint.
8. Perform real build, typecheck, lint, accessibility and performance checks. Fix critical issues before declaring completion.

**Do not pretend to have built anything until the code, navigation and backends work.** If APIs/assets/credentials are missing, use maintainable interfaces, safe placeholders and explicit dependency flags; finish what can be built and clearly enumerate blocks. Never invent project results, staff, awards, years, numbers, ratings or testimonials.

## Required deliverables

- Application code and documented architecture
- Working public site + private dashboard
- Typed DB schema/migrations
- Content fixture with accurately labeled project status
- Real screenshot/media support and at least approved/available starter media
- `.env.example` without secrets
- Operational README, deployment instructions and admin guide
- Full route/feature verification checklist
- `docs/design-reference-audit.md`
- QA report with tested routes/breakpoints, measured scores or explicit unmeasured states

Read all accompanying `.md` documents and treat their acceptance criteria as part of this prompt. If running as a single pasted prompt, use `99_ALL_IN_ONE_BUILD_PROMPT.md` instead of this file alone.
