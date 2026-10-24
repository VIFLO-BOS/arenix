# Portfolio System — Real Screenshot Galleries, Case Studies & Live Links

## User-critical requirement

**Every project card must feature an image of an actual page or authentic UI of that project.** Users can:

- Click the project picture or title → **internal** `/work/[slug]` case-study page.
- Click **View Case Study** → same internal case-study route.
- Click **Visit Website / Open App** → **real public deployed URL** in a new tab *if known, reachable and approved*.
- View more genuine screenshots inside case studies: homepage, services, workflow, dashboard, mobile, other functional pages (as relevant).

Display **In Development**, **Private System**, **Concept**, **Live**, or **Completed** clearly. A private system may have screenshots only if sanitized/authorized; it must not offer a public live URL or unauthorized demo credentials. Case studies remain viewable without live URLs.

## Initial records — no fabricated URLs

| Project | Focus | Known public URL | Media recommendation | Status/data rule |
|---|---|---|---|---|
| Passion Nutrition Clinic | Healthcare and nutrition website | https://passion-nutrition-clinic.vercel.app/ | Actual homepage, services, contact/booking section, mobile viewport | Verify current live state and what areniX built |
| Paylio Staff Management | Staff and workforce operations | **Not supplied** | Sanitized employee table/management/approval workflow | Private/client system; permission first |
| Paylio Dashboard | Admin and operations reporting | **Not supplied** | Permission-approved sanitized dashboard charts/pages | Link to staff system case study if same platform |
| netHuk | Product under development | **Not supplied** | Actual development screenshots or branded **preview pending** state | **In Development**; do not guess features |
| CleNest | Cleaning/laundry ordering and service operations | https://www.clenest.site | Homepage, pricing/services, customer order flow, dashboard only if safe | Verify accessible public and approved private UI |
| ArenoX LMS | LMS/education product | **Not supplied** | Landing, courses, student/instructor/admin roles where safe | Verify status and exact deployed URL |
| Annotrix | Assessment platform | **Not supplied** | Exam interface, admin test setup, analytics if safe | Verify deployed status and details |
| AreniX Branch Manager | Retail management solution | **Not supplied** | POS/inventory/dashboard/sales interface | Do not imply client deployment unless verified |

Other verified projects can be added through admin CMS. Avoid counting a single platform twice as separate clients merely because it has two modules.

## Screenshot pipeline

### For publicly accessible projects

1. Retrieve the actual live URL from approved `project.liveUrl`.
2. Inspect pages and list the URLs/sections selected as evidence.
3. Capture screenshots using an allowed Playwright browser run. Suggested sizes: 1440×900 desktop, 390×844 mobile; optional full-page captures for gallery sections.
4. Do not capture login screens with passwords/tokens, private user information, cookies, or proprietary information without permission.
5. Crop/place within original, reusable browser/device mockups; don't falsify interface states.
6. Optimize images to WebP/AVIF where supported. Preserve accessible alt text and a sensible aspect ratio.
7. Store in object storage or static approved assets and reference through typed media records.
8. Run visual QA to ensure the thumbnail actually corresponds to that project.

### For private or unfinished projects

1. Request approval for public case study/screenshots from authorized owner.
2. Use manually provided, permission-approved sanitized UI captures or purpose-built illustrative mockups **clearly labeled** as concept/previews.
3. Never publish real staff names, salaries, email addresses, phone numbers, bank details, admin tokens, user lists, client IPs or private business records.
4. If no usable screenshot exists, render an editorial designed placeholder **“Preview being prepared”** or genuine abstract product illustration identified as non-product media; do not pretend it is a real app screenshot.

## Portfolio card anatomy

- Primary image of actual homepage/application page (`image.alt` descriptive)
- Project title and short description
- Industry / service category
- Technical stack labels only if verified
- Current project status
- **View Case Study** internal link
- **Visit Website** external link if `liveUrl && isPublic && approved`; `target="_blank" rel="noopener noreferrer"`
- Optional `View GitHub` only when a repository is legitimately public/approved
- Optional preview switcher with 2–3 screenshots using arrows/dots on touch; hover crossfade on precise-pointer devices
- Loading skeleton, errors and missing-media safe state

