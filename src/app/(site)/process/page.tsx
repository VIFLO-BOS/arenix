import type { Metadata } from "next";
import { getPublicSettings } from "@/server/repositories/content";
import { processFixture } from "@/content/process";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { bookConsultationHref } from "@/lib/links";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ProcessTimeline } from "@/components/marketing/process-timeline";
import { CtaBand } from "@/components/marketing/cta-band";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Process",
  description: "How areniX runs a project from discovery to maintenance. Stages, deliverables and what to expect at each step.",
  path: "/process",
});

const expectations = [
  { k: "A named point of contact", v: "One person who knows your project end to end and answers within working hours." },
  { k: "Written, versioned proposals", v: "Scope, assumptions and price in a document you can compare across versions." },
  { k: "Working software early", v: "Thin vertical slices on a staging URL you can click through, not slide decks." },
  { k: "Your accounts, your code", v: "Hosting, domains and repositories are created in your name from day one." },
  { k: "Honest status", v: "Milestones are marked done only when they are tested with real data." },
  { k: "Documentation as we go", v: "Handover notes and runbooks are written during the project, not after it." },
];

export default async function ProcessPage() {
  const settings = await getPublicSettings();

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-process" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Process">How we work</Eyebrow>
            <SplitLines as="h1" text="Eight stages, each with something you can see." className="text-display-xl mt-6 max-w-[18ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">From the first conversation to long term maintenance. Every stage has a deliverable and a clear expectation of you and of us.</p>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
              <TopicImage image="planning" className="aspect-[16/11] rounded-[inherit]" priority />
            </div>
          </Reveal>
        </div>
      </section>

      <Section surface="dark" className="pt-0">
        <div className="container-x">
          <Stagger as="ol" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {processFixture.map((s) => (
              <StaggerItem as="li" key={s.index}>
                <a href={`#stage-${s.index}`} className="flex flex-col gap-2 card card-sm p-4 transition-colors duration-500 hover:border-accent">
                  <span className="num-chip">{s.index}</span>
                  <span className="text-sm font-medium leading-snug">{s.title}</span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="01" eyebrow="The stages" title="Discovery to maintenance." size="md" className="mb-12" />
          <ProcessTimeline steps={processFixture} />
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="What to expect" title="Promises we keep on every project." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expectations.map((e, i) => (
              <StaggerItem as="li" key={e.k} className="hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent/50">
                <span className="num-chip">0{i + 1}</span>
                <p className="font-display text-[1.05rem] font-semibold">{e.k}</p>
                <p className="text-sm leading-relaxed text-muted">{e.v}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-10">
            <Button href={bookConsultationHref({ type: "discovery" })} variant="accent">
              Start with discovery <ArrowIcon />
            </Button>
          </Reveal>
        </div>
      </Section>

      <CtaBand surface="light" whatsappDigits={settings.contact.whatsappDigits} title="Ready for stage one?" lead="A discovery conversation costs nothing and usually saves weeks." />
    </>
  );
}
