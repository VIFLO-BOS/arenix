# Lead generation enhancement plan

Status: approved by the owner on 17 November 2026. All six phases are built. See the Phase 1 status and Build status sections near the end for what was tested, what was not, and where the build differs from this plan.
Prepared 9 November 2026. Prices and limits were read from the official provider pages on that date (sources at the end).

---

## 1. Summary for the owner

**What exists today.** The admin already has a Leads CRM: a pipeline table and board, a lead detail page with activities, follow ups, assignment and proposals. Leads are created automatically from the contact form, project requests and consultation bookings. There is no business discovery, no AI and no background job system yet.

**What this plan adds.** A **Find leads** view inside the existing Leads area (next to Table and Board). You describe what you want, for example "registered logistics companies in Lagos with no website", pick which AIs and data sources to use, see the estimated cost, and run it.

**One table for every AI.** Results from Gemini, ChatGPT, Claude, Google Maps and other sources all land in **one results table**. A **Found by** column shows which AI or source found each business. When two or more AIs find the same business it appears once, with every badge that found it (for example `Gemini` `Claude`), and you can filter the table by AI.

**Then.** Each business can be researched (website check, public contacts, decision makers, AI summary and lead score) and added to your existing Leads with one click. Duplicates are detected before anything is saved. Outreach messages are only ever drafts. Nothing is sent automatically.

**Cost.** Only Gemini has a real free API tier, and its free tier cannot search the web for the newest models. Claude and ChatGPT are pay as you go. Running all three at light use should cost roughly 10 to 20 US dollars a month, and the app will enforce hard spending caps that you set.

---

## 2. Are the Claude, ChatGPT and Gemini APIs free?

Important: **ChatGPT Plus, Claude Pro and Gemini app subscriptions do not include API access.** The API is billed separately on each provider's developer platform.

| Provider | Free API? | Cheap model price (per 1 million tokens, input / output) | Built in web search | Other notes |
|---|---|---|---|---|
| **Google Gemini** (AI Studio) | **Yes.** Free tier for Flash and Flash Lite models (Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash Lite, 3.1 Flash Lite). Google does not publish the daily limits; they are shown per project in AI Studio and are small. | Gemini 3.1 Flash Lite: $0.25 / $1.50. Gemini 3.8 Flash: $0.75 / $3.75 until 31 Dec 2026, then $1.50 / $7.50. | **Not available on the free tier** for Gemini 3 and newer. Paid projects get **5,000 free searches a month**, then $14 per 1,000, up to 1,500 a day. | Free tier prompts may be used to improve Google products. Paid tier prompts are not. |
| **Anthropic Claude** | **No free tier.** The pricing page says "New users receive a small amount of free credits to test the API" (amount not stated). | Claude Haiku 5.5: $0.10 / $0.50 (prompts up to 100,000 tokens). Claude Sonnet 5.5: $2 / $10. | $10 per 1,000 searches, and search results count as input tokens. Web fetch has no extra charge. | Batch API is 50% cheaper. |
| **OpenAI (ChatGPT models)** | **No free credits.** The pricing page lists none, so in practice you buy credits. $5 of purchases unlocks the first paid tier. | gpt-6-luna: $0.10 / $0.50. gpt-6.1-terra: $1 / $5. | $10 per 1,000 calls, plus search content tokens at model rates. | Batch prices are half the standard rates. |

**What this means for areniX**

1. **Free only is possible, but limited.** The free Gemini tier can analyse and summarise information we have already collected from real sources. On current models it cannot search the web, so asking it to "find companies" would make it answer from memory, which produces invented or out of date businesses. This plan never uses AI that way.
2. **Recommended start.** Enable billing on one Google Cloud project for Gemini, which gives 5,000 free grounded searches a month so you pay only for tokens. Google asks new users to prepay at least $5 of Gemini credit (the setup screen shows the exact minimum for your region). The credit expires after 12 months and is not refundable. With auto reload left off, Gemini can never spend more than the credit you loaded. Add $5 to $10 credit each to Claude and OpenAI. Set a monthly cap in the app, for example $15 in total.
3. **Free data sources carry most of the load.** Google Places has a monthly free allowance, and OpenStreetMap and PageSpeed Insights are free. The paid AIs are used where they add value: web research with citations, judgement, summaries and drafts.
4. **A Claude subscription can help, depending on the plan.** Claude Max, Ultra and Team plans include monthly Claude API credits: $100 on Max, $200 on Ultra, and $20 or $100 per Team seat (pooled, up to $500). They are claimed in claude.ai under Settings, Billing, API credits, by linking a Claude Console organization once the plan has been active for 7 days. The credits do not roll over, and API requests stop when they run out unless purchased credits exist. Free, Pro and Enterprise plans are not eligible. On those plans the app still needs a separately paid API key, because Anthropic does not allow claude.ai sign in to power other products. The support article does not say whether the web search fee is paid from these credits; the first test run will show it.

---

