# QA report — initial build (2026-10-19)

Environment: Windows 11, Node 24.12, MongoDB Community 8.2 (local service), Next.js 16.4.2 dev server on `http://localhost:3100`, Playwright Chromium 1248. Database seeded with `npm run db:seed`; bootstrap admin created with `npm run db:create-admin`.

## Automated gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **Pass** (0 errors, ~40 s). Note: the first run exceeded 10 minutes / 4 GB because of Mongoose `InferSchemaType`; models were rewritten with explicit interfaces (`src/server/db/models/*`). |
| Lint | `npm run lint` | **Pass** (0 errors, 0 warnings after fixes for `react-hooks/set-state-in-effect`, impure render calls, unused vars). |
| Unit tests | `npm run test` | **Pass** — 27 tests in 5 files (links/WhatsApp URL, Zod form + admin schemas, RBAC matrix, markdown/utilities, proposal totals). |
| Production build | `npm run build` | **Pass** — all routes compiled; static prerender for marketing pages, SSG for `/services/[slug]`, `/solutions/[slug]`, `/work/[slug]`, `/insights/[slug]`; dynamic for forms, `/work`, admin, API. |
| E2E (Playwright) | `BASE_URL=http://localhost:3100 npm run test:e2e` | 54 scenarios (27 × desktop, 27 × 320px). First run 46/54 → root causes fixed (see below) → final subset 10/10 on the previously failing scenarios; full final run recorded in the table at the end of this file. |
| Admin smoke | `node scripts/qa/admin-smoke.mjs` | **Pass** — login, 25 dashboard routes render (200, h1, no error text), FAQ create + list refresh, booking detail, logout. |
| Responsive sweep | `npm run qa:responsive` | **Pass** — 22 routes × 8 widths (250, 320, 375, 430, 768, 1024, 1440, 1920) = 176 checks: 0 horizontal overflow, 0 load failures, h1 present on every 200 page. Only console messages: the expected 404 resource log on `/does-not-exist`. Full table: `docs/qa/responsive-report.md`. |
| Screenshots | `npm run screenshots` | 8 authentic captures (CleNest ×4: home, services, pricing, mobile; Passion Nutrition Clinic ×4: home, services, appointment, mobile), each visually reviewed; no login/dashboard/account pages, no personal data. Log: `docs/screenshot-log.md`. |

## Defects found and fixed during QA

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Hydration error on `/` ("script vs div") | Inline JSON-LD `<script>` lived inside a client `template.tsx` (Motion wrapper); React skips script nodes when hydrating | Template is now a server component with a CSS keyframe entrance (`.page-enter`) |
| 2 | Mobile menu never visible (Playwright "hidden") | `backdrop-filter` on the fixed header made it the containing block for the fixed overlay → zero height | Overlay rendered as a sibling of the header |
| 3 | Reduced-motion users saw empty space (contact aside, hero lead/CTAs) | `Reveal`/`Stagger`/`HeroCollage` branched on `useReducedMotion()`; server-rendered `opacity:0` styles were never patched after the hydration mismatch | Motion components now render visibly on the server and only animate below-fold elements after hydration; hero collage uses CSS keyframes |
| 4 | Contact form retry submitted stale values | React's post-action form reset raced with user input; hidden idempotency key also differed server/client | Forms remount per server response (`key={serial}`), idempotency key is set after hydration via a ref |
| 5 | Hero word "technology" broke mid-word at 1440px | `overflow-wrap: anywhere` + oversized display scale in a half-width column | Headings use `overflow-wrap: break-word`; home hero uses a column-aware clamp |
| 6 | Home lead paragraph empty | Seeded settings stored `""` which overrode defaults | Empty DB strings now fall back to defaults/env |
| 7 | Typecheck OOM | Mongoose schema type inference | Explicit document interfaces |
| 8 | `/work/nethuk` e2e false positive | Test counted a legitimate related-project live link | Assertion scoped to the project header |

