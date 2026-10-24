import type { Metadata } from "next";
import { getPublicSettings, getPublishedProjects, getTechnologies } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Aurora } from "@/components/motion/aurora";
import { bookConsultationHref } from "@/lib/links";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { TechGrid, TechMarquee } from "@/components/marketing/tech-grid";
import { CtaBand } from "@/components/marketing/cta-band";
import { ArchitectureIllustration } from "@/components/illustrations/tech-illustrations";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Technologies",
  description: "The technology stack areniX builds with. TypeScript, React, Next.js, Node.js, MongoDB, PostgreSQL, React Native, cloud deployment and the principles behind each choice.",
  path: "/technologies",
});

const principles = [
  { k: "TypeScript everywhere", v: "One language across web, API, mobile and tooling. Fewer handoffs, fewer surprises in production." },
  { k: "Validate at the edge", v: "Every form, API route and webhook is parsed with a schema before any business logic runs." },
  { k: "Authorise on the server", v: "Roles and permissions are enforced where data lives, never only in the interface." },
  { k: "Simple to operate", v: "Managed hosting, one database, an outbox for email, and documentation the client can follow without us." },
  { k: "Measure, then optimise", v: "Performance budgets on real devices. Images sized, fonts subset, motion disabled where the user asks." },
  { k: "Idempotent integrations", v: "Webhooks verify signatures and are safe to replay. Payments and bookings never double process." },
];

export default async function TechnologiesPage() {
  const [technologies, projects, settings] = await Promise.all([getTechnologies(), getPublishedProjects(), getPublicSettings()]);

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-technologies" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Stack">Technologies</Eyebrow>
            <SplitLines as="h1" text="A deliberate stack, chosen for longevity." className="text-display-xl mt-6 max-w-[18ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">We standardise on tools we can support for years, and we show which portfolio projects use each one.</p>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
              <TopicImage image="cloud" className="aspect-[16/11] rounded-[inherit]" priority />
            </div>
          </Reveal>
        </div>
      </section>

      <section data-surface="dark" className="border-y border-line py-6">
        <TechMarquee technologies={technologies} />
      </section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="01" eyebrow="Principles" title="Why we choose what we choose." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <Section surface="deep" id="stack">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="The stack" title="Grouped by layer, linked to work." lead="Filter by category. Each technology lists the portfolio projects it appears in." size="md" className="mb-10" />
          <TechGrid technologies={technologies} projects={projects} />
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <SectionHeading index="03" eyebrow="Reference architecture" title="How the pieces fit together." lead="A typical areniX system. A Next.js application with server actions, a MongoDB or PostgreSQL database, an email outbox, verified webhooks and a mobile companion sharing the same API." />
            <Reveal delay={0.1} className="mt-8">
              <Button href={bookConsultationHref({ type: "consulting" })} variant="secondary">
                Book a technical consultation <ArrowIcon />
              </Button>
            </Reveal>
          </div>
          <MaskReveal className="card lg:col-span-7">
            <ArchitectureIllustration className="rounded-[inherit]" />
          </MaskReveal>
        </div>
      </Section>

      <CtaBand surface="dark" whatsappDigits={settings.contact.whatsappDigits} title="Want a second opinion on your architecture?" lead="We review existing systems and propose migrations with the same honesty we apply to our own work." />
    </>
  );
}