## 3. What exists today (inspection)

| Area | Finding |
|---|---|
| Leads UI | `src/app/admin/(dashboard)/leads/page.tsx` has a table view (search, status, assignee, pagination) and a board view by stage. `leads/[id]/page.tsx` shows the detail page, with client, activities, follow up and proposal link. |
| Lead model | `Lead` in `src/server/db/models/crm.ts`. Fields: title, status (NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, WON, LOST, ON_HOLD, ARCHIVED), priority, source, serviceCategory, clientId, organizationId, inquiryId, assignedTo, estimatedValue, currency (NGN), followUpAt, activities, statusHistory. |
| Related models | `Organization` (name, website, industry, notes), `Client` (name, email, phone, whatsapp, organizationId, jobTitle, preferredContact, tags, source, marketingConsent), `Inquiry` (creates a lead automatically). |
| Services | `src/server/services/crm.ts`: listLeads, leadsByStage, getLead, updateLead, addLeadActivity, dispatchDueFollowUps, upsertClient (matches an organisation by name), listClients. |
| Server actions | `src/app/admin/(dashboard)/actions.ts`, using the `FormState` pattern with zod validation. |
| Auth and permissions | Session auth with two step email codes. Role matrix in `src/server/auth/permissions.ts` (`leads:read`, `leads:write`, `settings:write` and others). Pages call `requirePermission`. |
| Supporting systems | Audit log (`recordAudit`), notifications (`notifyRoles`), email through Resend with stored copies, database rate limiting (`rateLimitDb`), and environment flags in `src/lib/env.ts` (`integrations`). |
| AI | None. |
| Background jobs | None. No queue or cron. The only external call pattern is `unstable_cache` in the GitHub integration. |
| Dependencies | mongoose, zod 4, resend, radix ui, lucide. Vitest and Playwright are available for tests. |
| Hosting | Vercel (deploys on push to main) with MongoDB Atlas. |

The plan extends these pieces. It does not create a second dashboard, a second CRM or a second lead database.

---

## 4. Honest limits and how the plan handles them

| Limit | Handling |
|---|---|
| AI models can invent businesses, people and email addresses. | Every AI result must include source links. The server fetches each link and checks that the business name really appears there. Results without a source are thrown away. Unconfirmed results are labelled **Unverified**. |
| Nigeria's Corporate Affairs Commission (CAC) has no official public API that we could find, and its search site blocks automated access. | We do not scrape it. The Registration column shows **Not checked**, with a one click link to the CAC public search so you can confirm by hand and record who checked and when. A paid verification provider can be added later. |
| UK Companies House | Official free API with a key. It can confirm registration automatically for UK companies. |
| Google Custom Search JSON API | Closed to new customers and shutting down on 1 January 2027, so it is not used. |
| Google Places terms | Place IDs may be stored indefinitely, but the terms say not to copy and save business names, addresses or reviews. So Google data is shown live, only the place ID is stored, and the business details we keep come from the business's own website and other sources. I will confirm the exact Service Specific Terms before Phase 2. |
| LinkedIn | No scraping and no logged in access. A LinkedIn URL is stored only when it is linked from the company's own website or appears on a cited public page. |
| No browser on Vercel | Mobile, speed, accessibility and SEO scores come from the Google PageSpeed Insights API, which is free with a key. |
| Privacy law | Named people's work contact details are personal data under the Nigeria Data Protection Act 2023 and UK GDPR. The plan adds source records, an opt out and suppression list, retention limits and an update to the privacy page. This is not legal advice. |

---

## 5. Where it lives in the admin

| Page | Purpose |
|---|---|
| `/admin/leads` | Gets a third switch next to Table and Board: **Find leads**. |
| `/admin/leads/discover` | Search form (free text plus structured filters), provider choice, cost estimate, and a list of past searches. |
| `/admin/leads/discover/[searchId]` | Live progress and the unified results table. |
| `/admin/leads/prospects/[id]` | Research profile for one business, with the AI research assistant. |
| `/admin/settings` | New **Lead research** section: providers on or off, model per task, budgets, crawl limits and scoring weights. API keys are never shown, only "configured" or "not configured". |
| `/admin/leads/[id]` | Gets a **Research** card when the lead came from prospecting. |

**Permissions.** A new `prospecting:run` permission (starting searches spends money) is given to SUPER_ADMIN, ADMIN and BUSINESS_DEVELOPMENT. Viewing uses `leads:read`, adding to Leads uses `leads:write`, and provider settings use `settings:write`.

---

## 6. The unified results table

All providers write into one table. One row is one business.