## Manual test matrix (spec §06)

| Test | Result |
|---|---|
| Home at 250/320px | No overflow, readable hero, CTAs stack full-width, collage stacks, phone frame hidden <400px (verified in `docs/qa/visual-v2/n-home-top-250.png`) |
| Home at desktop | Split headline, layered authentic frames, indexed services rows with sticky media, selected work grid, showcase, industries tabs, marquee, process panel, trust, insights, CTA band (`docs/qa/visual-v2/home-1440.png`) |
| Mobile menu | Opens/closes, focus trap, Escape returns focus to trigger (e2e) |
| All public routes | 200 with h1 and unique `<title>` containing areniX (e2e, 19 routes); sitemap/robots served |
| Services detail | 8 distinct hero styles; quote/consultation CTAs pre-filled with the service (manual + build) |
| Work filters | Status/service/industry/search update the live region count (e2e) |
| Portfolio image/title | Opens `/work/[slug]`; browser back returns (e2e) |
| `View Case Study` | Internal route works for all 8 published projects (SSG at build) |
| `Visit Website` | Only CleNest and Passion Nutrition Clinic render it; https, `target=_blank`, `rel=noopener noreferrer` (e2e) |
| Screenshot gallery | Authentic captions, lightbox with arrows/Escape/swipe (manual) |
| Private Paylio / netHuk | Placeholder visuals labelled; no live link; "In development — no public link yet" (e2e) |
| WhatsApp button | Hidden until a number is configured (no number supplied); URL builder unit-tested |
| Contact submission | Server validation errors shown; persisted with `ARX-INQ-…` reference; ack + staff emails stored as DEMO_LOGGED (e2e + dev log) |
| Project request | 3-step wizard, attachments validated server-side (MIME, size, magic bytes); DB record + role notification (manual) |
| Consultation booking | Request-only mode: `ARX-BKG-…` saved as REQUESTED, explicit "not a confirmed appointment" (e2e); staff confirm from `/admin/bookings/[id]` (smoke) |
| Admin login | Invitation-only; unauthenticated `/admin` → `/admin/login` (e2e); lockout + rate limit in code |
| Lead state update | Persists with status history and audit (service + smoke routes) |
| Proposal | Version/state machine enforced (`services/proposals.ts`), approval/send permissions (unit RBAC tests) |
| CMS publish/unpublish | Publishing requires approval flag; `revalidatePath` on mutations (smoke FAQ create visible immediately) |
| Broken third-party service | Email provider absent → DEMO_LOGGED with banner; scheduler absent → request form; DB down → fixture fallback for marketing pages |
| Reduced motion | Verified with `reducedMotion: "reduce"` contexts after fix 3: all content visible |
| Keyboard-only | Menu, filters, gallery and dialogs have focus styles and key handlers (manual) |
| SEO | Unique titles/descriptions, canonical URLs, Organization/Breadcrumb/Article JSON-LD, sitemap, robots, `noindex` on admin |
| Production build | Pass |

## Not measured

- Lighthouse / Core Web Vitals scores were **not** measured in this run (no production host yet). Images use next/image with explicit sizes; fonts via next/font; heavy motion is lazy and reduced-motion aware. Run Lighthouse on the deployed URL and record results here.
- Email delivery, Cal.com webhooks and S3 storage are untested end-to-end because no credentials exist; their code paths are unit/structurally covered and fail visibly (not silently).

## Final e2e run

- Full suite after all fixes: **53 passed, 1 failed** (2.6 min). The single failure (desktop contact form) was caused by the per-IP form rate limit (5 submissions / 10 min) after several back-to-back runs from the same local IP — confirmed by `scripts/qa/rate-limit-ux.mjs`, which shows the 6th rapid submission is refused with a clear message while typed values are retained (correct behaviour).
- The forms spec now sends a unique `x-forwarded-for` per run; re-run of the form scenarios: **4/4 passed**. Combined with the full run, all 54 scenarios pass.
- Rate-limit UX check: `node scripts/qa/rate-limit-ux.mjs` → `RATE LIMIT UX OK`.

