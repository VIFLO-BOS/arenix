# Design tokens and motion vocabulary

Brand direction supplied by the owner on 19 October 2026: navy blue and an accent that was first described as gold and then fixed by the logo supplied on 23 October 2026 as orange (#FC8F2D), display face around Sheepman W03, body face Amatry, small contained type, slow smooth motion in the spirit of clenest.site. Tokens live in `src/app/globals.css` (`@theme` plus `:root` custom properties). Settings in the dashboard accept a logo path and accent colour, and `--color-accent` is the single source for the orange accent.

## Palette

| Token | Value | Role |
|---|---|---|
| `--color-ink` | `#06132A` | Page background, deepest navy |
| `--color-navy` | `#0B1F3F` | Brand navy, text on light surfaces |
| `--color-surface-deep` | `#0B1D3A` | Deep panels, footer, admin sidebar |
| `--color-surface-raised` | `#122A52` | Raised cards on dark |
| `--color-paper` | `#F7F5EF` | Light editorial sections (warm off white) |
| `--color-on-dark` | `#F6F3EA` | Text on dark |
| `--color-on-light` | `#0A0A4A` | Text on light, tuned toward the logo navy |
| `--color-muted` and `--color-muted-light` | `#A9B4C9` and `#5A6579` | Secondary text |
| `--color-accent` | `#FC8F2D` | Logo orange. CTAs, indices, focus ring, highlights |
| `--color-accent-deep` | `#D9741A` | Orange hover |
| `--color-accent-soft` | `#FFE1C2` | Orange tint for light surfaces |
| `--color-brand-navy` | `#05035A` | The navy measured from the logo letters |
| success, warning, danger, info | `#3CCF8E`, `#FC8F2D`, `#EF5D5D`, `#5AA9FF` | State colours |

Sections switch theme with `data-surface="dark|light|deep"`, which remaps `--bg`, `--fg`, `--fg-muted` and `--line`.

## Typography

- Display slot `--font-display` is Montserrat (weights 500 to 800), self hosted through `next/font`. Headings, navigation, buttons, labels, pills, tabs and table heads use it.
- Body slot `--font-sans` is Roboto (400, 500, 700), also through `next/font`. Paragraphs, lists and form fields use it.
- Decided 22 October 2026 after the owner asked for Roboto or Montserrat. The earlier Sheepman W03 and Amatry slots were removed, including their `local()` lookups, so a font installed on a visitor's machine can never replace the brand type.
- Scale (fluid, deliberately small). `text-display-xl` `clamp(2rem, 4.3vw, 3.9rem)`. `lg` `clamp(1.8rem, 3.5vw, 3.25rem)`. `md` `clamp(1.5rem, 2.6vw, 2.6rem)`. `sm` `clamp(1.2rem, 1.7vw, 1.6rem)`. Lead `clamp(1rem, 1.1vw, 1.125rem)`. Body 16px. Micro labels `0.7rem` uppercase with 0.14em tracking.
- Headings use `text-wrap: balance` and `overflow-wrap: break-word` so long product names never crop at 250px.

## Surfaces

- `card` is the single card primitive. Radius 1.5rem, 1px line border, translucent background with a 14px backdrop blur, inner top highlight, and a gold tinted glow on hover. `card-sm` tightens the radius to 1rem and `card-dashed` is the "published when verified" placeholder style. Light sections render cards as near white panels with a soft shadow.
- `glass` is the same treatment for controls. The header is a floating glass pill that gains blur and a shadow once the page scrolls.
- `pill` is the eyebrow and badge style, uppercase 11px text with a gold dot and optional index. `num-chip` replaces monospace indices with a small gold tinted circle.
- `flare` (gold) and `flare-blue` are blurred radial glows, combined into gradient meshes behind heroes, the CTA panel and the footer. Dark and deep surfaces also carry a faint two tone radial gradient so sections never look flat. `dots` adds a masked dot grid behind heroes.
- Buttons. The accent button is a gold gradient with a glow shadow, the secondary button is glass, and both lift 2px on hover.

## Spatial system

- Container `max-width: 1320px`, gutter `clamp(1rem, 3.4vw, 3rem)`. Every section is contained, with the same left and right padding on wide screens.
- 12 column grid on `lg`, 2 columns on `sm`, single column at base. Extra breakpoints `2xs: 300px` and `xs: 400px`.
- Readable measure. `prose-editorial` max 68ch.
- Radius. Cards `1rem` to `1.25rem`, controls `0.75rem`, pills `9999px`.

## Copy rules

Public and dashboard copy avoids em dashes, en dashes, colons, semicolons and hyphenated words. Separate ideas with a full stop or a comma, write ranges as "9am to 5pm" or "1 to 3 months", and prefer "click to chat", "role based" and "end to end". Lists of items use "and".

## Motion tokens

Lenis smooth scroll runs on fine pointer devices at 768px and above (lerp 0.075, duration 1.4, expo easing), ticked by GSAP. It is disabled on touch devices and under reduced motion.

| Pattern | Component | Timing and easing | Fallbacks |
|---|---|---|---|
| Masked line reveal | `SplitLines` | 1.2s, `cubic-bezier(.19,1,.22,1)`, 130ms stagger | Static text (SSR and reduced motion) |
| Editorial reveal and stagger | `Reveal`, `Stagger` | 1.1s, 100ms stagger, once, only below the fold | Static |
| Clip mask reveal for media | `MaskReveal` (GSAP) | 1.4s inset wipe with scale 1.12 to 1 | Skipped when already in view or reduced motion |
| Full width media scale | `ScrollScale` (GSAP) | scrubbed clip path and scale | Disabled at 640px and below and reduced motion |
| Soft parallax | `Parallax` | small translate, transform only | Disabled under 768px and reduced motion |
| Hover transitions | `hover-lift`, `img-zoom`, `link-underline`, buttons | 550ms to 1.2s, expo easing | Focus visible equivalent |
| Route change | `RouteCurtain` and `(site)/template.tsx` | 0.9s navy curtain wipe plus 1s page enter | None under reduced motion |
| Marquee | `TechMarquee` | 70s linear loop, paused on hover | Wraps as a static list |
| Magnetic CTA | `Magnetic` | fine pointer only, slow return | Plain button |
| Nav overlay | `SiteHeader` | 700ms hide on scroll down, overlay fade | Instant under reduced motion |
| Grid morph | `WorkGrid` (Motion layout) | 600ms | Opacity only under reduced motion |
| Dashboard micro motion | CSS transitions | 300ms to 500ms | None |

Rules enforced. No permanent `will-change`, no scroll hijacking, `prefers-reduced-motion` collapses every animation to near zero, and content is never hidden behind an animation that has not run.

## Energy layer (third pass, "still very boring")

- `Aurora` places three slow drifting colour fields (blue, gold, violet) behind heroes, the showcase and the CTA panel. 28s to 40s alternating keyframes, blurred 70px, frozen under reduced motion. `tone="gold"` for gold surfaces, `tone="quiet"` for subtle use.
- `KineticMarquee` is a two row strip of large outlined and gold gradient service names moving in opposite directions (90s and 110s). Decorative only, labelled for assistive tech, pauses on hover.
- `SplitLines` and `SectionHeading` take an `accent` phrase that is painted with the gold gradient. Every hero and most section titles on the home page use one.
- `data-surface="gold"` is a full gold section (gradient background, navy text, translucent white cards). Used for the credibility block on the home page and the CTA panel on the home and services pages.
- Sections stack as sheets. Every `Section` overlaps the previous one by a 3rem rounded top edge (`sheet` class, opt out with `sheet={false}`).
- `Spotlight` feeds the pointer position into every `.card`, which paints a gold radial highlight that follows the cursor. `Cursor` adds a trailing gold ring on fine pointers that grows over interactive elements. `Tilt` gives the hero mockups a gentle 3D tilt that springs back.
- `CountUp` animates the hero statistics the first time they scroll into view. `RotatingWords` cycles the sectors we build for beneath the hero headline.
- `ServiceBento` replaces the indexed service rows on the home page with a mixed size bento grid, hero tiles carrying artwork. The services page keeps the indexed rows.
- Gold buttons carry a shine sweep on hover (`btn-shine`).

## Photography layer

- `HeroBackdrop` places a full bleed photograph behind a hero with a navy gradient (strong on the left where the copy sits, lighter on the right) and a fade into the next section. Every public hero uses one, keyed in `src/content/images.ts`.
- `TopicImage` is the framed photograph used inside cards and asides, with optional soft or strong navy overlays. It replaced the abstract dashboard, code and chart illustrations everywhere except the architecture diagram on the technologies page.
- Services, sectors and process steps each map to a photograph (`serviceImage`, `sectorImage`, `processImage`).
- Portfolio placeholders use a dimmed photograph labelled "Stock photograph, not the product" so no stock image can be mistaken for a delivered screen.

## Component primitives (Radix UI)

Interactive components are built on Radix UI primitives from the unified `radix-ui` package, styled with the tokens above. Radix supplies accessibility, keyboard handling, focus management and form integration. Our styling and motion sit on top.

| Component | Radix primitive | Where |
|---|---|---|
| FAQ accordion | `Accordion` (single, collapsible) | Services, contact, careers, booking pages |
| Open roles | `Accordion` (multiple) | Careers page |
| Industry switcher | `Tabs` (vertical) | Home and solutions pages |
| Mobile menu | `Dialog` (portalled, focus trapped) | Site header |
| Admin drawer | `Dialog` | Dashboard shell |
| Screenshot lightbox | `Dialog` | Project galleries |
| Select | `Select` (popper, hidden native select for forms) | Contact and project request forms |
| Checkbox | `Checkbox` (submits "on") | All public forms |
| Consultation type | `RadioGroup` | Booking form |
| Portfolio filters | `ToggleGroup` (single) | Work page |

Animations are keyed on Radix `data-state` attributes with the `radix-collapse`, `radix-fade`, `radix-slide-down` and `radix-pop` classes in `globals.css`, and all collapse under reduced motion. Admin tables, inputs and selects remain native HTML controls for density.

## Logo

The owner's logo (lowercase "areni" in navy with an orange X) was supplied on 23 October 2026. `scripts/build-brand-assets.mjs` turns the master PNG into `public/brand/logo.png` (navy letters, for light surfaces), `public/brand/logo-on-dark.png` (off white letters, for navy surfaces), the X alone as `mark.png` and `mark-on-dark.png`, plus `src/app/icon.png`, `apple-icon.png` and `opengraph-image.png`, which Next.js serves as the favicon, home screen icon and social preview. The `Wordmark`, `WordmarkGiant` and `Mark` components in `src/components/brand/wordmark.tsx` render these files. Utility class names such as `text-gradient-gold` and `bg-gold-gradient` keep their historical names but now resolve to the orange ramp.

## Dashboard (application window)

The dashboard is a light application layout, separate from the marketing surfaces. Workspace `#F3F5F9`, white panels with a 1px slate border and a soft shadow, slate text, navy for the active navigation item and primary buttons, orange for counts and accents. The shell (`src/components/admin/admin-shell.tsx`) has a collapsible icon sidebar (Lucide icons, Radix Tooltip when collapsed), a top bar with breadcrumbs, inquiry search, the content source badge, notifications and a Radix DropdownMenu account menu, and a Radix Dialog drawer on phones. Primitives live in `src/components/admin/ui.tsx` (`PageHeader`, `Card`, `Stat`, `Table`, `Td`, `KeyValue`, `Notice`, `Pager`, input and button classes). Admin form controls stay native HTML for density. The `.admin-scope` class remaps the surface variables to the light palette.