| Column | Content |
|---|---|
| Select | Checkbox for bulk actions |
| Business name | Official or trading name |
| **Found by** | Badges for every AI or source that found it: `Gemini` `ChatGPT` `Claude` `Google Maps` `OpenStreetMap` `Companies House` `Manual` |
| Industry | Business category |
| Location | Country, state and city |
| Registration | Registry, number and status (Verified, Not checked, Not found) |
| Website | Official website link |
| Website status | HAS_WEBSITE, OUTDATED_WEBSITE, BROKEN_WEBSITE, NO_WEBSITE_FOUND, WEBSITE_STATUS_UNKNOWN |
| Decision maker | Name of the CEO, founder or relevant manager |
| Job title | Their position |
| Email | Public business email |
| Phone | Official business number |
| WhatsApp | Published WhatsApp business number |
| LinkedIn | Profile link (only from cited public pages) |
| Lead score | 0 to 100 with its band |
| Opportunity | One line describing the opportunity |
| Verification | Verified, Partly verified or Unverified |
| Source | Links to where the data came from |
| Actions | View, Research, Add to Leads, Dismiss |

**Merging.** Rows are merged when they share a website domain, a phone number in international format, a Google place ID or a registry number, or when the name and city closely match. Merged rows keep every **Found by** badge. Agreement between independent AIs is shown as a confidence signal, but it does not raise the lead score.

**Features.** Search, filters (Found by, website status, score band, verification, location, industry), sorting, server side pagination, bulk select (research, add to Leads, export, dismiss), column visibility remembered per user, an **Already in Leads** badge, a preview drawer and research status chips.

**Export.** CSV with UTF 8 encoding, which Excel opens directly. A true `.xlsx` file needs one small library and is optional.

**Per field sources.** Hovering over an email, phone or name shows where it came from and when it was seen.

---

## 7. Data model (additive only, no destructive migration)

**New collections**

| Collection | Main fields |
|---|---|
| `ProspectSearch` | query text, parsed filters, chosen providers, status, progress counts, estimated and actual cost, createdBy, cancelRequested, queryHash (prevents duplicate searches), errors |
| `Prospect` | name, normalisedName, domain, location (country, region, city), industry, size hint, registration (registry, number, status, checkedBy, checkedAt), website (url, status, evidence list, audit results, checkedAt), contacts list (kind, value, verification, sourceUrl, seenAt), people list (name, title, linkedinUrl, sourceUrl, verification, seenAt), socials, hiring signals, technology hints, foundBy list (provider, searchId, sourceUrls, at), googlePlaceId, osmId, score (value, band, breakdown, aiAdjustment, reasons, scoredAt), summary (facts, observations, opportunities, services, outreach strategy, model, generatedAt), leadId, dismissedAt, lastResearchedAt |
| `ResearchTask` | type (discover, verify, crawl, audit, enrich, analyse), searchId, prospectId, status, attempts, lockedUntil, runAfter, error |
| `OutreachDraft` | prospectId, channel (email, LinkedIn, WhatsApp), subject, body, model, createdBy, status (DRAFT, APPROVED, ARCHIVED) |
| `ApiUsage` | provider, model, feature, input tokens, output tokens, search calls, estimated cost in USD, success or error, searchId, prospectId, userId, at |
| `Suppression` | hashed domain, email or phone, reason, addedBy, at |

**Additive fields on existing models**

- `Organization`: `domain` (indexed, used for duplicate checks), `country`, `city`, `phone`, `prospectId`.
- `Lead`: `prospectId`. Prospecting leads use `source: "prospecting"`.

**Add to Leads flow**

1. Check for an existing Organization by domain, phone or name, and for an existing Lead linked to that organisation or prospect.
2. If one exists, show it and offer **Open existing lead** or **Update research on existing lead**. No duplicate is created.
3. If none exists, create the Organization, a Client for the decision maker when one is verified, and a Lead with status NEW, a priority taken from the score band, a SYSTEM activity linking the research profile, and an audit entry.
4. The existing pipeline, statuses, notes, assignment, follow ups and proposals then work unchanged.

---

## 8. AI provider layer (`src/server/ai/`)

- **One interface** for every provider: `generate({ task, system, input, schema, webSearch, maxOutputTokens })` returns structured data, usage and source links.
- **Adapters** for Claude, Gemini and OpenAI. Claude uses the official Anthropic SDK, which handles retries and typed errors. Gemini and OpenAI are called over plain `fetch`, so only one SDK is added.
- **Configuration.** Keys come from environment variables (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). The model for each task is chosen in settings, so nothing is hard coded to one provider or one model.
- **Structured output.** Every response is checked against a zod schema (zod 4 can produce JSON Schema). Invalid output is retried once, then marked failed.
- **Reliability.** Timeouts, retries with backoff on rate limit and server errors, and a short pause for a provider after repeated failures.
- **Budget guard.** Before every call the estimated cost is checked against the remaining monthly cap for that provider and in total. If it would go over, the call is refused. It never silently overspends.
- **Fallbacks.** You set the order. The app only falls back to providers that are enabled, under their cap and marked "allowed as fallback". It never switches to a more expensive provider unless you allow it.
- **Price table.** Stored in settings so it can be updated when prices change.
- **Free tier guard.** When Gemini runs on the free tier, only public web data is sent to it, never CRM notes or client details.