# QA report, redesign pass (2026-10-19, later the same day)

Scope of the pass requested by the owner. Smaller type, contained 1320px layout, slow smooth motion (Lenis, GSAP, Motion), software illustrations, navy and gold palette, Sheepman W03 and Amatry font slots, and copy free of em dashes, en dashes, colons, semicolons and hyphenated words.

## Incident during the pass

A bulk punctuation sweep script corrupted 94 source files (semicolons became periods, type annotations lost colons, Tailwind class strings lost hyphens, stray backticks appended). Recovery was done by rewriting the public pages and components by hand and repairing the admin area with a new per file syntax checker, `node scripts/qa/syntax-check.mjs src`. The script that caused the damage was deleted. See the memory note for the rule we now follow.

## Automated gates after the pass

| Gate | Result |
|---|---|
| Syntax check (`scripts/qa/syntax-check.mjs`) | 0 files with syntax errors out of 123 in `src/app`, `src/components`, `src/content` |
| Typecheck | Pass, 0 errors |
| Lint | Pass, 0 errors |
| Unit tests | Pass, 27 tests in 5 files (budget and timeline labels updated to "1 to 3 months" style) |
| Production build | Pass, same route set as before |
| Admin smoke | Pass, login, 25 dashboard routes, FAQ create, booking detail, logout |
| Responsive sweep | 22 routes at 8 widths. 0 horizontal overflow after fixing the industry tab list and three card header rows that overflowed at 250px and 320px. Only console messages are the expected 404 resource log on `/does-not-exist` |
| Rendered copy scan | Playwright scan of the body text of 15 public routes for dashes, semicolons, colons, ampersands and hyphenated words. All clean after re seeding the database with `npx tsx scripts/seed.ts --force` and updating the stored settings document |
| End to end | See the final line of this file |

## Visual review

Screenshots in `docs/qa/visual/` and the session scratchpad. Desktop hero headline measures about 60px, body text 16px, every section sits inside the 1320px container with equal gutters, hover and reveal timings are 0.55s to 1.4s, and the pages carry SVG illustrations of dashboards, code editors, phones, architecture and data flow alongside the authentic screenshots. The 250px home page and menu render without overflow.

## Owner inputs still needed

- Licensed WOFF2 files for Sheepman W03 and Amatry in `public/fonts/` (see the README there). Amatry could not be found from any public foundry, so please confirm the exact name or supply the files.
- Logo files and any brand guide beyond the navy and gold direction.

## Final end to end run after the redesign pass

- Full suite, both projects (desktop and 320px): **54 passed, 0 failed** (2.2 min), log kept in the session scratchpad.
- An earlier full run showed the two contact form scenarios failing while the same scenarios passed on their own. The per IP form rate limit (5 submissions in 10 minutes) was the most likely cause after back to back runs. Assertions updated for the renamed 404 heading ("This page is not here."), the live link label ("Visit clenest.site") and the consultation success message.

# QA report, aesthetic refresh (2026-10-19, evening)

Owner feedback. "The animation is fine but aesthetic is not given the modern day vibes." Motion was left untouched. The surface design was reworked.

## What changed

- Display face fallback moved from Archivo to Plus Jakarta Sans (tight tracking, weight 700). Interface text (navigation, buttons, labels, pills, tabs) uses the display slot. Body copy keeps the Amatry slot, which is installed locally on the owner's machine and therefore already renders there.
- One `card` primitive (glass, 1.5rem radius, inner highlight, gold glow on hover) replaced the thin bordered boxes across every public page. `pill` eyebrows with a gold dot replaced monospace index labels, and `num-chip` circles replaced monospace numbers.
- Floating glass pill header that blurs and gains a shadow once the page scrolls. Gold gradient accent buttons with a glow, glass secondary buttons, both lifting on hover.
- Gradient mesh glows (gold and blue) behind heroes, the CTA panel and the footer, a faint two tone gradient on all dark sections, and a masked dot grid behind the home hero. The CTA band is now a rounded panel inside the section.

