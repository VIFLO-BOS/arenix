# Design Reference Audit, areniX

Purpose: record what was actually OBSERVED on five public Webflow template sites (plus two live portfolio sites), separate it from what could NOT be verified, and derive design PRINCIPLES for areniX (corporate site + business dashboard for areniX Technologies Limited). Nothing here authorises copying assets, copy, logos, layouts or CSS from any reference.

## Method and limitations

- Date of fetch: 2026-10-19.
- Tooling: each URL was fetched over HTTP and converted to text/markdown (WebFetch). Raw HTML of the five template homepages was also downloaded once with curl and grepped for class names and script tags. No browser was run, no JavaScript executed, no screenshots taken.
- Pages fetched:
  - Altreex: `/`, `/portfolio/meridian-studio-identity`
  - Onart Studio: `/`, `/project/voyage`
  - Visione: `/`, `/project/bright`, `/services`
  - Monoform: `/`, `/work`, `/work/brightcore`
  - Nexifye: `/`, `/projects`
  - Live sites: `https://passion-nutrition-clinic.vercel.app/`, `https://www.clenest.site/` (homepages only)
- What CANNOT be verified from static fetches (and is therefore marked "unverified" throughout): hover states, cursor effects, scroll-triggered reveals, parallax, sticky/pinned sections, marquee speed/direction, preloader behaviour, text-split animations, slider autoplay, actual font rendering/sizes/weights, colour values as rendered, responsive breakpoints, and whether any image is full-width versus contained.
- Class names and script URLs found in raw HTML (e.g. `w-slider`, `marquee_component`, `cursor_follower`, `gsap`, `lenis`, `SplitText`, `ScrollTrigger`) are cited as HINTS that motion tooling is loaded. They do not prove what the motion looks like.
- Heading levels (h1/h2/h3) in the markdown conversion are partly inferred; where a level is stated below it was explicit in the fetched text.

---

## 1. Altreex (https://altreex.webflow.io/)

### Observed
- Nav: Home `/`, About `/about`, Service `/service`, Blog `/blog`, Pricing `/price`, Portfolio `/portfolio`, Contact `/contact`; a "Pages" dropdown exposes template utility pages (401, 404, Licenses, Changelog, Style Guide). Footer nav repeats Home / About / Pricing / Blog / Contact.
- Homepage section order: Hero ("Creative thinking built around your brand's ambition") -> client logo strip ("What we've made", "Over 30+ years experience...") -> three numbered services ("01. Brand Strategy", "02. UI/UX Design", "03. Web Development") -> "Portfolio" with "@2026" and "View All Project" -> "How we work" (four steps: Discover, Strategize, Design, Launch; each with bullet list) -> CTA ("Let's build a brand people remember") -> "Services" card grid -> "Testimonials" (three portraits + quotes) -> "Recognition" (list of awards with years) -> "Creative Insights" blog (three cards) -> closing CTA "Let's work together" + "Let's talk directly" + email.
- Typography: numbered indices on services ("01.", "02.", "03."); short eyebrow phrases above headings ("What we've made", "Featured work", "How we work"). Uppercase styling not confirmable. Raw HTML loads Google Fonts family "Google Sans".
- Layout: 8-logo strip (duplicated in markup), vertical list of project cards, 4-column process, service card grid, 3-up blog grid, large background imagery in CTA and footer areas.
- Project metadata: homepage cards show title + date ("October 12, 2026") only. Detail page (`/portfolio/meridian-studio-identity`) shows a metadata block with labels `Category: Branding`, `Tag: Creative, photography, art, minimalistic`, `Date: January 2026`; a hero image, intro paragraph, four sequential images, a closing paragraph, Previous/Next controls (both href `#`), then a reusable CTA block and footer. No Client / Industry / Year labels.
- Footer: logo, nav column, social (LinkedIn, Instagram, Facebook, Dribbble), credits ("Designed by", "Powered by Webflow"), utility links. No explicit copyright line.
- CTA wording: "View All Project", "Let's work together", "Let's talk directly", "Free initial consultation".
- Class/script hints (raw HTML): `w-slider` (6), `marquee` (8), `fda-how-track`, `fda-hover` (many), `w-dropdown`; scripts gsap 3.13/3.15 incl. ScrollTrigger, SplitText, Observer; `lenis` (9 mentions).

