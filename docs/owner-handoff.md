# Owner hand-off: what is configured, what is pending, what is blocked

Status as of the initial build (2026-10-19). Nothing listed as pending is invented or faked on the site; each item has an honest fallback until the owner supplies it.

## Established and implemented

- Legal name **areniX Technologies Limited**, brand **areniX** (text wordmark with accent "X"; swappable for an official SVG in Settings → Brand).
- Public projects with live links and authentic screenshots: **CleNest** (https://www.clenest.site) and **Passion Nutrition Clinic** (https://passion-nutrition-clinic.vercel.app/). Captured pages: homepage, services, pricing/appointment, mobile homepage. Login, dashboard, account and tracking routes were excluded by rule.
- Live projects added 5 Nov 2026 from the owner's Vercel deployments, each with screenshots captured from the public pages: **ShopMe** (https://web-cyan-chi-9m3i15jvqi.vercel.app, demo store with checkout off), **LeadForge** (https://leadforge-ashy.vercel.app, marked In Development because its own README says Phase 1), **Khreeolife** (https://khreoolife.vercel.app), **Giles Financial Consulting** (https://gilesfc-preview.vercel.app, a static preview of the WordPress theme). **ArenoX LMS** (https://areno-x-pmlx.vercel.app), **Paylio Staff Management** (https://data-base-frontend-psi.vercel.app) and **Annotrix** (https://annotrix.vercel.app) moved to Live with their URLs. Paylio and Annotrix show only their public sign in screens.
- Further projects recorded with honest status: Paylio Dashboard (private, same platform as Paylio Staff Management), AreniX Branch Manager (completed, deployment unverified), netHuk (in development, no details published).
- Live GitHub activity section on the homepage (section 02) reading the VIFLO-BOS account through `GITHUB_TOKEN`. See the GitHub row below.
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
| Resend account + verified sender domain | `RESEND_API_KEY`, `EMAIL_FROM` | Emails stored as `DEMO_LOGGED`, printed to server log; dashboard shows demo banner. **Two step sign in also stays off in production until this is set**, and the dashboard shows a red notice |
| Scheduling provider (Cal.com) | `SCHEDULER_*` env + Settings → Booking | Honest "Request a consultation" flow (status REQUESTED); staff confirm manually |
| GitHub token for live activity | Fine grained token (All repositories, read only Metadata, Contents and Administration) in `GITHUB_TOKEN`, locally in `.env.local` and on Vercel under Project Settings → Environment Variables. Private repositories are named only when mapped in `src/config/github.ts` | Section hidden in production; a setup note shows in development |
| Paylio dashboard screenshots + client permission | Media → upload sanitised images → Portfolio → attach, tick Approved | Only the public sign in screen is shown |
| Branch Manager URL, status, screenshots | Portfolio editor | Case study lists confirmed capabilities only; no live link |
| netHuk description / features / release | Portfolio editor + Lab page copy | "In development, no public preview yet" |
| Team members, milestones, founding date | About page copy (code) or future CMS block | Dashed "published when verified" blocks |
| Client testimonials (approved wording) | Content → Testimonials (approve + publish) | Verified-facts cards instead of quotes |
| Case-study outcomes / metrics | Portfolio editor → Outcomes (verifiable statements only) | Qualitative capabilities only |
| Pricing / packages | Not published by design | Written, versioned proposals only |
| Privacy & Terms legal review | Settings → Legal (tick "reviewed") | **Draft, review before launch** banner shown |
| Error monitoring (e.g. Sentry) | Add SDK + DSN | Server logs + audit log only |
| Object storage for production media | `MEDIA_STORAGE_DRIVER=s3` + adapter | Local `public/uploads` (fine for a Node host with a persistent disk; ephemeral on Vercel) |

## Local source code noticed but NOT used

Sibling folders of this project (e.g. `staff-management-platform`, `payliocommercewithgit`) appear to contain related application code. They were **not** opened, captured or referenced: private systems need explicit owner approval and data sanitisation before any screenshot is published. When approved, run the apps locally, capture sanitised screens, upload via Media and attach to the Paylio case studies.

## Out of scope until approved

- Official WhatsApp Business Platform two-way messaging (requires Meta configuration and a privacy review).
- Payment collection or public fee display.
- Client portal (`/portal`), role separation is in place; UI not built.

## Lead research (AI)

All six phases of `docs/LEAD_GENERATION_ENHANCEMENT_PLAN.md` are built. The plan's "Build status" section lists what was tested and what was not.

**Using it**

| Step | Where |
|---|---|
| Find businesses | **Find leads** in the sidebar (`/admin/leads/discover`). Describe what you want, pick the AIs and sources, and press **Find businesses**. Results from every source land in one table with a **Found by** column. |
| Research one business | Open it from the table. **Research website** reads its site for free. **Write AI summary** costs a few US cents and adds a summary, a score adjustment and the research assistant's material. |
| Add to Leads | The button on each row or profile. If the business is already in Leads it offers **Open existing lead** or **Update research on existing lead** instead of creating a duplicate. |
| Outreach | Drafts are written from the profile. **Schedule** puts the first message under **Follow ups** for today. Each message opens in your own Gmail or WhatsApp with the text filled in. Press **I sent it** afterwards, and the next follow up is scheduled 4 and then 7 days later. **Reply received** stops the sequence. Nothing is ever sent by the system. |
| Opt outs | **Opt outs** tab, or **Record opt out** on a profile. The business's contact details are removed and it is never researched or contacted again. |
| Export | **Export CSV** above the table (needs the leads permission). Every export is in the audit log. |

**Keys and settings to add on Vercel** (Production, Sensitive). Only the first is needed to start.

| Variable | What it does | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude, the main AI | No AI search, summaries or drafts |
| `PAGESPEED_API_KEY` | Optional. Google PageSpeed Insights phone speed scores. The key is free, but Google Cloud asked for a $30 payment to set up an account, so the owner chose to leave it off on 18 November 2026 | The app measures speed itself instead (time to load, page weight, scripts and images, SEO and accessibility basics) and Claude explains the results. Every other website check still runs |
| `CRON_SECRET` | Lets the daily 05:00 UTC run in `vercel.json` finish leftover research and delete expired businesses. Any random text of 16 or more characters. | Research runs only right after a search starts or while a Find leads page is open, and nothing expires automatically |
| `COMPANIES_HOUSE_API_KEY` | Free key from the Companies House developer hub. Checks UK registration and searches UK companies. | UK registration stays Not checked |
| `GOOGLE_PLACES_API_KEY` | Google Maps confirms businesses the other sources found | Not used |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Extra AIs | Not used |
| `OVERPASS_URL` | Optional preferred OpenStreetMap Overpass server | Public servers are used |

**Rules built in**

- Google's Places policies allow place IDs to be stored but prohibit copying and saving business names and addresses. So Google Maps only confirms businesses found by another source, and its details are never stored.
- Nigeria's CAC has no public API. Each profile links to the CAC public search and has a form to record the result by hand.
- The crawler identifies itself as `areniXResearchBot`, obeys robots.txt, reads at most 8 pages a site with a pause between them, and stops when refused. Its public page is `/research-bot`.
- Businesses not added to Leads are deleted after 12 months (changeable in Lead research settings).

**Privacy policy text to paste.** The live privacy policy is stored in the database, so it does not change with the code. Paste this section at the end of the policy under Settings, Legal, and update "twelve months" if you change the retention period. Have it reviewed with the rest of the policy.

```markdown
## Business research

We look for businesses that might benefit from our services. To do this we read public sources such as business directories, map listings, company registries and the businesses' own websites, and we use AI services from Anthropic, Google and OpenAI to search and summarise that public information.

We keep the business name, its public contact details such as a general email address or phone number, its website and public facts about its online presence. Where a business's own website names its leaders, we may keep their names and job titles with a note of where we found them. We record the source and date of every detail.

The legal basis is our legitimate interest in offering our services to businesses. We never buy contact lists, never use information that is not public, and never send automated messages to these contacts. Any message comes from a member of our team and offers an easy way to say no.

Research about a business that does not become a client is deleted after twelve months. If you would like us to stop, tell us through the Contact page and include your website address. We will add it to our opt out list, delete what we hold, and not research or contact you again.

Our research tool identifies itself as areniXResearchBot and follows robots.txt. You can read more about it on the [research bot page](/research-bot).
```

**Settings and costs**

| Item | Detail |
|---|---|
| Where | Settings, then **Open lead research settings** (`/admin/settings/lead-research`). Needs the settings permission. |
| API keys | `ANTHROPIC_API_KEY` (Claude, in use), `GEMINI_API_KEY` and `OPENAI_API_KEY` (optional). Set them in `.env.local` and on Vercel as Sensitive. They are never stored in the database or shown in the admin. |
| Claude credit | The owner's Claude Ultra plan includes monthly API credit, linked to the areniX organization in the Claude Console. With no extra credit bought and auto reload off, usage stops when the credit runs out. |
| Budgets | Monthly total, a cap per provider and a limit for one search. Defaults are $15, $5 and $1. A request that would pass a cap is refused before it is sent. |
| Test | **Test providers** sends one tiny real request to each provider with a key and records the cost. Tick the web search box to test search as well. |
| Gemini and ChatGPT | Written from the official documentation and not yet tested with a live key. Run a provider test after adding a key and before switching either on. |
| Prices | Editable on the same page. A model can only be chosen once it has a price, so every request can be capped. |

## Sign in security

Dashboard sign in has two steps. After a correct email and password, a six digit code is emailed to the account and must be entered in the same browser within 10 minutes.

- Codes are random, stored only as a hash, single use, and tied to the browser that entered the password.
- Five wrong codes cancel the sign in and email the account owner. New codes are limited to one a minute and four per sign in.
- Six wrong passwords lock the account for 15 minutes. Attempt limits are stored in MongoDB so they hold on every Vercel instance.
- Every successful sign in emails the account owner. The email log keeps sign in emails with the code hidden.
- Email designs live in `src/lib/email-design.ts`. Exported copies for Resend are in `docs/email-templates/`.

To switch it on in production, create a Resend account with the admin email address, then set `RESEND_API_KEY`, `EMAIL_FROM="areniX <onboarding@resend.dev>"` and `ADMIN_NOTIFICATION_EMAIL` on Vercel and redeploy. Without a verified domain Resend only delivers to the address the Resend account was created with.

## Signing in to the dashboard

1. Make sure MongoDB is running and the site is up (`npm run dev`, or the production start command).
2. Open `/admin/login` on the site, for example `http://localhost:3100/admin/login` on this machine.
3. The first account is the super admin created by `npm run db:create-admin`. Its email is the `BOOTSTRAP_ADMIN_EMAIL` value in `.env.local` (`admin@arenix.local` locally) and its password is the `BOOTSTRAP_ADMIN_PASSWORD` value in the same file. Change that password after the first sign in through the forgot password flow, or invite your own account from Team and deactivate the bootstrap one.
4. Invite colleagues from Team. Each invitation is a single use link that expires after 72 hours. In demo email mode the link is shown on screen after you submit.

## Photography

Hero backdrops and section images are stock photographs from Unsplash chosen to match each topic. They are placeholders for your own photography. `docs/image-credits.md` lists every key, where it is used and how to replace a file. Portfolio cards never use stock imagery as if it were the product.