**AI is used only for:** web research with citations, turning your free text request into filters, qualification and score adjustment, summaries, assistant answers and drafts.

**Plain code (no AI) is used for:** HTML parsing, extracting emails, phones, WhatsApp links and social links, structured data (JSON LD), robots.txt, website checks, duplicate detection and the base score.

---

## 9. Discovery sources (pluggable)

Every source implements the same small interface (`id`, `label`, `kind`, `isConfigured`, `search`), so new sources can be added without rewriting the feature.

| Source | Kind | Cost | Phase |
|---|---|---|---|
| Gemini with Google Search grounding | AI web research | 5,000 searches a month free on a paid project, then $14 per 1,000, plus tokens | 2 |
| Claude with web search | AI web research | $10 per 1,000 searches plus tokens | 2 |
| ChatGPT models with web search | AI web research | $10 per 1,000 calls plus tokens | 2 |
| Google Places Text Search | Business directory | 1,000 free a month with website and phone fields, then $35 per 1,000 | 2 |
| OpenStreetMap (Overpass) | Open map data | Free, with attribution and fair use limits | 2 |
| UK Companies House | Official registry | Free with an API key | 5 |
| Nigeria CAC | Official registry | Manual check link only (no public API found) | 5 |
| Paid B2B enrichment (for example Hunter or Apollo) | Contact data | Paid, after reviewing their terms | 5, optional |

**How an AI search works.** All selected AIs get the same instructions: return businesses that match the filters, with name, city, website if any, source links and a short piece of evidence, and do not guess. The server then fetches each source link (respecting robots.txt) and checks that the business really appears there before marking the row verified.

---

## 10. Website research engine

- **Crawler.** Runs on the server with `fetch`. It respects robots.txt and stays on the business's own site.
- **Priority pages.** About, services, products, contact, team or leadership, careers, pricing and solutions, found by link text and URL patterns.
- **Default limits** (all configurable):

  | Setting | Default |
  |---|---|
  | Depth | 2 |
  | Pages per site | 8 |
  | Timeout per page | 10 seconds |
  | Retries | 2 |
  | Delay between requests to the same site | 1 second |
  | Page size | 2 MB |

- **Identity.** The crawler uses a clear user agent that links to a page explaining it and how to opt out.
- **Boundaries.** No login, CAPTCHA, paywall or anti bot bypass. It stops on 401, 403 and 429 responses.
- **Extraction.**
  - Business identity: names (site name, JSON LD Organization) and the description.
  - Offering: services and products.
  - Contacts: emails, phones and WhatsApp links, taken only from the business's own pages and normalised with the country code. Also social profiles.
  - People: leadership names and titles.
  - Signals: careers and hiring notices, and technology hints such as the CMS, site builder and old libraries.
- **Quality checks.**
  - HTTPS and redirects.
  - Mobile viewport.
  - Broken internal links (a sample of up to 20).
  - PageSpeed Insights mobile scores for performance, accessibility, best practices and SEO.
  - Copyright year, page weight and outdated technology signals.
- **New dependency.** One small HTML parser (for example `node-html-parser`). This is the only new dependency proposed, apart from the optional Excel library.

---

## 11. Website status rules

| Status | Rule (evidence is stored for every decision) |
|---|---|
| HAS_WEBSITE | The site is reachable and its content matches the business. |
| OUTDATED_WEBSITE | The site is reachable and shows at least two of these: no mobile viewport, no HTTPS, a copyright year more than 3 years old, a PageSpeed mobile performance score below 40, legacy technology. |
| BROKEN_WEBSITE | A known domain fails on two checks at least an hour apart (DNS failure, server error, SSL error or a parked domain). |
| NO_WEBSITE_FOUND | At least two independent sources were checked and none lists a website (for example, Google Places has no website field, and AI web research with citations found none). |
| WEBSITE_STATUS_UNKNOWN | There is not enough evidence for any of the above. |

A single empty search result never produces NO_WEBSITE_FOUND. Businesses without websites stay in the table and can still be qualified.

---

## 12. Lead score (explainable, 0 to 100)

**Base score.** Calculated by plain code from weights you can change in settings:

| Signal | Default weight |
|---|---|
| Website need (no website, outdated or broken) | up to 30 |
| Industry fit with areniX target industries | up to 20 |
| Size signals (branches, staff, hiring) | up to 15 |
| Reachability (verified business email, phone or WhatsApp) | up to 15 |
| Decision maker identified | up to 10 |
| Hiring for technology or operations roles | up to 10 |

**AI adjustment.** The AI can adjust the base score by between minus 10 and plus 10. Every reason it gives must point to stored evidence. Reasons without evidence are discarded, so the AI cannot invent problems to push a score up.

**Bands.**

| Score | Band |
|---|---|
| 80 to 100 | High priority |
| 60 to 79 | Qualified |
| 40 to 59 | Potential |
| 0 to 39 | Low priority |