### Unverified / not observable via HTML fetch
- Whether the logo strip actually scrolls (marquee), whether the "how we work" track is horizontally pinned, hover transitions on `fda-hover` elements, SplitText heading reveals, smooth scrolling (Lenis), and whether images are full-bleed.

### areniX translation (principles only)
- Use a numbered service index (01/02/03) on Home and Services to give the three to five areniX service lines a scannable order.
- Pair every section heading with a short eyebrow phrase, then a 1-line descriptor.
- Process section = 4 named steps, each with 2 to 3 bullets (areniX: Discover, Design, Build, Operate or similar, written fresh).
- Keep a single reusable closing CTA block (heading + button + direct email) appended to Home, Services, Work and case studies.
- Case-study metadata block must carry stronger fields than Altreex's (see Synthesis): Category/Tag/Date is too thin.

---

## 2. Onart Studio (https://onart-studio.webflow.io/) and `/project/voyage`

### Observed
- Nav: minimal header (logo, social icons, "Get in Touch" `/contact`, "All Projects" `/projects`). Full nav lives in the footer and is numbered 01 to 05: Home, About, Projects, Articles (`/blog`), Contact.
- Homepage section order: Hero (h1 "Onart", h2 "Studio©", "Crafting strategic brands for modern businesses.", eyebrow "✦ Branding Agency ✦") -> "Creative Vision©" statement -> "Selected Projects©" (eyebrow "Our Portfolio"; cards Voyage 2026, Moment 2025, Unity 2024, Aspire 2023, each with year + arrow) -> "Branding Solutions" (01 Branding, 02 Strategy, 03 Design, 04 Identity, each with keyword list and image triplet) -> "Client Reviews" (eyebrow "Testimonials"; Previous/Next controls) -> "Flexible Pricing" (Starter / Premium) -> "Common Questions" (FAQ numbered 1 to 6) -> "Start Building" (eyebrow "Let's Talk").
- Typography: display headings split over two lines ("Selected / Projects©"); ©/®/™ glyphs used decoratively; numbered indices on services, FAQ and footer nav; "(04)" style counter.
- Project page `/project/voyage`: label "Project:" + h1 "Voyage" + summary + "View Live" button -> hero image -> "Project Goals" (paragraph + bullets) -> images -> "Final Outcomes" (numbered 1 to 3) -> "Explore More" / "More Projects" (two cards: Moment 2025, Unity 2024) + "All Projects" -> footer "Let's Talk". Metadata block: `Project: Voyage`, `Service: Branding`, `Industry: Tech`, `Year: 2026`.
- Footer: tagline, numbered nav, socials (X, Instagram, Dribbble, LinkedIn, Behance), "Onart Studio®", "Powered by Webflow", template links. No copyright year line.
- CTA wording: "Get in Touch", "Let's Chat", "Choose Plan", "Get Started", "Ask a Question", "Let's Talk", "All Projects", "View Live".
- Class/script hints: `testimonial-slider w-slider`, `w-slider-arrow-left/right`, `w-slider-nav`; gsap 3.12.5/3.15 + ScrollTrigger + SplitText; asset named "circular-text".

### Unverified / not observable via HTML fetch
- Rotating circular text, slider autoplay, scroll-reveal of split headings, hover on project cards, image sizing.

### areniX translation (principles only)
- Case-study header pattern: small label, display title, one-sentence summary, then a 4-field metadata row (Service / Industry / Year / plus Client or Live link) BEFORE the hero image. This is the clearest metadata pattern found and should be areniX's default.
- Case-study body: "Goals/Challenge" -> media -> "Outcomes" as a numbered list -> "More projects" (2 cards) -> global CTA.
- Numbered footer nav (01 to 05) is a cheap, distinctive detail that suits a technology company.
- Keep FAQ as a numbered list on Services/Solutions pages.

---

## 3. Visione (https://visione.webflow.io/)

