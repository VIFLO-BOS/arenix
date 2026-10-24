import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getPublicSettings, getPublishedArticles } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/config/site";
import { formatDate } from "@/lib/utils";
import { ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section } from "@/components/ui/section-heading";
import { Markdown, headingsOf } from "@/components/ui/markdown";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal } from "@/components/motion/reveal";
import { ScrollScale } from "@/components/motion/scroll-scale";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { ReadingProgress } from "@/components/marketing/reading-progress";
import { CtaBand } from "@/components/marketing/cta-band";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getPublishedArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return pageMetadata({ title: article.title, description: article.excerpt, path: `/insights/${article.slug}`, type: "article", image: article.coverSrc });
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [article, all, settings] = await Promise.all([getArticleBySlug(slug), getPublishedArticles(), getPublicSettings()]);
  if (!article) notFound();

  const toc = headingsOf(article.content);
  const related = all.filter((a) => a.slug !== article.slug && (a.category === article.category || a.tags.some((t) => article.tags.includes(t)))).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@type": "Organization", name: siteConfig.legalName },
    datePublished: article.publishedAt,
    mainEntityOfPage: `${siteConfig.url}/insights/${article.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ReadingProgress targetId="article-body" />

      <section data-surface="dark" className="relative overflow-hidden pb-12 pt-28 sm:pt-32 lg:pt-36">
        <HeroBackdrop image="hero-insights" />
        <div className="container-x relative">
          <nav aria-label="Breadcrumb" className="text-micro flex items-center gap-2 text-muted">
            <Link href="/insights" className="link-underline hover:text-accent">
              Insights
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-accent">{article.category}</span>
          </nav>
          <SplitLines as="h1" text={article.title} className="text-display-lg mt-6 max-w-[24ch]" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">{article.excerpt}</p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="text-micro mt-6 flex flex-wrap gap-x-4 gap-y-2 text-muted">
              <span>{article.author}</span>
              {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
              <span>{article.readingTime} min read</span>
            </p>
          </Reveal>
        </div>
      </section>

      <section data-surface="dark" className="pb-14 lg:pb-20">
        <div className="container-x">
          <ScrollScale>
            <MaskReveal className="card">
              <TopicImage image="writing" className="aspect-[21/9] w-full rounded-[inherit]" overlay="soft" alt={article.coverAlt ?? "Photograph for this article"} sizes="100vw" />
            </MaskReveal>
          </ScrollScale>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              {toc.length > 0 && (
                <nav aria-label="Table of contents">
                  <Eyebrow>Contents</Eyebrow>
                  <ol className="mt-4 flex flex-col gap-2 border-l border-line">
                    {toc.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-6" : "pl-4"}>
                        <a href={`#${h.id}`} className="text-sm text-fg-muted transition-colors duration-500 hover:text-accent">
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              {article.tags.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-2">
                  {article.tags.map((t) => (
                    <li key={t} className="rounded-full border border-line-strong px-2.5 py-1 text-xs">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
          <article id="article-body" className="lg:col-span-8 lg:col-start-5">
            <Markdown content={article.content} />
          </article>
        </div>
      </Section>

      {related.length > 0 && (
        <Section surface="deep">
          <div className="container-x">
            <Eyebrow className="mb-8">Related reading</Eyebrow>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <li key={a.slug}>
                  <Link href={`/insights/${a.slug}`} className="hover-lift group flex h-full flex-col gap-3 card p-6 hover:border-accent">
                    <p className="text-micro text-accent">{a.category}</p>
                    <p className="font-display text-[1.05rem] font-semibold leading-snug transition-colors duration-500 group-hover:text-accent">{a.title}</p>
                    <span className="mt-auto inline-flex items-center gap-2 text-sm">
                      Read <ArrowIcon className="transition-transform duration-500 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <CtaBand surface="light" whatsappDigits={settings.contact.whatsappDigits} title="Working on something related?" lead="Tell us about it. We reply with questions, not a pitch." />
    </>
  );
}
