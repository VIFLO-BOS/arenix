# Owner hand-off: what is configured, what is pending, what is blocked

Status as of the initial build (2026-10-19). Nothing listed as pending is invented or faked on the site; each item has an honest fallback until the owner supplies it.

## Established and implemented

- Legal name **areniX Technologies Limited**, brand **areniX** (text wordmark with accent "X"; swappable for an official SVG in Settings → Brand).
- Public projects with live links and authentic screenshots: **CleNest** (https://www.clenest.site) and **Passion Nutrition Clinic** (https://passion-nutrition-clinic.vercel.app/). Captured pages: homepage, services, pricing/appointment, mobile homepage. Login, dashboard, account and tracking routes were excluded by rule.
- Six further projects recorded with honest status: Paylio Staff Management (private), Paylio Dashboard (private, same platform), ArenoX LMS (completed, URL pending), Annotrix (completed, URL pending), AreniX Branch Manager (completed, deployment unverified), netHuk (in development, no details published).
- MongoDB Community (local service) as the database; Mongoose models, seed and bootstrap scripts.
- Full public route set, dashboard, RBAC, CRM, proposals, projects, CMS, media, audit, notifications.

## Pending owner input (site behaviour until supplied)

| Needed | Where to set | Until then |
|---|---|---|
| Official logo (received 23 Oct 2026 as PNG, processed into `public/brand/`) and brand palette (orange taken from the logo) | Settings → Brand (`logoUrl`, `accentColor`); CSS token `--color-accent` | Text wordmark; navy and gold palette (`#06132A`, `#C9A227`) documented in `docs/design-tokens.md`; type is Montserrat and Roboto via next/font, no font files needed |
| Official WhatsApp business number | Settings → Contact or `NEXT_PUBLIC_WHATSAPP_E164_DIGITS` | **No WhatsApp buttons rendered anywhere** (never a borrowed/invented number) |
| Business email / phone / location | Settings → Contact | Hidden; contact page says "published once configured" |
| Social profile URLs | Settings → Socials (https only) | Hidden |
| Domain + hosting | `NEXT_PUBLIC_SITE_URL`, DNS | localhost / staging URL in metadata |
| Resend account + verified sender domain | `RESEND_API_KEY`, `EMAIL_FROM` | Emails stored as `DEMO_LOGGED`, printed to server log; dashboard shows demo banner |
| Scheduling provider (Cal.com) | `SCHEDULER_*` env + Settings → Booking | Honest "Request a consultation" flow (status REQUESTED); staff confirm manually |
| Paylio screenshots + client permission | Media → upload sanitised images → Portfolio → attach, tick Approved | Labelled "Private system — screenshots pending approval" placeholder |
| ArenoX LMS / Annotrix / Branch Manager URLs, status, screenshots | Portfolio editor | Case studies list confirmed capabilities only; no live link |
| netHuk description / features / release | Portfolio editor + Lab page copy | "In development — no public preview yet" |
| Team members, milestones, founding date | About page copy (code) or future CMS block | Dashed "published when verified" blocks |
| Client testimonials (approved wording) | Content → Testimonials (approve + publish) | Verified-facts cards instead of quotes |
| Case-study outcomes / metrics | Portfolio editor → Outcomes (verifiable statements only) | Qualitative capabilities only |
| Pricing / packages | Not published by design | Written, versioned proposals only |
| Privacy & Terms legal review | Settings → Legal (tick "reviewed") | **Draft — review before launch** banner shown |
| Error monitoring (e.g. Sentry) | Add SDK + DSN | Server logs + audit log only |
| Object storage for production media | `MEDIA_STORAGE_DRIVER=s3` + adapter | Local `public/uploads` (fine for a Node host with a persistent disk; ephemeral on Vercel) |

## Local source code noticed but NOT used

Sibling folders of this project (e.g. `staff-management-platform`, `payliocommercewithgit`) appear to contain related application code. They were **not** opened, captured or referenced: private systems need explicit owner approval and data sanitisation before any screenshot is published. When approved, run the apps locally, capture sanitised screens, upload via Media and attach to the Paylio case studies.

## Out of scope until approved

- Official WhatsApp Business Platform two-way messaging (requires Meta configuration and a privacy review).
- Payment collection or public fee display.
- Client portal (`/portal`) — role separation is in place; UI not built.

## Signing in to the dashboard

1. Make sure MongoDB is running and the site is up (`npm run dev`, or the production start command).
2. Open `/admin/login` on the site, for example `http://localhost:3100/admin/login` on this machine.
3. The first account is the super admin created by `npm run db:create-admin`. Its email is the `BOOTSTRAP_ADMIN_EMAIL` value in `.env.local` (`admin@arenix.local` locally) and its password is the `BOOTSTRAP_ADMIN_PASSWORD` value in the same file. Change that password after the first sign in through the forgot password flow, or invite your own account from Team and deactivate the bootstrap one.
4. Invite colleagues from Team. Each invitation is a single use link that expires after 72 hours. In demo email mode the link is shown on screen after you submit.

## Photography

Hero backdrops and section images are stock photographs from Unsplash chosen to match each topic. They are placeholders for your own photography. `docs/image-credits.md` lists every key, where it is used and how to replace a file. Portfolio cards never use stock imagery as if it were the product.
