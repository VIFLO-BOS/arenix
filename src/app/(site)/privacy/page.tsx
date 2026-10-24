import type { Metadata } from "next";
import { getPublicSettings } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Eyebrow, Section } from "@/components/ui/section-heading";
import { Markdown, headingsOf } from "@/components/ui/markdown";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal } from "@/components/motion/reveal";
import { HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: "How areniX Technologies Limited collects, uses and protects information submitted through this website.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const settings = await getPublicSettings();
  const content = settings.legal.privacyMarkdown;
  const toc = headingsOf(content);

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-12 pt-28 sm:pt-32 lg:pt-36">
        <HeroBackdrop image="hero-legal" strength="light" />
        <div className="container-x relative">
          <Eyebrow index="Legal">Privacy</Eyebrow>
          <SplitLines as="h1" text="Privacy policy." className="text-display-lg mt-6" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">What we collect through this website, why, and the choices you have.</p>
          </Reveal>
          {!settings.legal.privacyReviewed && (
            <Reveal delay={0.25}>
              <p className="mt-6 inline-flex rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent">Draft. Pending legal review</p>
            </Reveal>
          )}
        </div>
      </section>

      <Section surface="light">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            {toc.length > 0 && (
              <nav aria-label="Sections" className="lg:sticky lg:top-28">
                <Eyebrow>Sections</Eyebrow>
                <ol className="mt-4 flex flex-col gap-2 border-l border-line">
                  {toc.map((h) => (
                    <li key={h.id} className="pl-4">
                      <a href={`#${h.id}`} className="text-sm text-fg-muted transition-colors duration-500 hover:text-accent">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            <Markdown content={content} />
          </div>
        </div>
      </Section>
    </>
  );
}
