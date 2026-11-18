import type { Article, CareerOpening, Faq, Testimonial } from "@/types/content";
import { PRIVACY_POLICY, TERMS_OF_USE } from "./legal";

export const faqsFixture: Faq[] = [
  { id: "faq-1", scope: "general", sortOrder: 1, published: true, question: "What does areniX do?", answer: "areniX Technologies Limited designs and engineers digital products. Custom software, corporate websites, SaaS products, operations systems, mobile apps and the integrations and infrastructure around them." },
  { id: "faq-2", scope: "general", sortOrder: 2, published: true, question: "How do engagements usually start?", answer: "With a discovery conversation. You can request a consultation or send a project request. We review it and reply with questions or a proposed next step." },
  { id: "faq-3", scope: "services", sortOrder: 3, published: true, question: "Do you publish prices?", answer: "No. Every project is scoped and quoted individually in a written, versioned proposal with explicit assumptions." },
  { id: "faq-4", scope: "services", sortOrder: 4, published: true, question: "Which technologies do you use?", answer: "Primarily TypeScript with React, Next.js, Node.js, MongoDB or PostgreSQL, React Native for mobile, and cloud hosting such as Vercel. See the Technologies page for the full picture." },
  { id: "faq-5", scope: "contact", sortOrder: 5, published: true, question: "How quickly do you respond?", answer: "Inquiries are saved immediately with a reference number and reviewed by the team during working hours in Lagos. We respond using the contact method you choose." },
  { id: "faq-6", scope: "contact", sortOrder: 6, published: true, question: "Does chatting on WhatsApp create a ticket?", answer: "No. The WhatsApp button opens a normal chat with the official areniX business number. Only website forms are saved to our system automatically." },
  { id: "faq-7", scope: "careers", sortOrder: 7, published: true, question: "Can I apply if there are no open roles?", answer: "Openings are published here when they exist. If none are listed, there is no active hiring process at the moment." },
  { id: "faq-8", scope: "services", sortOrder: 8, published: true, question: "Who owns the code and accounts after a project?", answer: "You do. Source code, infrastructure and documentation are handed over, with a maintenance agreement available if you want us to keep operating the system." },
  { id: "faq-9", scope: "booking", sortOrder: 9, published: true, question: "Is a consultation request a confirmed appointment?", answer: "Not until we confirm it. If live scheduling is not enabled, your request is saved and the team proposes a time by email. The booking is confirmed once you accept." },
];

export const articlesFixture: Article[] = [
  {
    slug: "honest-portfolio-screenshots-and-case-studies",
    title: "Why our case studies use real screenshots, and what we do when we cannot show one",
    excerpt: "A short note on how areniX captures, sanitises and labels project media, and why a preview being prepared state is better than a fake one.",
    author: "areniX Engineering",
    category: "Engineering",
    tags: ["portfolio", "process", "trust"],
    readingTime: 4,
    published: true,
    publishedAt: "2026-10-19",
    content: `## The rule

Every image on a project card is either an authentic screenshot of that project or it is clearly labelled as something else. There is no third option.

That sounds obvious. In practice, agency portfolios drift. A mockup from a pitch becomes the product, a design concept is presented as shipped software, and a client's private dashboard appears with real names blurred just enough to be deniable. We decided not to do any of that.

## How we capture public projects

For projects that are publicly deployed we run an automated Playwright script against the live URL. It captures a 1440 by 900 desktop viewport and a 390 by 844 mobile viewport for a short list of pages we choose by hand, usually the homepage, services and one conversion page. Images are converted to WebP and stored with alt text that describes what is actually on screen.

The script deliberately skips anything that looks like a login, dashboard, account or tracking page. If a page contains contact details or testimonials we did not verify, we crop or skip it.

## What happens when there is nothing safe to show

Some of our work is private. Workforce systems with employee records, internal operations dashboards, products still in development. For those we show an editorial placeholder that says exactly what it is, *preview being prepared*, alongside a factual description of the system and its status.

Owners can approve sanitised screenshots later through the dashboard. Until then, the placeholder stays. A case study without a screenshot is still a case study. A case study with a fake screenshot is just marketing.

## Why this matters to clients

If you are evaluating a software partner, you are also evaluating how they handle your data and your reputation. A portfolio is the first place that shows.
`,
  },
];

export const careersFixture: CareerOpening[] = [];

export const testimonialsFixture: Testimonial[] = [];

/** Default Privacy policy and Terms of use. The texts live in legal.ts. */
export const legalFixture = { privacyMarkdown: PRIVACY_POLICY, termsMarkdown: TERMS_OF_USE };
