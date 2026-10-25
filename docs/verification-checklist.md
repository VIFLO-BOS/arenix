# Route & feature verification checklist

Status legend: ✅ verified working · 🟡 works with documented fallback / pending owner input · ⬜ future scope.

## Public routes

| Route | Renders (200, h1) | Distinct sections & motion | 250px | CTAs | Notes |
|---|---|---|---|---|---|
| `/` | ✅ | ✅ 12 sections (hero, showreel, company, services, work, showcase, industries, tech, process, trust, insights, CTA) | ✅ | ✅ Work / Start project | Trust section shows verified facts until testimonials are approved |
| `/about` | ✅ | ✅ | ✅ | ✅ | Team/milestones blocks say "published when verified" |
| `/services` | ✅ | ✅ indexed rows + sticky media | ✅ | ✅ | |
| `/services/[slug]` ×8 | ✅ SSG | ✅ 8 hero styles | ✅ | ✅ service-prefilled quote + booking | |
| `/work` | ✅ | ✅ filters, live region | ✅ | ✅ | 8 projects |
| `/work/[slug]` ×8 | ✅ SSG | ✅ Onart-style structure, gallery, lightbox, next project | ✅ | ✅ | Live link only for CleNest + Passion |
| `/solutions`, `/solutions/[slug]` ×6 | ✅ | ✅ tabs, capability badges | ✅ | ✅ | |
| `/technologies` | ✅ | ✅ filterable grid + SVG architecture | ✅ | ✅ | |
| `/process` | ✅ | ✅ sticky story panel | ✅ | ✅ | |
| `/insights`, `/insights/[slug]` | ✅ | ✅ featured, filters, TOC, progress | ✅ | ✅ | 1 published article (written by the team for this build) |
| `/lab` | ✅ | ✅ | ✅ | ✅ | netHuk honestly "in development" |
| `/careers` | ✅ | ✅ | ✅ | ✅ | "No current openings" state |
| `/contact` | ✅ | ✅ | ✅ | ✅ | Persists inquiry + lead, reference, emails (demo-log) |
| `/book-consultation` | ✅ | ✅ | ✅ | ✅ | 🟡 request-only until Cal.com configured |
| `/start-project` | ✅ | ✅ 3-step wizard | ✅ | ✅ | Attachments validated server-side |
| `/privacy`, `/terms` | ✅ | ✅ | ✅ | none | 🟡 Draft banner until legal review |
| `not-found`, `error`, `loading` | ✅ | ✅ | ✅ | ✅ | |
| `/sitemap.xml`, `/robots.txt` | ✅ | none | none | none | |

## Conversion & integrations

| Feature | Status | Evidence |
|---|---|---|
| Contact inquiry → DB (Inquiry + Client + Lead) → reference → emails → notification → audit | ✅ | e2e `ARX-INQ-…`; dev log `[email:demo]` |
| Project request with attachments | ✅ | manual; MIME/size/magic-byte checks in `start-project/actions.ts` |
| Consultation request (REQUESTED) | ✅ | e2e `ARX-BKG-…`, "not a confirmed appointment" |
| Staff confirm booking → confirmation email | ✅ | admin smoke booking detail; `transitionBooking` |
| Cal.com live booking + verified webhook | 🟡 | implemented (`/api/webhooks/calcom`, HMAC + idempotency); needs credentials |
| WhatsApp click-to-chat | 🟡 | implemented; hidden until official number configured; click events tracked |
| Resend email | 🟡 | outbox implemented; demo-log until key + verified domain |
| Rate limiting / honeypot / consent | ✅ | per-IP buckets; honeypot field; consent required |

## Dashboard

| Area | Status | Evidence |
|---|---|---|
| Invite-only auth, sessions, lockout, reset | ✅ | `/admin/login`, `/admin/invite/[token]`, `/admin/reset-password/[token]`; e2e redirect |
| RBAC (5 roles, server-enforced) | ✅ | `requirePermission` in every action; unit tests; denied attempts audited |
| Overview KPIs with ranges | ✅ | smoke |
| Inquiries queue, qualification, notes, assignment | ✅ | smoke + service |
| Leads table/board, activities, follow-ups, reminders | ✅ | smoke |
| Clients / organisations | ✅ | smoke (new + detail) |
| Bookings list/detail, transitions | ✅ | smoke |
| Proposals: versions, review/approve/send/accept | ✅ | smoke + unit totals |
| Internal projects, milestones, notes, ownership scope | ✅ | smoke |
| Portfolio editor + media gallery + publication approvals | ✅ | smoke (`/admin/portfolio/clenest`) |
| Content: services, solutions, technologies, articles, careers, testimonials, FAQs | ✅ | smoke FAQ create |
| Media library uploads (image sniffing, alt required) | ✅ | manual |
| Notifications + email delivery log + retry | ✅ | smoke |
| Analytics (real counts; traffic "not configured") | ✅ | smoke |
| Team invitations / roles / deactivation | ✅ | smoke |
| Settings (brand, contact, socials, booking, notifications, SEO, home, legal) | ✅ | smoke |
| Audit log | ✅ | smoke |
| Client portal `/portal` | ⬜ | future scope; role separation prepared |

## Engineering gates

Typecheck ✅ · Lint ✅ · Unit 27/27 ✅ · Build ✅ · E2E ✅ (see `docs/qa/qa-report.md`) · Responsive 176 checks, 0 overflow ✅ · Lighthouse ⬜ not measured yet.
