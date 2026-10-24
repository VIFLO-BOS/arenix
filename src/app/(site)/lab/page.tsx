import type { Metadata } from "next";
import { getPublicSettings, getPublishedProjects } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { Badge, ProjectStatusBadge } from "@/components/ui/badge";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/portfolio/project-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";
import type { ImageKey } from "@/content/images";

export const metadata: Metadata = pageMetadata({
  title: "Innovation Lab",
  description: "Products in development and internal experiments at areniX. Status labels are honest and nothing is presented as shipped before it is.",
  path: "/lab",
});

const experiments: { title: string; summary: string; status: "Exploring" | "Prototype" | "Internal use"; art: ImageKey }[] = [
  { title: "Operations starter kit", summary: "A reusable foundation for staff, inventory and branch management systems, so new operations platforms start from tested modules.", status: "Internal use", art: "enterprise" },
  { title: "Honest portfolio tooling", summary: "Automated, sanitised screenshot capture for public projects, with approval flow for anything that might expose client data.", status: "Internal use", art: "code" },
  { title: "Offline first field app", summary: "A React Native pattern for data capture in low connectivity settings, syncing safely when the network returns.", status: "Prototype", art: "phone" },
  { title: "Reporting pipeline", summary: "Scheduled aggregation from operational databases into readable management reports without a separate warehouse.", status: "Exploring", art: "analytics" },
];

const tone = { Exploring: "outline", Prototype: "warning", "Internal use": "success" } as const;

export default async function LabPage() {
  const [projects, settings] = await Promise.all([getPublishedProjects(), getPublicSettings()]);
  const inDevelopment = projects.filter((p) => p.status === "IN_DEVELOPMENT" || p.status === "CONCEPT");

  return (
    <>
      <section data-surface="dark" className="grain relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-lab" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Lab">Innovation</Eyebrow>
            <SplitLines as="h1" text="What we are building before it is ready." className="text-display-xl mt-6 max-w-[18ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">Products in development and internal experiments. Every item carries its real status. Nothing here is presented as shipped.</p>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
              <TopicImage image="lab" className="aspect-[16/11] rounded-[inherit]" priority />
            </div>
          </Reveal>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="01" eyebrow="In development" title="Products on the way." lead="Portfolio entries marked In Development or Concept. Previews are labelled until real screens are approved." size="md" className="mb-10" />
          {inDevelopment.length > 0 ? (
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {inDevelopment.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <ProjectCard project={p} index={i} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="card card-dashed p-8">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-display font-semibold">Nothing in development is public right now</p>
                <ProjectStatusBadge status="IN_DEVELOPMENT" />
              </div>
              <p className="mt-2 text-sm text-fg-muted">Projects appear here when they are marked In Development and approved for publication.</p>
            </Reveal>
          )}
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="Experiments" title="Internal work that shapes client projects." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2">
            {experiments.map((e) => (
              <StaggerItem as="li" key={e.title} className="hover-lift flex h-full flex-col gap-5 card p-6 hover:border-accent/50">
                <div className="card card-sm">
                  <TopicImage image={e.art} className="aspect-[16/9] rounded-[inherit]" overlay="soft" sizes="(max-width: 640px) 100vw, 50vw" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-display text-[1.1rem] font-semibold">{e.title}</p>
                  <Badge tone={tone[e.status]}>{e.status}</Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted">{e.summary}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="03" eyebrow="Demos" title="Public demos." />
          </div>
          <Reveal className="card card-dashed p-6 lg:col-span-7">
            <p className="font-display font-semibold">No public demos at the moment</p>
            <p className="mt-2 text-sm text-fg-muted">When a demo environment is safe to share it is listed here with a clear description of what it does and does not include. Until then, ask us for a walkthrough.</p>
          </Reveal>
        </div>
      </Section>

      <CtaBand surface="dark" whatsappDigits={settings.contact.whatsappDigits} title="Curious about something here?" lead="Ask us. We are happy to walk through what we are building and why." />
    </>
  );
}
