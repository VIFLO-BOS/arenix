import type { Metadata } from "next";
import { getPublicSettings, getServices } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ProjectRequestForm } from "@/components/forms/project-request-form";
import { HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Start a project",
  description: "Send areniX a project request. Three short steps covering your organisation, the brief, and budget and timeline. Attach documents if you have them.",
  path: "/start-project",
});

const steps = [
  { k: "About you", v: "Name, organisation and how to reach you." },
  { k: "The brief", v: "What you need, which service fits, and any links or files." },
  { k: "Budget and timeline", v: "A range is enough. We quote in a written proposal." },
];

export default async function StartProjectPage({ searchParams }: { searchParams: Promise<{ service?: string; project?: string; solution?: string }> }) {
  const sp = await searchParams;
  const [settings, services] = await Promise.all([getPublicSettings(), getServices()]);

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-start" />
        <Aurora tone="quiet" />
        <div className="container-x relative">
          <Eyebrow index="Start">Project request</Eyebrow>
          <SplitLines as="h1" text="Start a project with areniX." className="text-display-xl mt-6 max-w-[16ch]" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">Three short steps. Your progress is kept as you move between them, and you receive a reference number the moment it is saved.</p>
          </Reveal>
          {(sp.service || sp.project || sp.solution) && (
            <Reveal delay={0.25}>
              <p className="mt-5 inline-flex rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent">Context added. {sp.service ?? sp.project ?? sp.solution}</p>
            </Reveal>
          )}
        </div>
      </section>

      <Section surface="dark" className="pt-0">
        <div className="container-x">
          <Stagger as="ol" className="grid gap-3 sm:grid-cols-3">
            {steps.map((s, i) => (
              <StaggerItem as="li" key={s.k} className="flex gap-4 card p-5">
                <span className="num-chip">0{i + 1}</span>
                <div>
                  <p className="font-display font-semibold">{s.k}</p>
                  <p className="mt-1 text-sm text-muted">{s.v}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="light" id="form">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHeading index="01" eyebrow="The form" title="Tell us about the project." lead="Everything you enter is saved to our system and reviewed by a person. Nothing is auto quoted." />
              <div className="mt-8 card p-5">
                <p className="text-micro text-fg-muted">What happens next</p>
                <p className="mt-2 text-sm">We review the brief, reply with questions if needed, and propose a discovery call. Proposals are written and versioned.</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <ProjectRequestForm services={services.map((s) => s.title)} defaults={{ service: sp.service, project: sp.project, solution: sp.solution }} whatsappDigits={settings.contact.whatsappDigits} />
          </div>
        </div>
      </Section>
    </>
  );
}
