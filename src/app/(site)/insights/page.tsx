import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSettings, getPublishedArticles } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { formatDate } from "@/lib/utils";
import { ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal } from "@/components/motion/reveal";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { InsightsList } from "@/components/marketing/insights-list";
import { CtaBand } from "@/components/marketing/cta-band";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Insights",
  description: "Notes from the areniX team on engineering, design, delivery and running software for real organisations.",
  path: "/insights",
});

export default async function InsightsPage() {
  const [articles, settings] = await Promise.all([getPublishedArticles(), getPublicSettings()]);
  const [featured, ...rest] = articles;

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-insights" />
        <Aurora tone="quiet" />
        <div className="container-x relative">
          <Eyebrow index="Insights">Writing</Eyebrow>
          <SplitLines as="h1" text="Notes on building software that lasts." className="text-display-xl mt-6 max-w-[18ch]" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">Short, practical articles from the team. Published when we have something worth saying, not on a schedule.</p>
          </Reveal>
        </div>
      </section>

      {featured && (
        <Section surface="dark" className="pt-0">
          <div className="container-x">
            <Eyebrow index="01" className="mb-6">
              Latest
            </Eyebrow>
            <Link href={`/insights/${featured.slug}`} className="group grid gap-8 card p-5 transition-colors duration-700 hover:border-accent lg:grid-cols-12 lg:items-center lg:p-8">
              <MaskReveal className="img-zoom rounded-xl lg:col-span-6">
                <TopicImage image="writing" className="aspect-[16/10] w-full rounded-xl" overlay="soft" />
              </MaskReveal>
              <div className="lg:col-span-6">
                <p className="text-micro flex flex-wrap items-center gap-3 text-muted">
                  <span className="text-accent">{featured.category}</span>
                  {featured.publishedAt && <span>{formatDate(featured.publishedAt)}</span>}
                  <span>{featured.readingTime} min read</span>
                </p>
                <h2 className="text-display-sm mt-4 transition-colors duration-700 group-hover:text-accent">{featured.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">{featured.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                  Read article <ArrowIcon className="transition-transform duration-500 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        </Section>
      )}

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="All articles" title="Browse by topic." size="md" className="mb-10" />
          {articles.length > 0 ? (
            <InsightsList articles={rest.length ? rest : articles} />
          ) : (
            <Reveal className="card card-dashed p-8 text-center">
              <p className="font-display font-semibold">No articles yet</p>
              <p className="mt-2 text-sm text-fg-muted">Writing is published here once it has been reviewed. Check back soon.</p>
            </Reveal>
          )}
        </div>
      </Section>

      <CtaBand surface="deep" whatsappDigits={settings.contact.whatsappDigits} title="Prefer a conversation to an article?" lead="Tell us what you are working on and we will share what is relevant." />
    </>
  );
}
