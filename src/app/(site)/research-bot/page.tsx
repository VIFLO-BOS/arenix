import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { Eyebrow, Section } from "@/components/ui/section-heading";
import { Markdown } from "@/components/ui/markdown";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal } from "@/components/motion/reveal";
import { HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "areniX research bot",
  description: "What the areniX research bot is, how it behaves on your website and how to stop it.",
  path: "/research-bot",
});

// Linked from the crawler's User-Agent. Public copy, so no dashes, colons, semicolons or hyphenated words.
const CONTENT = `## What it is

areniXResearchBot is a small research tool run by areniX Technologies Limited. It reads the public pages of business websites so our team can understand a business before offering our services. It identifies itself in every request with a user agent that contains areniXResearchBot and a link to this page.

## How it behaves

- It reads your robots.txt file first and follows it.
- It visits only a handful of pages, such as your home, about, services, team and contact pages, and waits between requests.
- It never logs in, never fills in forms, never runs your scripts and never tries to get past a login, a CAPTCHA or any other protection.
- It stops as soon as your site refuses it.
- It may ask Google PageSpeed Insights to check how fast your home page loads on a phone.

## What we keep

Your business name, public contact details such as a general email address or phone number, your website address and public facts about your website. Where your website names your leaders, we may keep their names and job titles with a note of where we found them. Our [privacy policy](/privacy) explains how long we keep it and your rights.

## How to stop it

To stop the bot reading your site, add these two lines to your robots.txt file.

\`\`\`
User-agent: areniXResearchBot
Disallow: /
\`\`\`

To ask us to delete what we hold about your business and never research or contact you again, tell us through the [Contact page](/contact) and include your website address.`;

export default function ResearchBotPage() {
  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-12 pt-28 sm:pt-32 lg:pt-36">
        <HeroBackdrop image="hero-legal" strength="light" />
        <div className="container-x relative">
          <Eyebrow index="Legal">Research bot</Eyebrow>
          <SplitLines as="h1" text="areniX research bot." className="text-display-lg mt-6" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">Why it visited your website, how it behaves and how to stop it.</p>
          </Reveal>
        </div>
      </section>
      <Section surface="light">
        <div className="container-x">
          <div className="max-w-3xl">
            <Markdown content={CONTENT} />
          </div>
        </div>
      </Section>
    </>
  );
}