### Observed
- Nav: Home, About, Cases `/case-studies`, Services, Contact, plus "Get in Touch" button.
- Homepage section order: Hero ("Video Studio©", location line "Los Angeles, CA", "Scroll Down" label) -> intro ("Video Production" / "Visual Storytelling") -> services ("Video Solutions": Brand Films, Event Recaps, Product Demos, Social Videos, each icon + h3 + text) -> "Case Studies" (four large title links: Bright, Beyond, Harlo, Lumen) -> "Real Results" testimonials (four: portrait, name, quote) -> "Let's Create" CTA -> footer.
- Typography: stacked two-line display headings ("Visual / Storytelling"); underline bars under some titles; no numbering; no uppercase labels observable.
- Project page `/project/bright`: h1 "Bright" + tagline -> metadata `Service: Brand Films`, `Industry: Fashion`, `Year: 2025` -> h3 "Overview:" (text + 3 bullets + two images) -> h3 "Results:" (text + numbered 1 to 3 + image + testimonial portrait/quote "Marcus Hale, CEO") -> "Next Case Study" link to `/project/beyond` -> footer. Body copy is lorem ipsum.
- `/services`: h1 "Video Solutions", four service entries (icon, title, description), closing "Let's Create" / "Reach Out". No prices, tags or numbering.
- Footer: logo + tagline, nav column, socials (Instagram, X, LinkedIn, YouTube, Vimeo), "Powered by Webflow", template links. No copyright line.
- CTA wording: "Get in Touch", "About Us", "All Services", "Reach Out", "Next Case Study".
- Class/script hints: `case-study-sticky _01/_02`, `w-slider` with arrows, `is-hover` on links, 40 `data-w-id` attributes (Webflow native interactions). No gsap/lenis scripts.

### Unverified / not observable via HTML fetch
- Whether case-study items stack/pin on scroll (`case-study-sticky` is only a name), link hover styling, testimonial slider behaviour, video playback in hero.

### areniX translation (principles only)
- Per-case-study "Next case study" link at the bottom (single forward link) is simpler than prev/next pairs and avoids dead `#` links.
- Case-study body uses two fixed h3 blocks ("Overview", "Results") with a results list, adopt as the minimum template so every areniX study reads consistently even when short.
- A location line in the hero ("Lagos, Nigeria" or wherever areniX is based, to be confirmed by the owner) is a credible, low-cost trust cue.
- Testimonials: portrait + name + role; include company only where permitted.

---

## 4. Monoform (https://monoform-template.webflow.io/)

### Observed
- Nav: Home, About, Work, Blog, Contact, email link `hello@monoform.studio`, button "Start a project" `/contact`.
- Homepage section order: Hero (h1 "We design brands that refuse to blend in.", eyebrows "Booking Q1 2027" and "(Independent design & technology studio)", three portrait images, uppercase "SCROLL TO EXPLORE") -> stat "120+" -> showreel block "(Showreel 2026)" "01:24" with Play/Pause -> "Partnering with teams at" logo strip (duplicated markup) -> "(01) The studio" stats (12+, 180, 32, 94%) -> "(02) What we do" h2 "Four disciplines. One senior team." (Brand Strategy, Websites, Digital Product Design, Motion & Content; each with capability tags like Positioning, Webflow, Motion design) -> "(03) Selected work · 2023, 2026" h2 "Work we're proud to sign." (4 cards: Brightcore, Riverstone, CRT Studio, MORF with category + year) -> "(04) How we work" h2 "A calm process for bold outcomes." (4 steps) -> "(05) Kind words" single testimonial -> "(06) Blog" h2 "Notes from the studio." (3 posts) -> closing h2 "Got an idea? Let's make it real."
- Typography: parenthesised section indices "(01)" to "(06)" and parenthesised labels "(Overview)", "(Results)", "(Next project)", "(Let's talk)", "(7)" count; one uppercase micro-label ("SCROLL TO EXPLORE"); Google Fonts family "Geist" loaded.
- `/work`: h1 "Selected work" + intro, count "(7)", filter row "All / Branding / Website", list of 7 projects as `Title · Category · Year` (e.g. "Brightcore · Website · 2026"), plus a second listing with one-line descriptions. Client names not shown.
- `/work/brightcore`: category label "Website", h1, one-line summary, metadata `Client: Brightcore Drinks`, `Year: 2026`, `Services: Packaging, Campaign, Webflow ecommerce`, `Live site: Visit website ↗` -> hero image -> "(Overview)" with "The challenge" / "Our approach" subheads and 3-item service list -> image sequence -> "(Results)" three stats + testimonial -> "(Next project)" card (CRT Studio) -> "(Let's talk)" CTA -> footer.
- Footer: brand statement ("Independent studio for brand, web and product. Booking projects from Q1 2027."), Sitemap column, Social column (Instagram, LinkedIn, Dribbble, Behance), Studio column (street address + phone), "© 2026 Monoform Studio", bottom utility links incl. "Back to top".
- CTA wording: "Start a project", "See our work", "More about us", "Read the blog", "All projects", "Visit website ↗".
- Class/script hints: `cursor_component / cursor_dot / cursor_circle / cursor_follower / cursor_label`, `marquee_component / marquee_list / marquee_logo`, `preloader`/`loader` (34 mentions, text "Loading the studio 0%"), `sticky` (3), `track` (4); gsap 3.15 with ScrollTrigger, SplitText, ScrambleTextPlugin; `split` 44 mentions.