## Defects found and fixed during the refresh

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Section headings below the fold never appeared after scrolling | `SplitLines` observed each translated line for visibility. A line parked outside its clipping mask has an intersection ratio of zero, so the reveal never fired | The heading element is observed with `useInView` and drives the line animation |
| 2 | Contact form test failed whenever two browsers submitted at once | Under load the server response is slow. Anything typed before the response arrived was wiped when the form remounted with the returned values, and React 19 also schedules its own post action form reset | Forms dispatch the action from `onSubmit` (no automatic reset), the idempotency key is re applied after every render, and all fields sit in a `fieldset` that is disabled while the submission is pending |
| 3 | Hero pill wrapped its index digits vertically at 250px | Flex child allowed to shrink | Index is `shrink-0 whitespace-nowrap` |

## Gates after the refresh

| Gate | Result |
|---|---|
| Syntax check, typecheck, lint | Pass |
| Responsive sweep, 22 routes at 8 widths | 0 overflow. Only the expected 404 console message on `/does-not-exist` |
| Visual spot checks (1440, 390, 320, 250) | 0 overflow, captured in `docs/qa/visual/` and the session scratchpad |
| Form scenarios, both projects | 4 of 4 pass |
| Full end to end suite | See the final line of this file |

## Final end to end run after the aesthetic refresh

- Full suite, both projects (desktop and 320px): **54 passed, 0 failed** (1.9 min).
- Admin smoke after the refresh: pass (login, 25 routes, FAQ create, booking detail, logout).
- Note for future runs. Editing source files while the suite runs triggers hot reloads that remount forms and produce false failures. Run the suite with no edits in flight.

# QA report, energy pass (2026-10-19, night)

Owner feedback. "Still very boring." Added the energy layer described in `docs/design-tokens.md` (aurora fields, kinetic marquee, gold accent phrases, gold surface, stacked sheets, cursor spotlight, trailing cursor, tilt, count up, rotating sectors, bento services). Two component bugs surfaced and were fixed. `SplitLines` measured line breaks by rewriting its own children, which crashed React once accent spans became children, so it now measures in a detached clone. `RotatingWords` overlapped the entering and exiting words on narrow screens, so it now reserves the width of the longest word and animates absolutely positioned spans.

| Gate | Result |
|---|---|
| Syntax check, typecheck, lint | Pass |
| Full end to end suite, both projects | 54 passed, 0 failed (1.8 min) |
| Responsive sweep, 22 routes at 8 widths | 0 overflow. Only the expected 404 console message |
| Visual spot checks (1440, 390, 320, 250) | 0 overflow, 0 console errors on the home page |
| Production build | See below |
| Admin smoke | See below |
- Production build: pass (46 static pages generated).
- Admin smoke: pass (login, 25 routes, FAQ create, booking detail, logout).

# QA report, photography pass (2026-10-20)

Owner feedback. Components held "blurry metrics" placeholder graphics instead of images, heroes should carry images as their background, and other sections should feature topic matched images. The owner also asked how to reach the dashboard (answered in `docs/owner-handoff.md`).

## What changed

- 44 Unsplash photographs (Unsplash License, free commercial use) downloaded once by `scripts/fetch-stock-images.mjs` into `public/images/stock/` as 1920px WebP (5.5 MB total). Keys, alt text and source IDs live in `src/content/images.ts`. Credits and replacement steps in `docs/image-credits.md`.
- `HeroBackdrop` behind every public hero (home, services, service detail, work, about, solutions, sector detail, technologies, process, contact, insights and article, lab, careers, booking, start project, privacy, terms) with a navy gradient so copy stays readable.
- `TopicImage` replaced the dashboard, code, chart, phone and data flow illustrations in the hero collage, CTA panel, showcase, industry switcher, process timeline, insights covers, service bento and rows, lab experiments and all page asides. The architecture diagram on the technologies page stays because it is a diagram, not decoration.
- The portfolio placeholder now shows a dimmed photograph labelled "Stock photograph, not the product", so honesty about screenshots is preserved.