Cards support keyboard focus and clear separate click targets; don't nest links inside links or cause ambiguous click areas.

## Case study content schema

```ts
type ProjectStatus = 'LIVE' | 'COMPLETED' | 'IN_DEVELOPMENT' | 'CONCEPT' | 'PRIVATE';

type ProjectMedia = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  kind: 'screenshot' | 'video' | 'illustration' | 'device-mockup';
  pageLabel?: string;
  isAuthenticScreenshot: boolean;
  approvedForPublication: boolean;
  width?: number;
  height?: number;
  sortOrder: number;
};

type PortfolioProject = {
  slug: string;
  title: string;
  teaser: string;
  description: string;
  clientOrOwner?: string;
  publishedRole?: string;
  industry?: string;
  services: string[];
  technologies: string[];
  status: ProjectStatus;
  year?: number; // Only when verified
  coverMedia?: ProjectMedia;
  gallery: ProjectMedia[];
  challenge?: string;
  goals?: string[];
  approach?: string;
  features: string[];
  outcomes?: string[]; // Genuine verifiable statements only
  liveUrl?: string;
  repoUrl?: string;
  isLiveUrlPublic: boolean;
  approvedForPublication: boolean;
  featured: boolean;
  sortOrder: number;
  publishedAt?: string;
};
```

## Case study layout & interaction

**Use the Onart Voyage page as a key structural influence**, then add software-specific proof:

1. Animated editorial project header (`PROJECT / title`, intro, key metadata).
2. Large featured **real screenshot** framed as browser or product preview.
3. Project brief, context, contributions and permission-safe details.
4. Challenge → engineering response → features.
5. Full-width high-resolution screenshot sequences with clear captions (`Homepage`, `Dashboard`, `Settings`, etc.).
6. Optional **interactive image gallery/lightbox** and keyboard/touch controls, zoom limits, next/previous.
7. Device comparisons (mobile/desktop) only when captured from actual responsive UI.
8. Architecture/technology stack visual if approved.
9. Real outcome or honest development status; no invented revenue or performance lifts.
10. Actual live project CTA when valid; otherwise `Private Client System` or `In Development` status + project inquiry CTA.
11. Related projects (real CMS relation), next-project title/reveal, back-to-work.

### Advanced (optional) interactive preview

A screenshot story may switch through `Homepage → Product Page → Dashboard` as the viewer scrolls, but do not make the user watch an inaccessible slideshow to find important content. Provide a manual gallery and reduced-motion/static counterpart. Never embed a private admin panel into the marketing site.

## CMS requirements

Admin must upload/update/reorder project screenshots, set cover image, media type, alt/caption, status, preview order, published URL, repository URL, industry/tags, featured order, draft/publish, approvals and related projects. Validate URL scheme (`https://`), image MIME/type/size/dimensions, access control and safe storage. Publishing requires explicit content approval state for confidential client work.

## Exact link behavior

- Known external: Passion Nutrition Clinic → `https://passion-nutrition-clinic.vercel.app/`.
- Known external: CleNest → `https://www.clenest.site`.
- All others: `liveUrl: null` until owner supplies and approves URL.
- Internal `View Case Study` works for every **published** project record.
- No disabled “Visit Live” button styled as if it works; omit it and show reason/status instead.
- Revalidate external URLs before publishing; a temporarily down site must not generate a fake claim that it is live.

## Acceptance tests

- Every featured project has the correct brand/title/media pairing.
- `View Case Study` navigates correctly, including keyboard and browser back.
- `Visit Website` uses the exact provided/verified destination and opens safely.
- Private/not-yet-live entries never show a forged public link.
- Screenshots render responsively, have meaningful alt text, and never leak private data.
- Galleries work with arrow keys/Escape/swipe where supported.
- Project filters/search reliably update visible results and accessible status announcements.
