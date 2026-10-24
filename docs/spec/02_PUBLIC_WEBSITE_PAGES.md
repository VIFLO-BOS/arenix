# Public Marketing Website — Complete Route & Section Inventory

**Global:** Shared navigation, animated but accessible route entrance, breadcrumb where relevant, consistent CTA strategy, intentional branded footer, business WhatsApp action, keyboard usability, accurate SEO metadata. Every page must feel distinct within the same brand system. Internal `/admin` is specified separately.

## 01. Home — `/`

**Purpose:** Identity + immediate credibility + portfolio-first conversion.

| Order | Section and content | Visual/animation behavior | CTA |
|---|---|---|---|
| 1 | Hero: areniX branding, strong statement, differentiated offer, 2 CTAs | Branded intro (skippable), split-line reveal, real app UI layered composition, subtle scroll depth | Explore Work / Start Project |
| 2 | Authentic project showreel | Cinematic media mask and restrained scroll scale, pause/controls; poster if no real footage | View Work |
| 3 | Company preview | Editorial text block, number label, offset real studio/product image, image parallax | About areniX |
| 4 | Services preview | Indexed giant rows, media-change on hover/focus; tap expand on mobile | All Services |
| 5 | Selected portfolio (6–8 configurable projects) | Varied size real screenshots, hover live previews, tasteful active image transitions, case-study overlay | View Case Study + Visit Website where available |
| 6 | Real dashboard showcase | 2–4 permission-approved software screens, floating layered frames, scroll narrative | Explore Solutions |
| 7 | Industries | Interactive sector switcher, changing supporting media; clarify use cases vs completed engagements | Explore Solutions |
| 8 | Technology stack | Categorized technical grid with responsive reveal | Technologies |
| 9 | Working process | Sticky vertical step timeline or mobile accordion with visual changes | Our Process |
| 10 | Trust/credibility | Real client approvals, testimonials or omit; no invented metrics | Start Project |
| 11 | Insights preview | Latest *published* articles; empty state until they exist | Insights |
| 12 | Large contact CTA | Dramatic color/typography shift and big button | Book Consultation / Start Project |

## 02. About — `/about`

Sections: editorial hero; who we are; verified company story; vision/mission; values; approach to engineering & design; team or leadership if authorized; authentic milestones; where we work (publish only approved location/contact); final CTA. Motion: words/lines reveals, scroll storytelling with sticky image, value-card activation, timeline movement, contrasting section transitions. Keep text searchable and accessible.

## 03. Services — `/services`

Sections: major editorial hero; service positioning; 8 primary service categories; featured delivery examples; technical approach; delivery stages; engagement models without invented prices; relevant portfolio; FAQs; consultation CTA.

Proposed service categories:
1. Custom Software & Web Applications
2. Corporate Websites & Web Development
3. SaaS Product Engineering
4. Enterprise & Operations Systems
5. Mobile Application Development
6. UI/UX & Product Design
7. API Integration & Automation
8. Cloud Deployment, Maintenance & Technical Consulting

Only actively market confirmed capabilities; admin can unpublish offerings not yet available.

Interactions: typography reveal, indexed hover rows, service media swap, accordion details, anchor/sticky navigation, CTA scroll; responsive explicit controls.

### Service detail — `/services/[slug]`

Sections: service-specific hero with custom imagery; problems addressed; solutions/deliverables; sample workflow; technical approach; related **real** case studies; FAQ; booking and project CTA. Use distinct layouts/hero art for meaningful service differences rather than template title swaps. Motion: masked screenshot, category pills, column stagger, optional sticky value statement, related project transition.

## 04. Portfolio — `/work`

Sections: portfolio hero; featured case study; searchable/filterable work grid; status/industry/service filters; capability highlights; large lead-generation CTA. Each project image/title links to internal `/work/[slug]`. Render clearly labeled **View Case Study** and **Visit Website / Open App** actions; external link only if public and configured. Screenshots should be authentic, user-authorized and cropped intentionally.

Motion: dynamic layout reflow without scroll jumps, image switching on hover, keyboard focus visual, correct mobile touch controls, branded detail-page entrance.

### Individual case study — `/work/[slug]`

Use **Onart/Voyage** as a strong composition reference:
1. Back to work / breadcrumb
2. Large project name and introductory statement
3. Metadata: project type, industry, year *if verified*, contribution, status
4. Main authentic project screenshot / hero video
5. Business context and brief
6. Challenge and objectives
7. Approach, discovery and design
8. Screenshots: real key pages and workflow states
9. Engineering/architecture breakdown, only if disclosure permitted
10. Features; demonstrate value with UI, not marketing filler
11. Devices/responsive previews
12. Outcomes, factual metrics only; otherwise qualitative capabilities
13. Project status, demo/live/repo buttons where appropriate
14. Related work
15. Large next-project transition + final CTA

