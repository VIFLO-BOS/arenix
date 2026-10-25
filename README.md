# areniX, website & business operating platform

Production codebase for **areniX Technologies Limited**: a cinematic public marketing site, an authentic portfolio with case studies, visitor conversion flows (contact, project request, consultation request, WhatsApp click-to-chat) and a protected business dashboard (inquiries, CRM leads, clients, bookings, proposals, projects, CMS, media, team, settings, audit).

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Styling / motion | Tailwind CSS v4 tokens · GSAP ScrollTrigger (scroll media) · Motion for React (component/route transitions) · CSS for hover |
| Database | **MongoDB Community Edition** via Mongoose 9 (`MONGODB_URI`), no Prisma/Postgres |
| Auth | Invitation-only, bcrypt passwords, DB-backed HTTP-only sessions, server-side RBAC (5 roles) |
| Email | Resend through an outbox (`EmailDispatch`); demo-log mode when no key |
| Booking | Request-only by default; optional Cal.com embed + verified webhook |
| Media | Local `public/uploads` driver (S3 adapter boundary documented) |
| Responsive | Verified from **250px** to 1920px |

## Quick start (local)

Prerequisites: Node 20.9+, MongoDB Community running on `127.0.0.1:27017` (Windows service `MongoDB`).

```bash
npm install
copy .env.example .env.local          # then edit AUTH_SECRET (32+ random chars)
npm run db:seed                       # loads the 8-project roster, services, solutions, FAQs, legal drafts
npm run db:create-admin               # first SUPER_ADMIN from BOOTSTRAP_ADMIN_* in .env.local
npm run dev                           # http://localhost:3000  ·  dashboard at /admin/login
```

Optional:

```bash
npm run screenshots        # Playwright captures of the two PUBLIC portfolio sites → public/screenshots
npm run qa:responsive      # 250 to 1920px overflow/console check → docs/qa/responsive-report.md
npm run test               # unit tests (Vitest)
npm run test:e2e           # Playwright e2e against the dev server
npm run typecheck && npm run lint && npm run build
```

## Project layout

```
src/app/(site)/…        public routes (home, about, services[/slug], work[/slug], solutions[/slug], technologies,
                        process, insights[/slug], lab, careers, contact, book-consultation, start-project, privacy, terms)
src/app/admin/…         (auth) login/invite/reset · (dashboard) all operational pages + actions.ts (server actions)
src/app/api/…           events (click analytics), webhooks/calcom
src/components/…        brand · layout · marketing · portfolio · motion · ui · forms · admin
src/server/db/models    Mongoose schemas (user/crm/cms/system)
src/server/services     inquiries, bookings, crm, proposals, projects, cms, team, email, notifications, audit, metrics
src/server/repositories content reads with fixture fallback (site never blanks if DB is down)
src/content/…           typed starter fixtures (seed source)
src/lib/…               validation (Zod), links, env, rate limiting, metadata
src/proxy.ts            /admin edge redirect (real auth is server-side)
scripts/…               seed, create-admin, capture-screenshots, responsive-check
docs/…                  architecture, deployment, admin guide, design audit, QA report, spec
```

## Honesty rules baked in

- Portfolio cards show an **authentic screenshot** or a clearly labelled “preview being prepared” placeholder, never a fake.
- `Visit Website` renders only when `liveUrl` is https **and** `isLiveUrlPublic` is approved.
- Booking without a provider is a **request** (status `REQUESTED`), never a fake confirmation.
- Email without `RESEND_API_KEY` is stored as `DEMO_LOGGED`, never reported as sent.
- WhatsApp is **click-to-chat only**; it does not sync messages to the CRM.
- No testimonials, metrics, awards, team members or locations are shown until entered and approved in the dashboard.

See `docs/` for architecture, deployment, the admin guide, the design-reference audit and the QA report.