### Unverified / not observable via HTML fetch
- Custom cursor behaviour, preloader percentage animation, scramble/split text reveals, marquee motion, sticky process section, hover on work cards. All are only inferable from names.

### areniX translation (principles only)
- Section numbering in parentheses "(01) Services", "(02) Work" is a strong, restrained system for a corporate site; apply consistently across Home and long pages.
- Work index as a sortable line-item list `Title · Category · Year` with a simple category filter, good fit for an areniX portfolio that will start small (3 to 8 projects) and grow.
- Case-study metadata: Client / Year / Services / Live site, the "Live site ↗" link is essential for areniX because both portfolio items are live products.
- Results as three numeric stats where real numbers exist; never fabricate metrics (use qualitative outcomes otherwise).
- Footer with Sitemap / Social / Studio (address, phone) columns plus explicit © line, adopt, using areniX's real registered details.
- Capability tags under each service (e.g. "Next.js", "Dashboards", "Integrations") are more informative than icons alone.
- Any custom cursor, preloader or scramble text is OPTIONAL and must respect `prefers-reduced-motion`; do not build these just because the reference loads them.

---

## 5. Nexifye (https://nexifye.webflow.io/)

### Observed
- Nav: dropdowns Home / About / Service (each with v1/v2/v3 variants labelled Consultancy, Startups, Agency), "Pages" mega-menu (Company, Utilities, Templates groups with uppercase group labels), header buttons "Contact" `/contact` and "Get Started" `/pricing`.
- Homepage section order: Hero (eyebrow "WELCOME TO NEXIFYE", "Transforming Ideas Into Strategic Vision", "Book Strategy Call") -> rating line "4.9/5 BASED ON 180 VERIFIED REVIEWS" -> image strip -> logo strip "Trusted by the Industry's Most Ambitious Innovators" -> stats "Building Products Trusted Across Markets" (Founded, Startups Supported, Markets Served, Products Launched) -> services "Advisory & Solutions for Scalable Growth" (4 cards, counters "1 /04" … "4 /04") -> "Strategic Guidance for High-Growth Startups" (points "01, Deep Startup Expertise" … "04, Data-Driven Decisions") -> case studies "Proven Results Across Digital Strategy & Product Innovation" (cards with `Industry` + `Year`, e.g. "Fintech, 2025", "Healthcare, 2026") -> testimonials (name, role, company) -> "Trusted by 20k+ Organizations" -> pricing "From Concept to Full-Scale Delivery" (two tiers, "Most Popular" badge) -> insights (3 posts) -> FAQ "Got Questions? We're Here to Help" -> CTA "So, What Are We Building?".
- Typography: uppercase eyebrows everywhere ("ABOUT US", "STRATEGIC SOLUTIONS", "WHY CHOOSE US", "CASE STUDIES", "PRICING PLAN", "GET IN TOUCH"); "1 /04" fraction counters and "01 ," em-dash indices; Google Fonts family "Geist".
- `/projects`: eyebrow "PORTFOLIO", h1 "Our Work Speaks that Through Results", filter bar ("Show All", Branding & Design, Packaging, Mockups, Campaigning, Visual identity, Websites), cards with title + one-line description + two metric bullets (e.g. "+45% User Engagement", "2x Faster Transactions"); detail hrefs `/case-study/<slug>`. Several cards and descriptions are duplicated; some Industry labels conflict with card text (template data quality issue).
- Footer: social icons (Facebook, Instagram, X, LinkedIn), three link columns (Quick Links, Company, Contact & Others), bottom bar with logo, Privacy Policy, "© All rights reserved." and "Powered by Webflow".
- CTA wording: "Book Strategy Call", "Get Started", "Start Building", "Get in Touch", "View All Services", "View Details", "Explore More", "Start a Conversation", "Contact With Us".
- Class/script hints: `logo_marquee_content`, `marquee_inner`, `marquee_inner_element is_total_customer` (66 marquee mentions), `counter custom-heading-h2`, `w-tab` (50), `w-dropdown` (12), `sticky` (2); gsap 3.13/3.15 + ScrollTrigger + SplitText; `lenis@1.3.17`.