**Explanation.** The profile shows every part of the score.

**Research summary.** Covers the eight points in the brief: what the company does, its digital presence, website and technology issues, likely challenges, software opportunities, which areniX services fit (taken from `src/content/services.ts`), why it is worth approaching, and a suggested outreach approach. The summary is split into **Verified facts** (with sources), **AI observations** and **Assumptions**, each labelled.

---

## 13. Research profile and assistant

**Profile.** Shows the company overview, registration, website analysis, products and services, public contacts, decision makers, socials, technology notes, hiring, opportunities, the AI summary, sources with verification history, and the score with its explanation.

**Assistant.** Preset questions:

- What does this company do?
- Who should we contact?
- What areniX services fit?
- What problems are visible in its digital presence?
- Why is it a good prospect?
- Draft an introduction.
- Draft an email.
- Draft a LinkedIn message.
- Draft a WhatsApp message.

**How it answers.** Only from the stored research. When something is missing it says "not found in the research".

**Drafts.** Every message is saved as an `OutreachDraft` for you to review, edit and copy.

**Follow ups.** These work differently for the two kinds of lead.

| Lead type | What the system does |
|---|---|
| **Inbound** (they contacted areniX through the website or a booking) | The AI drafts follow ups for the enquiry. These may be sent automatically through Resend once a sending domain is verified, at most 2 per lead, and they stop as soon as the lead's status changes or someone logs an activity. |
| **Discovered** (found by the lead generator) | The AI drafts the first message and up to 2 follow ups and schedules them. On the due date the app lists them under "Follow ups due today", and each one opens ready to send in Gmail or WhatsApp with the text filled in. A person presses send. A reply, an opt out or a status change stops the sequence. |

Discovered leads are never emailed through Resend. Resend's acceptable use policy prohibits "unsolicited messages of any kind, including cold outreach, purchased lists, or scraped contact data", and it can shut an account down without warning. The same Resend account sends the admin sign in codes and the website form emails, so losing it would break the site. WhatsApp business messaging requires the recipient's opt in, and LinkedIn does not allow automated messaging, so those channels stay manual too. If fully automatic cold email is wanted later, it needs a dedicated cold email service on a separate domain, a lawful basis under NDPA and UK rules, and an opt out in every message. That is a separate decision.

---

## 14. Background processing

- **Task queue in MongoDB** (`ResearchTask`).
  - Each task holds a lease, so two workers never process the same task.
  - Failed tasks retry with backoff.
  - Tasks end in one of four states: done, failed, cancelled or skipped.
- **Worker.** An admin only route processes tasks for about 40 seconds at a time, which keeps each run inside Vercel's function time limit.
- **Triggers.**
  - Next.js `after()` starts work as soon as a search is created.
  - The open results page asks for more work every few seconds while tasks remain.
  - An optional daily Vercel cron resumes anything left over.
- **Duplicate prevention.** The same query with the same providers within 24 hours reopens the earlier search, unless you choose **Refresh**.
- **Caching.**

  | What | Reused for |
  |---|---|
  | Crawl results per domain | 30 days |
  | PageSpeed results | 30 days |
  | AI analysis | Until its inputs change |
  | Discovery results | 24 hours |

- **Cancel and history.** A search can be cancelled at any time, and the search list keeps its full history.
- **Later.** If volume grows, the same interface can move to a hosted queue such as Upstash QStash or Inngest. No new paid infrastructure is needed now.

---

## 15. Cost and usage control

**Ledger.** Every AI call, search call, Places request, PageSpeed call and crawled page is written to `ApiUsage` with its estimated cost.

**Default limits** (you change them in settings):

| Limit | Default |
|---|---|
| Monthly cap, all providers | $15 |
| Monthly cap per provider | $5 |
| Cap per search | $1 |
| Pages crawled per day | 500 |
| Google Places requests per month | 1,000 (stays inside the free allowance) |

**Before a search runs.** The estimated cost is shown. If it exceeds the remaining budget, the search is blocked with a clear message.

**Usage panel.** Shows for each provider, month to date: requests, tokens, searches, estimated cost, failures and remaining budget. Provider quota is recorded from rate limit responses where the provider exposes it. None of the three providers offers a reliable "remaining balance" API, so the app tracks your caps itself.

**Rough cost of one search for about 50 businesses** (estimates from the 9 November 2026 prices; real numbers are measured in Phase 1):

| Step | Approximate cost |
|---|---|
| Discovery with Gemini (inside the 5,000 free searches) | about $0.01 in tokens |
| Discovery with Claude Haiku 5.5 (about 6 searches) | about $0.07 |
| Discovery with gpt-6-luna (about 6 searches) | about $0.07 |
| Google Places (3 requests) | $0 inside the free allowance |
| PageSpeed and crawling | $0 |
| AI analysis of 50 businesses with a small model | about $0.10 to $0.25 |
| **Total with all three AIs** | **about $0.25 to $0.40** |

---

## 16. Security and data quality

