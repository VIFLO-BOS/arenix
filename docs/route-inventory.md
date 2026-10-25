# Route inventory & page-by-page design audit

Columns: **section** · **composition inspiration** (reference principle) · **areniX treatment** · **entrance** · **scroll** · **hover/focus** · **mobile (250px+)** · **reduced motion** · **CTA destination** · **asset status**.

Legend for asset status: `authentic` = real screenshot captured by `npm run screenshots`; `placeholder` = labelled non-product visual until owner approval; `n/a` = no media.

## `/` Home

| # | Section | Inspiration | areniX treatment | Entrance | Scroll | Hover/focus | Mobile | Reduced motion | CTA | Assets |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | Hero | Visione bold type · Nexifye product frames | Split headline, layered browser+phone frames of CleNest / Passion, one accent flare, grain | Masked lines + staggered frames | Soft parallax on collage (≥768px) | Magnetic primary CTA (fine pointer) | Frames stack, phone hidden <400px | Static | /work · /start-project | authentic |
| 02 | Showreel | Visione cinematic media | Screenshot sequence with explicit prev/next, clip-path reveal | ScrollScale | Scrubbed clip/scale | Buttons | Full-width 16/10 | Static image | /work | authentic |
| 03 | Company preview | Monoform whitespace | Numbered editorial block + offset mobile screenshot | Reveal | Parallax image | none | Stacked | Static | /about | authentic |
| 04 | Services preview | Altreex/Monoform indexed rows | 8 numbered rows, sticky media swaps on hover/focus | Reveal | Sticky panel (lg) | Row highlight, media crossfade | Tap "+" expands row | Instant swap | /services, /services/[slug] | authentic / abstract art |
| 05 | Selected work | Altreex mixed grid · Onart card metadata | 6 cards, 2 large, preview crossfade, status badges | Reveal stagger | none | Image scale + arrow nudge; dots on touch | 1 col | Static | /work/[slug] · live site | authentic / placeholder |
| 06 | Software showcase | Nexifye floating dashboards | Browser + phone frames with real screens, captions state authenticity | Reveal | Layered parallax | none | Stacked | Static | /solutions | authentic |
| 07 | Industries | Nexifye tabs | Accessible tablist, use cases vs delivered projects, media swap | Fade/slide per tab | none | Tab styles | Horizontal chip tabs | Instant | /solutions/[slug] | authentic / placeholder |
| 08 | Technology | Monoform rhythm | Marquee strip | none | Marquee (paused on hover) | Pause | Wraps under reduced motion | Static wrap | /technologies | n/a |
| 09 | Process | Onart numbered steps | Sticky indicator + 5 steps | Reveal | Sticky panel (lg) via IO | none | Stacked, inline expectation | Static | /process | n/a |
| 10 | Trust | Nexifye proof blocks | Verified-facts cards; testimonials only when approved | Stagger | none | none | 1 col | Static | /start-project | n/a |
| 11 | Insights | Monoform editorial grid | Latest published, empty state otherwise | Stagger | none | Card border | 1 col | Static | /insights | n/a |
| 12 | FAQ + CTA band | Onart closing CTA | Giant heading, three CTAs incl. WhatsApp | Masked lines | none | Magnetic | Stacked buttons | Static | /start-project · /book-consultation · WhatsApp | n/a |

## Other public routes

| Route | Distinct composition | Motion | Mobile | CTA context |
|---|---|---|---|---|
| `/about` | Editorial hero, sticky "who we are" + parallax screenshot, vision/mission pair, 6 value cards, dashed "published when verified" blocks for team/milestones | Masked lines, parallax, stagger | Stacked | Contact, Start project |
| `/services` | Hero with anchor nav, indexed rows + sticky media, approach, 8-stage grid, engagement models, FAQ accordion | Rows crossfade, stagger | Anchor chips wrap | Quote / consultation |
| `/services/[slug]` | 8 hero layouts keyed by `heroStyle` (grid/stack/frame/orbit/split/ledger/flow/cloud) with real related screenshot or abstract art; problems, deliverables, workflow, approach, related case studies, FAQ, next-service takeover | ScrollScale hero, stagger | Stacked | Pre-filled quote + consultation |
| `/work` | Hero stats, featured large card, searchable/filterable grid (service/industry/status), capability highlights | Layout morph on filter, live status | Chip rows scroll | Case study / live |
| `/work/[slug]` | Onart/Voyage structure: breadcrumb → PROJECT label → metadata matrix → framed hero → brief/challenge/goals/approach → gallery+lightbox → features/tech → device comparison (when mobile shot exists) → outcomes/status → related → next-project takeover | Masked lines, ScrollScale, metadata stagger, lightbox | Stacked, lightbox swipe | Discuss similar project, live link only when public |
| `/solutions` | Hero, industry tablist, 6 solution cards with capability badges, software showcase, integrations | Tabs, stagger, parallax | Stacked | Discovery call |
| `/solutions/[slug]` | Sector hero with proof screenshot or labelled visual, needs, use cases (proposed vs delivered), workflow, architecture, proof, next sector | ScrollScale, stagger | Stacked | Sector-prefilled project |
| `/technologies` | Principles, filterable grouped grid with "used in" links, inline SVG reference architecture diagram | Stagger | Chips scroll, SVG scrolls horizontally | Technical consultation |
| `/process` | Stage overview strip, sticky story panel with progress bar, expectations grid | IO-driven sticky | Stacked | Discovery |
| `/insights` | Featured article, filter + search + pagination grid, empty state | Layout animation | 1 col | none |
| `/insights/[slug]` | Reading progress, TOC, markdown renderer, related, JSON-LD Article | Masked lines, ScrollScale cover | TOC above body | Project CTA |
| `/lab` | Grain hero, in-development cards with labelled placeholders, experiments with status badges, demos (honest "none") | Stagger | Stacked | Ask us |
| `/careers` | Principles, roles (details/summary) or "No current openings", FAQ | Stagger | Stacked | Contact form with subject |
| `/contact` | Channel cards (WhatsApp only when configured), general inquiry form with server validation, FAQ | Masked lines, field states | Stacked | Start project |
| `/book-consultation` | Meeting types, honest mode badge, Cal.com embed or request form with timezone display | Field states | Stacked | WhatsApp |
| `/start-project` | 3-step wizard with preserved progress, attachments, context from service/project/solution | Step transitions | Stacked | Book consultation on success |
| `/privacy`, `/terms` | Editorial legal layout with Draft banner until reviewed | Masked lines | Readable measure | none |
| `not-found`, `error`, `loading` | Branded 404 with flare, error boundary with digest, skeleton loading | none | Stacked | Home / Work / Contact |

## Admin routes (`/admin`)

`/admin` overview · `/inquiries[/id]` · `/leads[/id]` (table + board) · `/clients[/id|/new]` · `/bookings[/id]` · `/proposals[/id|/new]` · `/projects[/id|/new]` · `/portfolio[/slug|/new]` · `/content[?tab][/kind/slug|/kind/new]` · `/media` · `/notifications` · `/analytics` · `/team` · `/settings` · `/audit` · auth: `/login`, `/invite/[token]`, `/forgot-password`, `/reset-password/[token]`.

Design: sidebar + topbar SaaS shell, compact type, tables scroll within cards, drawer navigation on mobile, no marketing motion.