### Unverified / not observable via HTML fetch
- Marquee speed, counter count-up, tab switching, dropdown animations, smooth scroll, hover states.

### areniX translation (principles only)
- Uppercase eyebrow + large sentence-case headline is the most "corporate" pairing in the set; areniX should use it on Home, Services and Solutions pages (eyebrows written fresh, e.g. "SERVICES", "SELECTED WORK").
- "n / 04" fraction counters on service cards are a good alternative to plain 01/02 when a set is fixed and short.
- Stats row: four labelled numbers (Founded, Projects, Clients, Markets), only with true values; otherwise omit the row.
- Case-study cards with 2 outcome bullets each are persuasive but require real, client-approved metrics. Default areniX card = title + service + industry + year; add outcome bullets only when verified.
- Avoid Nexifye's duplicated/contradictory card data and multi-version nav; one canonical page per route.

---

## Synthesis matrix

| Principle | Source(s) | Home | Services | Work | Case study | Solutions | Footer | Dashboard |
|---|---|---|---|---|---|---|---|---|
| Uppercase eyebrow + large sentence-case heading | Nexifye, Monoform ("SCROLL TO EXPLORE"), Altreex eyebrows | Yes | Yes | Yes | Yes (label above title) | Yes | No | Page headers only |
| Section index "(01) … (06)" or "01." | Monoform, Altreex, Onart | Yes | Yes | Optional | No | Yes | Numbered nav 01 to 05 (Onart) | Optional on step wizards |
| Two-line stacked display heading | Visione, Onart | Hero only | No | No | No | No | No | No |
| Short eyebrow + 1-line descriptor under heading | Altreex, Nexifye | Yes | Yes | Yes | No | Yes | No | Yes (empty states) |
| Services as 3 to 4 numbered cards with capability tags | Monoform tags, Altreex numbering, Nexifye "n /04" | Yes | Yes (expanded) | No | No | Yes | No | No |
| Process: 4 named steps, 2 to 3 bullets each | Altreex, Monoform | Yes | Yes | No | No | Optional | No | No |
| Work index as `Title · Category · Year` with filter | Monoform `/work`, Nexifye filters | Preview (3 to 4) | No | Yes | No | No | No | No |
| Metadata row Service / Industry / Year / Client / Live site | Onart, Visione, Monoform | No | No | On cards (Service, Year) | Yes (above hero) | No | No | Project records in dashboard |
| Case body: Overview / Challenge / Approach / Results (numbered) | Visione, Onart, Monoform | No | No | No | Yes | No | No | No |
| Results as real numeric stats; else qualitative | Monoform, Nexifye | Stats row only if true | No | No | Yes | No | No | KPI tiles (real data) |
| "Next case study" single forward link + 2 "more projects" cards | Visione, Onart, Monoform | No | No | No | Yes | No | No | No |
| Reusable closing CTA (heading + button + direct email) | Altreex, Monoform, Onart | Yes | Yes | Yes | Yes | Yes | Above footer | No |
| Logo strip / trust line (only with real partners) | Altreex, Monoform, Nexifye | Optional | No | No | No | No | No | No |
| Testimonial: portrait, name, role (company if permitted) | Visione, Onart, Nexifye | Optional | Optional | No | Yes (if available) | No | No | No |
| Footer: brand statement, Sitemap, Social, Studio (address/phone), © line, legal links | Monoform, Nexifye | none | none | none | none | none | Yes | Minimal footer |
| Location line in hero | Visione | Yes | No | No | No | No | Address | No |
| FAQ as numbered list | Onart, Nexifye | No | Yes | No | No | Yes | No | Help page |
| Motion tooling (marquee, cursor, split text, smooth scroll) | All (hints only) | Optional, reduced-motion safe | Same | Same | Same | Same | No | None |
| One canonical route per page; no v1/v2/v3 duplicates | Anti-pattern from Nexifye | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Typography note: two of five templates load "Geist" and one loads "Google Sans" (all sans-serif). Rendered sizes/weights were not observed. areniX should choose its own sans-serif pairing (one display/UI family is enough) rather than reuse any template's.