**Keys.** Stored only in Vercel environment variables marked sensitive. They are never stored in the database or sent to the browser.

**Validation and access.** zod validation on the server for every input, permission checks on every page and action, and `rateLimitDb` limits on search creation and exports.

**Audit.** The log records searches, additions to Leads, exports, deletions and settings changes.

**Crawler safety.** It only fetches public addresses: private and internal IP ranges and cloud metadata addresses are blocked after the DNS lookup. Only http and https on ports 80 and 443 are allowed, and it has size and time limits. It never runs page scripts.

**Prompt injection.** Website text is treated as data. AI output must match a schema, and the AI cannot trigger any action apart from web search.

**Freshness.** Every important data point stores its source URL and the date it was seen. Data older than 90 days is marked stale.

**Retention and opt out.**

- Prospects not added to Leads and untouched for 12 months are deleted automatically. The period is configurable.
- You can delete any prospect by hand.
- The suppression list is checked before contacts are stored and before any draft is created.
- An opt out request adds the business to the suppression list.

**Exports.** Allowed only for users with `leads:write`, and every export is audit logged.

---

## 17. Testing

- **Unit tests (Vitest)** cover:
  - Normalisers.
  - Merging and duplicate detection.
  - Scoring.
  - Website status rules.
  - The robots.txt parser.
  - Extractors, run on saved HTML fixtures. The fixtures are test inputs only and are never shown in the app.
  - The budget guard.
  - The crawler's address blocking.
- **Provider adapters.** Tested with recorded responses, plus a small live smoke test for each provider once real keys exist. The cost of each smoke test is logged.
- **Playwright.** Find leads flow, Add to Leads, the duplicate prompt, permissions (a content manager cannot see the feature), and layout from 250 to 1920 pixels wide.
- **Existing checks.** `tsc`, eslint, `scripts/qa/syntax-check.mjs`, `next build` and `qa:responsive`.
- **Reporting.** Results are reported as they actually ran. Nothing is claimed as tested unless it was run.

---

## 18. Phases

Each phase ends with checks and your review before the next starts.

| Phase | Delivers | You will see |
|---|---|---|
| 1. Foundations | New models and fields, `prospecting:run` permission, Lead research settings, AI layer for Gemini, Claude and OpenAI, usage ledger and caps, task queue | A **Test providers** button that shows each AI responding and the cost recorded |
| 2. Discovery and the unified table | AI web research from all three AIs, Google Places, OpenStreetMap, source checking, merging with the **Found by** column, duplicate check against the CRM, **Add to Leads**, CSV export | Real searches, with every AI's results in one table |
| 3. Website research | Crawler, extraction of contacts and people, PageSpeed checks, website status rules | Website status and public contacts filled in, with sources |
| 4. AI qualification | Lead score with explanation, research summary, profile page, assistant, outreach drafts | Ranked prospects and draft messages |
| 5. Registries and compliance | Companies House, CAC manual check, optional paid enrichment, suppression list, retention, privacy page update | Registration column and opt out handling |
| 6. Hardening | Full tests, usage panel polish, handoff notes | A finished, documented feature |

---

## Phase 1 status (built 17 November 2026)

**Delivered**

| Item | Where |
|---|---|
| New collections for settings, usage, tasks, searches, prospects, drafts and opt outs | `src/server/db/models/research.ts` |
| Additive fields on Organization (`domain`, `country`, `city`, `phone`, `prospectId`) and Lead (`prospectId`) | `src/server/db/models/crm.ts` |
| `prospecting:run` permission for super admin, admin and business development | `src/server/auth/permissions.ts` |
| AI layer with one entry point, `generate()`, structured answers checked against a schema, one retry on a bad answer, fallback only to providers the owner allows | `src/server/ai/` |
| Claude adapter, tested against the live API including web search | `src/server/ai/providers/anthropic.ts` |
| Gemini and OpenAI adapters, written from the official documentation and **not yet tested live** because no key exists | `src/server/ai/providers/` |
| Usage ledger and budget guard (monthly total, per provider, per search) | `src/server/ai/usage.ts`, `src/server/ai/budget.ts` |
| Background task queue with leases, retries, dedupe and cancel | `src/server/research/queue.ts` |
| Admin page with provider settings, models per task, budgets, prices, a **Test providers** button and usage tables | Settings, Lead research (`/admin/settings/lead-research`) |

**Measured on the live Claude API** (Claude Opus 5.5, 17 November 2026)

| Request | Tokens in and out | Searches | Time | Cost |
|---|---|---|---|---|
| Connection test, structured answer | 270 and 21 | 0 | 2.4 seconds | $0.0015 |
| One web search with a structured answer | about 18,000 and 200 | 1 | about 11 seconds | about $0.09 |

A web search request is dominated by the search results that come back as input tokens, so a discovery search with several web searches will cost more than the first estimate in section 15. Phase 2 measures this on real searches and tunes the model choice and the limits before any volume is run.

