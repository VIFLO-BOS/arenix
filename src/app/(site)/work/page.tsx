import type { Metadata } from "next";
import { getPublicSettings, getPublishedProjects } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { WorkGrid } from "@/components/portfolio/work-grid";
import { ProjectCard } from "@/components/portfolio/project-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { Aurora } from "@/components/motion/aurora";
import { Tilt } from "@/components/motion/tilt";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Work",
  description: "Selected software, websites and business systems designed and engineered by areniX. Real screenshots, honest status labels, and private systems described without exposing data.",
  path: "/work",
});

const capabilities = [
  { k: "Public websites", v: "Marketing and service websites with booking, ordering and content management." },
  { k: "Operations platforms", v: "Staff, inventory, branches and reporting reconciled in one system." },
  { k: "Education products", v: "Learning platforms with enrolment, content and progress tracking." },
  { k: "Mobile companions", v: "React Native apps that share an API with the web product." },
];

export default async function WorkPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const sp = await searchParams;
  const [projects, settings] = await Promise.all([getPublishedProjects(), getPublicSettings()]);
  const featured = projects.find((p) => p.featured && p.coverMedia?.approvedForPublication) ?? projects[0];
  const live = projects.filter((p) => p.status === "LIVE").length;
  const inDev = projects.filter((p) => p.status === "IN_DEVELOPMENT").length;
  const privateCount = projects.filter((p) => p.status === "PRIVATE").length;

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-work" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Work">Portfolio</Eyebrow>
            <SplitLines as="h1" text="Software we have shipped, and what it does." accent="shipped" className="text-display-xl mt-6 max-w-[18ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">Every image here is an authentic screenshot or is labelled as something else. Status badges mean what they say.</p>
            </Reveal>
            <Reveal delay={0.3}>
              <dl className="mt-8 grid grid-cols-2 gap-4 xs:grid-cols-4">
                {[
                  ["Projects", projects.length],
                  ["Live", live],
                  ["In development", inDev],
                  ["Private systems", privateCount],
                ].map(([k, v]) => (
                  <div key={String(k)} className="card card-sm p-4">
                    <dt className="text-micro text-muted">{k}</dt>
                    <dd className="mt-1 font-display text-2xl font-semibold text-accent">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <Tilt>
              <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
                <TopicImage image="enterprise" className="aspect-[16/11] rounded-[inherit]" priority />
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      {featured && (
        <Section surface="dark" className="pt-0">
          <div className="container-x">
            <Eyebrow index="01" className="mb-6">
              Featured
            </Eyebrow>
            <Reveal>
              <ProjectCard project={featured} size="lg" priority />
            </Reveal>
          </div>
        </Section>
      )}

      <Section surface="light" id="all">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="All projects" title="Filter by service, industry or status." size="md" className="mb-10" />
          <WorkGrid projects={projects} initialService={sp.service} />
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x">
          <SectionHeading index="03" eyebrow="Capabilities" title="What the portfolio demonstrates." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((c) => (
              <StaggerItem as="li" key={c.k} className="hover-lift card p-6 hover:border-accent/50">
                <p className="font-display text-[1.05rem] font-semibold">{c.k}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.v}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <CtaBand surface="light" whatsappDigits={settings.contact.whatsappDigits} title="Have something similar in mind?" lead="Tell us about it. We will show you what is relevant from this work." />
    </>
  );
}
