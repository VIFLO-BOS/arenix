# Design System, Five-Reference Synthesis & Motion Direction

## The single design promise

**The marketing UI on every public page combines all five user-supplied design references.** The finished areniX experience must communicate premium creative execution **and** trustworthy software engineering. The dashboard inherits brand tokens but optimizes for operations, not spectacle.

## Research matrix

| Source | Borrow the principle | How areniX interprets it | Don't copy |
|---|---|---|---|
| https://altreex.webflow.io/ | Editorial mixed-grid portfolio, expressive service sections, spacious composition | Unexpected but controlled project sizing, numbered capability rows, alternating layout | Site-specific graphics, artwork, full section replicas |
| https://onart-studio.webflow.io/project/voyage | Project label/title, metadata matrix, broad imagery, goals/outcomes, related projects, strong closing footer | Real screenshot-led product case studies and technical solution storytelling | Voyage media, wording, photography, logo |
| https://visione.webflow.io/ | Cinematic rhythm, immersive media, large editorial typography | Showreel from authentic app footage, dramatic reveal on major transitions | Branded showreel/copyrighted media |
| https://monoform-template.webflow.io/ | Restrained editorial typography, white space, refined project indexing | Consistent grid, disciplined visual rhythm, legible minimal presentation | Theme clone, page-by-page layout reproduction |
| https://nexifye.webflow.io/ | Technology/product presentation, dashboard mockups, credible value proposition, conversion blocks | Floating *real* Paylio/ArenoX/CleNest dashboard screen compositions, clear services + CTAs | Fake testimonials, fake product screenshots |

When possible, explore their nav, project work pages, mobile layouts, hover and scroll behavior and document **observed** facts separately from **designed-for-areniX** proposals. If something can't be observed, implement sensible originals rather than asserting it exists on the reference.

## Brand naming and tone