**Choices made while building**

- **Refusal fallback.** When Claude's safety checks decline a request, the API may rerun it on the model Anthropic recommends for that case, billed at that model's price. This is switched on for the Claude models that support it, and the ledger records which model answered.
- **Worker route.** The route that runs the task queue, and its triggers, arrive in Phase 2 with the first real job. Phase 1 ships the queue itself with its tests, and no endpoint that does nothing.
- **Settings.** Crawl limits and scoring weights are added to the settings page in Phases 3 and 4, when the code that reads them exists.
- **Gemini.** Google's documentation now centres on its Interactions API, so the Gemini adapter uses that.
- **Search caps.** Claude accepts a hard cap on searches per request. The Gemini and OpenAI documentation read for this build shows no such cap, so their cost estimates assume the number asked for.

**Checks run**

- Type check, lint and the project syntax check pass. Lint shows one warning that existed before.
- 109 unit tests pass, 82 of them new. The queue tests run against a real local MongoDB in their own test database.
- Production build passes.
- In a browser against the local database: the page loads with no console errors and no sideways scrolling at 250, 390 and 768 pixels wide, settings save, invalid input is refused, a live provider test with web search succeeds and is recorded, and a request is refused when the budget is below what has been spent.

**Still to do before the live site can use it**

1. Add `ANTHROPIC_API_KEY` to the Vercel project (Production, Sensitive).
2. Deploy, then run **Test providers** on the live admin.

---

## Build status, Phases 2 to 6 (built 17 November 2026)

**Delivered**

| Phase | Item | Where |
|---|---|---|
| 2 | Find leads search page with free text and structured filters, source choice, cost estimate per AI, budget checks before anything runs, and reuse of the same search within 24 hours | `/admin/leads/discover`, `src/server/research/service.ts` |
| 2 | AI discovery with web search. Results without a source page from the AI's own search are dropped, and the remaining source pages are fetched to confirm the business appears there | `src/server/research/ai-discovery.ts`, verify task in `pipeline.ts` |
| 2 | OpenStreetMap, Google Places and Companies House clients | `src/server/research/sources/` |
| 2 | Merging by domain, phone, place id, map id, registry number or close name in the same city, with every Found by badge kept | `merge.ts`, `store.ts` |
| 2 | Unified results table with Found by, filters, sorting, paging, bulk actions, remembered columns, preview drawer, Already in Leads badge and source hover text | `src/components/admin/research/prospect-table.tsx` |
| 2 | Add to Leads with duplicate detection (research link, domain, phone, name, client email or phone) and the choice to open or update the existing lead | `addToLeads` in `service.ts` |
| 2 | CSV export (UTF 8 with a byte order mark, formula cells neutralised, audit logged, rate limited) | `/api/research/export` |
| 2 | Background worker route, `after()` start, page polling and a daily Vercel cron | `/api/research/worker`, `vercel.json` |
| 3 | Polite crawler with robots.txt, public address checks after DNS, size and time limits, retries, delays and the broken link sample | `crawl.ts`, `safe-fetch.ts`, `net-guard.ts`, `robots.ts` |
| 3 | Extraction of emails, phones, WhatsApp, socials, people, hiring notices, services and technology from HTML with plain code | `extract.ts` |
| 3 | Website status rules with stored evidence, including the second check an hour later before calling a site broken | `website-status.ts` |
| 3 | PageSpeed Insights mobile scores | audit task in `pipeline.ts` |
| 4 | Explainable base score with weights from settings, and an AI adjustment limited to 10 points and to reasons that cite stored evidence | `score.ts` |
| 4 | Research profile, AI summary split into verified facts, observations and assumptions, assistant with preset questions, outreach drafts with two follow ups | `/admin/leads/prospects/[id]`, `ai-research.ts`, `evidence.ts` |
| 4 | Follow up sequence for discovered leads with Gmail and WhatsApp links, I sent it, Reply received and automatic stops | `/admin/leads/outreach` |
| 5 | Companies House matching, CAC manual check form, opt out list with hashed values, retention clean up, public research bot page and privacy text | `/admin/leads/opt-outs`, `/research-bot`, `src/content/misc.ts` |
| 6 | Crawl limits, scoring weights, target industries, countries and retention in settings, a Research card on lead pages, and tests | Settings, Lead research |

**Tested live on 17 November 2026** (local database, Claude Opus 5.5)

| What | Result |
|---|---|
| One search for courier and logistics companies in Ibadan, up to 10, with Claude | 10 businesses, 3 web searches, 46,611 input and 3,220 output tokens, 49 seconds, $0.28. 6 of 10 confirmed by fetching their source pages |
| Website research on the results | Sites crawled with robots.txt obeyed, contacts read with sources, one site with a DNS failure queued for its recheck an hour later |
| AI summary for one business | Written in about 45 seconds with every fact citing evidence ids. Score 40 (base 38, AI +2 with cited reasons) |
| Assistant question and an email draft with two follow ups | Answers cite evidence. Drafts follow the house style, offer an easy no thanks, and open in Gmail with the text filled in |
| Add to Leads, scheduling, export | Lead created with a Research card, first message listed as due today, CSV downloaded with all rows |
| Every new page | No console errors and no sideways scrolling at 250 and 390 pixels |