Motion: media reveal, selective gallery parallax, metadata stagger, scroll-led feature panels, focusable lightbox, real UI tab/slide interactions, next-case transition. No project may have a dead page or fake outcome.

## 05. Solutions — `/solutions` and `/solutions/[slug]`

Sections: hero; grouped sectors (education, healthcare, retail, workforce, hospitality, startup); problems/business needs; relevant real solutions vs proposed capabilities; dashboard-supported product imagery; integrations; delivery method; case studies; CTA. Detail pages: sector-specific use cases, workflow, architecture high level, related proof and conversion. Motion: interactive category selector, image swap, scroll-linked product mockups, accessible tabs and content reveals.

## 06. Technologies — `/technologies`

Sections: engineering philosophy; frontend (React/Next.js/TypeScript), backend (Node/NestJS/Express/Python where verified), databases (PostgreSQL/Prisma/MongoDB), mobile (React Native), cloud/deployment, systems architecture and integrations; stack-to-project mapping; CTA. Interactive grouped tech grid and visual architectural diagrams; no false certificate/vendor partnership logos.

## 07. Process — `/process`

Sections: discover; scope; product/UX design; architecture; build; QA/security; launch; maintenance/support; expectation-setting; CTA. Editorial process timeline with sticky visual, scene transitions, progress indicator and practical deliverables. Mobile version uses stack/accordion, not broken pinning.

## 08. Insights — `/insights` and `/insights/[slug]`

Listing: blog hero, featured article, category filters, text search, article grid, pagination, newsletter only if consent-compliant and functional. Article: hero, real author/date, reading time, optional TOC, cover, structured rich text, code blocks and syntax highlighting, accessible media, reading progress, related articles, service CTA. Motion: understated article image reveal, card hover and controlled transitions. Empty state if unpublished.

## 09. Innovation Lab — `/lab`

Explain product experiments and work in progress honestly. Sections: experimental hero; in-development work incl. netHuk; prototypes; technical notes; available demos; updates. Must not represent concepts as shipped software. Use distinctive cards, layered visuals and thoughtful motion.

## 10. Careers — `/careers`

Sections: editorial hero; culture/principles; work approach; verified roles from CMS; application or contact workflow; FAQ. Show professional **no current openings** state when empty. Do not invent hiring or collect unnecessary personal information. Motion: balanced reveals, tasteful role hover, not distracting effects.

## 11. Contact — `/contact`

Sections: large editorial invitation; short contact options; official WhatsApp link; email (only after configured); general inquiry form; location if appropriate; social links if verified; FAQ; closing CTA. Motion: heading reveal, animated fields and true submission state. Include anti-spam, validated persistence, acknowledgment email, and helpful error reporting.

## 12. Consultation booking — `/book-consultation`

Sections: consultation choice, expectation and optional duration, working embedded scheduler with valid availability or clearly labeled callback-request fallback; timezone display, contact details, confirmation/reschedule/cancel states. No fake slot inventory, no placeholder confirmation. Maintain branded framing, accessible date/time selection and service context in link.

## 13. Start a project — `/start-project`

Sections: short explainer, inquiry wizard or well-designed single form; service/solution category, client details, project requirements, budget optional, timeline optional, attachments optional, preferred contact method, consent. Validate server-side; on success show unique saved reference and action for booking consultation. If multipart wizard, preserve progress and avoid unnecessary mandatory fields.

## 14. Policies and system pages

`/privacy`, `/terms`, `not-found`, loading and error states. Use readable editorial layout and consistent brand. Add legally reviewable placeholder text marked **Draft — review before launch**, not fake polished legal guarantees. A business owner/legal professional should review policies against real data flows and applicable law before publication.

## Navigation and footer

Desktop links: Home, About, Services, Work, Solutions, Technologies or Process (possibly dropdown), Insights, Contact; persistent CTA `Start a Project` and optional `Book a Call`. Mobile must have full accessible menu and relevant WhatsApp CTA. Footer: large areniX mark, contact CTA, real verified socials, all core links, legal, business name and current year.

## Business conversion principle

Services and case studies should offer contextual CTAs: **Book a consultation**, **Request a quote**, **Chat on WhatsApp**. Don't make users go to a generic form with no selected service or project context.