- Full legal name: **areniX Technologies Limited**.
- Short/public brand: **areniX**. Preserve lowercase `areni` + uppercase `X` when typography allows.
- Proposed homepage headline: **We build technology that moves ideas forward.** This is provisional copy, not a registered company motto.
- Supporting copy: “areniX designs and engineers digital products that help businesses work smarter, serve customers better, and scale with confidence.”
- Clear writing: technologically competent, human, specific and evidence-based. Avoid grandiose claims (“Africa's #1”, “100+ clients”, “award-winning”) without verification.
- Tone: credible business partner, not a single-developer resume site; still describe individual contribution precisely when projects were built personally.

## Art direction and tokens

### Palette (starter tokens; override with official logo palette)
- `--ink: #090B10` near-black
- `--surface-deep: #11151C`
- `--surface-raised: #1A202B`
- `--paper: #F5F4F0` warm neutral
- `--paper-muted: #EAEAE5`
- `--text-on-dark: #F5F5F3`
- `--text-on-light: #141821`
- `--muted: #A6AFBB`
- `--accent: brand-derived` (temporary placeholder, never choose randomly)

Use dark/light alternation with meaningful contrast; restrained luminous gradient on important surfaces, not everywhere. Glass UI effects are selective and always readable. Keep gradient/logo effects tasteful and performant.

### Typography
- Expressive grotesk variable display face; legible sans body font.
- Fluid `clamp()` scale for headings; on mobile never crop long names.
- Some uppercase micro-labels and numeric section indices; body copy optimized for actual reading.
- Rhythm: large display headings, short lead text, good empty space, carefully aligned media.

### Spatial system
- Container max width ~1360–1520px with fluid gutters, not fixed-width.
- 12-column large-screen grid, flexible tablet 6-column, mobile 4-column where practical.
- Narrow readable text lines (~55–75 characters for long-form body).
- Intentional responsive image crops, full-width visual moments, asymmetric sections where helpful.
- Clear focus, error, success, disabled states.

## Required reusable motion vocabulary

| Motion pattern | Best use | Implementation notes |
|---|---|---|
| Masked line reveal | Home/About/Services/Work page headings | GSAP or Motion with safe hydrated text fallback |
| Full-width media scale/reveal | Showreel, project hero, case-study gallery | ScrollTrigger once, avoid heavy layout paints |
| Editorial stagger | Process steps, tech badges, value propositions | Modest gap, no cascade fatigue |
| Directional hover reveal | Project cards, service rows, links | Works with mouse, focus; mobile uses explicit UI |
| Soft parallax | Hero layered screenshots, select galleries | Transform only, disable/reduce mobile |
| Sticky story panel | Process, selected case-study features | Avoid nested scroll trapping, expose accessible text |
| Horizontal selected-work chapter | One immersive desktop gallery only | Vertical fallback on touch/small screens |
| Page transitions | Major marketing route changes | Never delay focus/navigation or browser history |
| Magnetic CTA | Precise-pointer desktop, select primary actions | Simple non-magnetic fallback touch/keyboard |
| Animated nav overlay | Mobile navigation | Focus trap, Escape, overlay dismissal |
| Grid morph/reorder | Work filters | Do not move focus unexpectedly |
| Animated project screenshots | Portfolio hover, case study viewer | Real/approved media, accessible next/previous controls |
| Dashboard micro-motion | Drawer, toast, filter, tabs, dialogs | 100–250ms, functional, no scroll hijacking |

## Motion architecture

- GSAP + ScrollTrigger: pinned sections, scroll-linked image scale, coordinated complex timelines.
- Motion for React: component mount/unmount, modal/drawer, routing integration, selection transitions.
- Native CSS transitions: color/opacity/transform hover and focus.
- Optional Lenis: test whether smooth scrolling adds value; respect anchor navigation and reduced motion; do not sabotage native scrolling.
- Optional R3F/Three.js: only one compelling and useful visual, lazy-load, pause offscreen, no battery-draining “random floating objects.”
- Centralize motion duration/ease tokens, cleanup and breakpoints.

### Motion timing guidelines
- Press/hover response: 120–250 ms
- Card interactions: 250–500 ms
- Reveals: 500–850 ms
- Page transitions: 450–900 ms maximum, subject to user control
- No artificially prolonged preloader; allow skip, avoid repeat on every navigation.

### Cross-device rules
- `prefers-reduced-motion: reduce`: static or minimally faded content; content never hidden behind unrun animations.
- Touch: all navigation, gallery and detail controls remain visible.
- Keyboard: focus, tab order, overlays, Escape handling and explicit labels.
- Avoid opacity 0 content relying on JavaScript before hydration.
- Use `gsap.context()` / cleanup of triggers and proper route transition lifecycle.
- No repeated scroll/pointer event handler leaks.
- Do not set `will-change` on every element permanently.
- Non-decorative media has captions/alt text; heavy video has poster and pause/control or appropriate autoplay safeguards.

## Section-specific design examples

1. **Home hero**: split title, actual app interface collage, one brand-accent light flare, editorial CTAs, controlled intro reveal.
2. **Selected work**: large alternating project media, preview details, scroll sequence or grid with meaningful filters, direct case-study and live-site actions.
3. **Services**: Altreex/Monoform-inspired indexed rows; large hover media; details that expand accessibly.
4. **Project case study**: Onart-inspired hero/metadata/hero image; engineering story; full-size screenshot chapters; next-project takeover.
5. **Solutions**: Nexifye-inspired browser/dashboard frames and corresponding business outcomes.
6. **Insights**: precise typographic editorial grid, responsive article covers and smooth filtering.
7. **Footer**: oversized areniX wordmark, dark gradient field, clear CTA, numbered navigation and real contacts.
8. **Dashboard**: clean modern SaaS layout, compact text sizes, info hierarchy, functional tables; use marketing visuals only sparingly.

## Page-by-page design audit checklist

For *every* public page and major section, record: `section ID | composition inspiration | original areniX treatment | entrance | scroll response | hover/focus | mobile | reduced-motion | CTA destination | asset status`. This audit must show that animation and design are intentionally present across all public routes, **not only on the homepage**.

## Non-goals

- No copyrighted reference asset copying.
- No gratuitous animation merely to satisfy a numeric animation count.
- No “AI-generated look” with generic giant gradient blobs and repetitive cards.
- No fake testimonials, logos, client figures, awards or case-study outcomes.
- No WordPress/Webflow template recreation unless user expressly changes the stack.