**Not verified, or different from this plan**

- **OpenStreetMap** could not be reached from the development computer (the Overpass servers answered 406 and 502 or timed out). The client is unit tested, and the app now tries three public Overpass servers in turn. Run one search with it on the live site to confirm.
- **Gemini and ChatGPT** are still untested with live keys.
- **PageSpeed** runs only when `PAGESPEED_API_KEY` is set. Google's keyless quota was already used up when tested, and on 18 November 2026 the owner chose not to set up Google Cloud (it asked for a $30 payment). Instead the crawler measures each home page itself: time to arrive, HTML size, compression, the number of scripts, stylesheets and images, an estimated total weight from a sample of asset sizes (HEAD requests only), and SEO and accessibility basics (title, description, main headings, page language, images without alt text). A page slower than 5 seconds or heavier than 5 MB counts as one outdated signal in place of the PageSpeed score. Claude reads these measurements through the evidence pack. Measured from a server abroad, so they are a rough guide rather than a phone lab test. Tested on the areniX live site on 18 November 2026 (1.1 seconds, about 3.9 MB, all basics present).
- **Google Maps** only confirms businesses that another source found, because Google's Places policies prohibit saving business names and addresses. It adds its badge, the place id and the "lists no website" signal. Not tested live (no key).
- **Companies House** is unit tested only (no key).
- **Automatic follow ups for inbound leads** (section 13) are not built. They need a verified sending domain and a separate decision. Discovered leads use the assisted sequence.
- **Paid enrichment** (Hunter, Apollo) is not built. It was optional and needs a terms review.
- **Playwright** checks were run as scripts against the local app rather than added to the end to end suite.
- **Name matching** accepts the name without a branch or city, so "Bright Path Ibadan" matches a site that says "Bright Path". Names made only of generic words never confirm anything. This was found and fixed during the live test.

---

## 19. Decisions needed from you

1. **Providers to switch on first.** The owner is on Claude Ultra (confirmed 17 November 2026 from the claim screen), so Claude is the main AI, paid from the $200 monthly Ultra API credit. Google Places and PageSpeed are used for discovery and website checks. Gemini and OpenAI stay switched off until wanted; the provider layer supports them from Phase 1.
2. **Monthly budget cap.** Suggested $15 to start.
3. **Google Cloud project with billing.** Needed for the Places API and a PageSpeed key. The Gemini key can live in the same project.
4. **Target countries first.** For example Nigeria and the United Kingdom.
5. **Target industries** and the areniX services to lead with. The default is the current services list.
6. **Decision makers.** Is it OK to store named decision makers? If yes, the public privacy page will be updated to explain prospecting and how to opt out.
7. **Registration.** Must "registered" be confirmed by hand on CAC for Nigerian companies, or is best effort with a **Not checked** label acceptable?
8. **Claude models.** Default is Claude Opus 5.5 for every task. Roughly, $200 a month then covers about 2,200 businesses researched (about $0.30 per discovery search and $0.07 to $0.10 per business analysed). Using Claude Haiku 5.5 for the bulk scoring step would stretch the same credit to many thousands of businesses. Models are a setting, so this can change at any time.
9. **Follow ups.** Confirm the split in section 13: automatic follow ups for inbound leads only, and one click assisted sending for discovered leads.

---

## Sources (read 9 November 2026)

- Gemini pricing: https://aistudio.google.com/docs/pricing (redirected from https://ai.google.dev/gemini-api/docs/pricing)
- Gemini rate limits: https://aistudio.google.com/docs/rate-limits
- Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Claude rate limits: https://platform.claude.com/docs/en/api/rate-limits
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- OpenAI rate limits and usage tiers: https://developers.openai.com/api/docs/guides/rate-limits
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Places SKU details: https://developers.google.com/maps/billing-and-pricing/sku-details/places
- Places policies: https://developers.google.com/maps/documentation/places/web-service/policies
- PageSpeed Insights API: https://developers.google.com/speed/docs/insights/v5/get-started
- Custom Search JSON API (closed to new customers): https://developers.google.com/custom-search/v1/overview
- Companies House developer hub: https://developer.company-information.service.gov.uk/
- Corporate Affairs Commission: https://cac.gov.ng/
- Gemini billing: https://aistudio.google.com/docs/billing
- Claude subscriptions and API billing: https://support.claude.com/en/articles/9876003
- Monthly API credits for Max, Ultra and Team plans: https://support.claude.com/en/articles/17154008
- Claude Agent SDK note on claude.ai sign in: https://code.claude.com/docs/en/agent-sdk/overview
- Resend acceptable use policy: https://resend.com/legal/acceptable-use
