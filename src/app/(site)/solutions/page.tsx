import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSettings, getPublishedProjects, getSolutions } from "@/server/repositories/content";
import { industriesFixture } from "@/content/solutions";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { IndustrySwitcher } from "@/components/marketing/industry-switcher";
import { DashboardShowcase } from "@/components/marketing/dashboard-showcase";
import { CtaBand } from "@/components/marketing/cta-band";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Solutions",
  description: "Industry solutions from areniX for education, healthcare, retail, workforce, hospitality and startups. Delivered capability is labelled separately from proposed capability.",
  path: "/solutions",
});

const statusTone = { delivered: "success", proposed: "outline", mixed: "warning" } as const;
const statusLabel = { delivered: "Delivered", proposed: "Proposed", mixed: "Delivered and proposed" } as const;

const integrations = ["Payments", "Email and SMS", "Scheduling", "Accounting exports", "Identity providers", "Analytics", "Cloud storage", "WhatsApp Business"];

export default async function SolutionsPage() {
  const [solutions, projects, settings] = await Promise.all([getSolutions(), getPublishedProjects(), getPublicSettings()]);
  const industries = industriesFixture.filter((i) => solutions.some((s) => s.slug === i.key));

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-solutions" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Solutions">By industry</Eyebrow>
            <SplitLines as="h1" text="Systems shaped around how your sector actually works." className="text-display-xl mt-6 max-w-[20ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">Six sectors where we have delivered or scoped software. Each page separates what we have shipped from what we propose.</p>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
              <TopicImage image="enterprise" className="aspect-[16/11] rounded-[inherit]" priority />
            </div>
          </Reveal>
        </div>
      </section>

      <Section surface="dark" className="pt-0">
        <div className="container-x">
          <SectionHeading index="01" eyebrow="Industries" title="Use cases and delivered projects." size="md" className="mb-10" />
          <IndustrySwitcher industries={industries} projects={projects} />
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="Solution pages" title="Pick your sector." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s) => (
              <StaggerItem as="li" key={s.slug}>
                <Link href={`/solutions/${s.slug}`} className="hover-lift group flex h-full flex-col gap-4 card p-6 hover:border-accent">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-micro text-fg-muted">{s.sector}</p>
                    <Badge tone={statusTone[s.capabilityStatus]}>{statusLabel[s.capabilityStatus]}</Badge>
                  </div>
                  <p className="font-display text-[1.15rem] font-semibold leading-snug transition-colors duration-500 group-hover:text-accent">{s.title}</p>
                  <p className="text-sm leading-relaxed text-fg-muted">{s.summary}</p>
                  <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium">
                    View solution <ArrowIcon className="transition-transform duration-500 group-hover:translate-x-1" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x">
          <SectionHeading index="03" eyebrow="Software showcase" title="Real screens from delivered systems." lead="Authentic screenshots in device frames. Private systems appear as labelled previews until the owner approves sanitised screens." size="md" className="mb-12" />
          <DashboardShowcase projects={projects} />
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <SectionHeading index="04" eyebrow="Integrations" title="Connected to the tools you already run." lead="Integrations are verified, idempotent and logged. Below are categories we have built against or scoped." />
            <Reveal delay={0.1}>
              <ul className="mt-8 flex flex-wrap gap-2">
                {integrations.map((i) => (
                  <li key={i} className="rounded-full border border-line-strong px-3 py-1.5 text-sm transition-colors duration-500 hover:border-accent hover:text-accent">
                    {i}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.15} className="mt-8">
              <Button href="/services/api-integration-automation" variant="secondary">
                Integration and automation service <ArrowIcon />
              </Button>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="lg:col-span-6">
            <div className="card">
              <TopicImage image="payments" className="aspect-[16/10] rounded-[inherit]" overlay="soft" />
            </div>
          </Reveal>
        </div>
      </Section>

      <CtaBand surface="dark" whatsappDigits={settings.contact.whatsappDigits} title="Not sure which solution fits?" lead="Book a discovery call. We will map your workflow before suggesting software." />
    </>
  );
}