---

## Live portfolio sites inventory

### Passion Nutrition Clinic, https://passion-nutrition-clinic.vercel.app/
- What it appears to be: website for "Passion Nutrition Clinic", a registered-dietitian-led nutrition clinic offering in-clinic and online consultations. No city/address shown. Hosted on vercel.app. Who built it is not stated on the page.
- Nav: Home `/`, Services `/services` (dropdown: Medical Nutrition Therapy, Weight Management, Nutrition Assessment), Blog `/blog`, Gallery `/gallery`, About `/about`, Contact `/contact`, button "Book a Consultation".
- Homepage sections in order: Hero "Registered Dietitian Led Care" / "Nutrition therapy that restores your health" (Watch Video) -> About ("Where clinical precision meets everyday wellness"; Prevention Through Food, Clinical Care That Restores) -> partner logos ("Trusted by the partners we work alongside") -> statement "The right nutrition changes everything" -> "What We Offer" (six numbered services 01 to 06 with "Learn more →") -> "Your journey to better health starts with understanding" -> "Care that fits your life, wherever you are" -> "Our Care Packages" (Consultation, Personalized Care, Complete Clinical Care; "Get Started") -> "Why Choose Us" (4 points) -> "What our clients say" (3 testimonials) -> "Contact Us" form (First Name, Last Name, Email, Phone, Message) -> "Ready to book instead?" -> "Insight and Advice" (4 blog teasers).
- Other routes linked: `/services/<slug>` (6), `/pricing`, `/appointment`, `/blog/<slug>` (4), `/gallery`, `/about`, `/contact`.
- Footer: tagline, links (About Us, Services, Pricing, Blog, Contact, Book an Appointment), newsletter Subscribe, 4 social icons (`#`), "Copyright © 2026 Passion Nutrition Clinic. All rights reserved.", Terms/Privacy/Cookie links (`#`).
- Suggested screenshot targets:
  - Desktop 1440x900: hero; "What We Offer" numbered services grid; "Our Care Packages" pricing cards; a service detail page (`/services/medical-nutrition-therapy`); `/appointment` booking page (form state only, unfilled).
  - Mobile 390x844: hero with nav collapsed; services list; packages stacked; footer.
- Private/user-data caution: testimonials currently show placeholder names ("Client nme", "City") and the phone is `+1 (000) 000-0000`, placeholders, fine to capture but ideally crop out. Do NOT capture any filled booking/contact form, any gallery image that shows identifiable patients, or any admin/appointment listing if one exists behind `/appointment`.

