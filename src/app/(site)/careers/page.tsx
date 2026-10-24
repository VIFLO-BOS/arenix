import type { Metadata } from "next";
import { getCareers, getFaqs, getPublicSettings } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { OpeningsAccordion } from "@/components/marketing/openings-accordion";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description: "Work with areniX. How we hire, what we value in colleagues, and current openings when they exist.",
  path: "/careers",
});

const principles = [
  { k: "Ship real things", v: "You will work on software that organisations run their day on, not demos." },
  { k: "Own your slice", v: "Design, build, test and document a feature end to end. Ask for help early." },
  { k: "Write it down", v: "Decisions, runbooks and handovers are written, so knowledge outlives a chat thread." },
  { k: "Be honest about status", v: "Done means tested with real data. Blocked means say so today." },
];

export default async function CareersPage() {
  const [openings, faqs, settings] = await Promise.all([getCareers(), getFaqs("careers"), getPublicSettings()]);
  void settings;

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-careers" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Careers">Join us</Eyebrow>
            <SplitLines as="h1" text="Build software people depend on." className="text-display-xl mt-6 max-w-[16ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">A small team with high standards. Openings are published here when they exist, and only then.</p>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
              <TopicImage image="office" className="aspect-[16/11] rounded-[inherit]" priority />
            </div>
          </Reveal>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="01" eyebrow="How we work" title="What we expect from each other." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <StaggerItem as="li" key={p.k} className="hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent">
                <span className="num-chip">0{i + 1}</span>
                <p className="font-display text-[1.05rem] font-semibold">{p.k}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{p.v}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="deep" id="openings">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading index="02" eyebrow="Openings" title="Current roles." />
          </div>
          <div className="lg:col-span-8">
            {openings.length > 0 ? (
              <OpeningsAccordion openings={openings} />
            ) : (
              <Reveal className="card card-dashed p-8">
                <p className="font-display font-semibold">No current openings</p>
                <p className="mt-2 text-sm text-muted">There is no active hiring process right now. When a role opens it will be listed on this page with a full description and how to apply.</p>
                <div className="mt-6">
                  <Button href="/contact?subject=Careers%20enquiry" variant="secondary">
                    Send a general enquiry <ArrowIcon />
                  </Button>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading index="03" eyebrow="FAQ" title="About working here." />
          </div>
          <div className="lg:col-span-8">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </Section>
    </>
  );
}