## Gates

| Gate | Result |
|---|---|
| Syntax check, typecheck, lint | Pass, 0 warnings |
| Home page console errors | 0 |
| Full end to end suite | See below |
| Responsive sweep, build, admin smoke | See below |
- Full end to end suite: 52 of 54 passed on the first run (7.2 min, slow because the dev image optimiser was producing every photo for the first time). The two failures were the same scenario in both projects, the click from a portfolio card to its case study, which took 8.3 s on a cold compile against a 5 s assertion. The assertion now allows 20 s for the cold start and the portfolio scenarios pass 6 of 6. Warm navigation measures about 2.3 s including the route curtain.
- Responsive sweep: 0 overflow across 22 routes at 8 widths. Only the expected 404 console message.
- Production build: pass (46 static pages).
- Admin smoke: pass.

# Type change (2026-10-22)

Owner feedback. The font looked different from the first version, please use Roboto or Montserrat. Headings and interface text now use Montserrat and body copy uses Roboto, both self hosted through `next/font`. The Sheepman W03 and Amatry declarations were removed, including the `local()` lookups that had let a locally installed Amatry render body text on the owner's machine. Verified in the browser that headings, navigation and buttons resolve to Montserrat and paragraphs to Roboto. Typecheck and lint pass.

# Radix UI adoption (2026-10-23)

Owner request. The UI should use Radix UI. Interactive components were rebuilt on Radix primitives (accordion, tabs, dialog, select, checkbox, radio group, toggle group) with the existing styling. Verified in the browser that the Radix select writes to its hidden native select, the checkbox submits "on", the radio group submits the chosen consultation type and the preferred windows checkboxes submit their values. The filter test now targets the toggle group items by their radio role. Typecheck, lint and the targeted end to end scenarios (menu, filters, forms, portfolio) pass.
- Full end to end suite after the Radix conversion: 54 of 54 pass (2.3 min). Production build: pass. Admin smoke: pass, and it now deletes the FAQ it creates.

# Logo and brand colour (2026-10-23)

The owner supplied the logo as a 12600 by 9000 PNG. `scripts/build-brand-assets.mjs` measured the colours (navy #05035A, orange #FC8F2D), cropped the mark, converted the white background to transparency without dulling the solid colours, produced an off white variant for navy surfaces and isolated the X for the favicon, home screen icon and social preview. The accent token moved from gold to the logo orange so the X and the interface highlights match. Verified in the browser that the header, footer and dashboard login render the logo, that `/icon.png` and `/opengraph-image.png` resolve, and that the page head links the icons. Typecheck and lint pass.
- Full end to end suite after the logo change: 54 of 54 pass. Production build: pass. Logo enlarged in the header, login, dashboard shell and 404 page.

# Dashboard relayout (2026-10-25)

Owner feedback. "The dashboard is quite horrible, it should look like a window system layout." The admin area moved from the dark marketing styling to a light application window. Collapsible icon sidebar, breadcrumb top bar with search, notifications and an account menu, light grey workspace with white cards and clean tables, a light sign in screen, and a slide in drawer on phones. 33 admin pages were relit by replacing dark surface classes with slate equivalents. Generated lead titles and activity labels no longer use em dashes or middle dots. Verified by signing in and capturing the overview, inquiries, leads board, settings, portfolio and the phone drawer with zero console errors.
- Final gates after the dashboard relayout: typecheck, lint and unit tests pass, production build passes, admin smoke passes (25 routes, FAQ create, booking detail, sign out through the account menu), full end to end suite 54 of 54. Committed and pushed to the private repository.