### CleNest, https://www.clenest.site
- What it appears to be: laundry, dry-cleaning and garment-care service "CleNest" in Ile-Ife, Osun State, Nigeria, with doorstep pickup/delivery priced by distance, order tracking and customer sign-in. Who built it is not stated on the page.
- Nav: Services, Pricing `/pricing`, How it works `/how-it-works`, Gallery `/gallery`, About `/about`, Careers `/careers`, Track order `/track`, Sign in `/login`, button "Book a pickup" `/book`.
- Homepage sections in order: Hero "Laundry care, reimagined in Ile-Ife" -> trust line -> three highlights (Handled with care, Quality checked, Tracked end to end) -> Services "Care for every kind of day." (item cards with prices and "Add to order" -> `/book?service=<item>`) -> "The CleNest standard" / "A better finish starts with a better process." -> How it works "Pickup. Care. Peace of mind." (Book, Pickup, Care, Deliver) -> Students "Routine laundry without losing your week." -> Businesses "Reliable care at the rhythm of your business." -> "Doorstep convenience, priced by distance." -> Gallery "Care you can see in every detail." -> Customer stories (states reviews will appear once orders are completed) -> Careers -> closing CTA "A cleaner, brighter tomorrow starts at your door." / "Book your first pickup".
- Other routes linked: `/services` and 9+ item pages (`/services/shirt` … `/services/wedding-special-occasion-dress`), `/services/home-cleaning`, `/services/hotels-and-suites`, `/services/schools-and-universities`, `/student-laundry`, `/business`, `/plans`, `/dashboard`, `/contact`, `/privacy`, `/terms`, `/refund-policy`, `/laundry-care-policy`, `/cookie-policy`; WhatsApp deep link with prefilled message.
- Footer: tagline "Where clean meets care.", Explore column, Client column (Book Laundry, Track Order, Monthly Plans, …, Client Dashboard, Contact), Contact column (phone 08117130378, email clenest400@gmail.com, address "Line 2, Modomo, Ibadan Road, Ile-Ife, Osun State, Nigeria."), "© 2026 CleNest. A cleaner, brighter tomorrow.", legal links.
- Suggested screenshot targets:
  - Desktop 1440x900: hero; services/price cards with "Add to order"; "How it works" steps; `/pricing`; `/how-it-works`; `/book` (empty form only); `/track` (empty state only).
  - Mobile 390x844: hero; service cards stacked; how-it-works; booking entry screen (empty).
- Private/user-data caution: `/login`, `/dashboard`, `/track` with any real order, and any booking form with customer details must NOT be captured. Footer shows business phone/email/address (business contact data; acceptable but consider cropping the phone/email in portfolio images). Gallery photos should be checked for identifiable customers before use.

---

## Explicit non-copy rules

1. No reference asset of any kind (images, icons, illustrations, videos, logos, decorative shapes, fonts bundled with a template) is to be downloaded or reused in areniX.
2. No reference copy is to be reused. Headlines, eyebrows, CTA labels, process-step names, FAQ questions and testimonials for areniX are written from scratch. Generic verbs ("Get in touch", "View all work") are fine; distinctive phrasing (e.g. "We design brands that refuse to blend in.", "A calm process for bold outcomes.", "Work we're proud to sign.") is not.
3. No reference layout is to be reproduced section-for-section. Section ORDER may be informed by the synthesis matrix, but areniX's Home must be composed from areniX's own content needs, not cloned from any one template.
4. No CSS, class names, Webflow interactions, GSAP timelines or template JavaScript are to be copied. Any motion is designed independently, kept subtle, and gated by `prefers-reduced-motion`.
5. No brand names, client names, award names, statistics, ratings ("4.9/5…", "20k+…", "120+…") or metrics from references are to appear in areniX. All numbers on areniX must be true and verifiable by the company.
6. Portfolio screenshots of Passion Nutrition Clinic and CleNest are used only with the owners' permission, show public pages only, exclude any authenticated area or submitted form data, and are credited factually (what the site is) without claims not confirmed by the client.
7. Template utility pages (Style Guide, Licenses, Changelog, Instructions, 401/404 showcases) are template artefacts and are not to be mirrored as public routes.
8. This document records observations from static fetches on 2026-10-19; anything described as a hover, scroll or motion effect in future design discussion must be re-verified in a browser before being cited as a reference behaviour.
