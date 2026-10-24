import type { Metadata } from "next";
import { getPublicSettings, getPublishedProjects } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Parallax } from "@/components/motion/parallax";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { ProjectMediaImage } from "@/components/portfolio/browser-frame";
import { CtaBand } from "@/components/marketing/cta-band";
import { Aurora } from "@/components/motion/aurora";
import { Tilt } from "@/components/motion/tilt";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "areniX Technologies Limited is a software company that designs and engineers websites, custom software, SaaS products and operations systems. Learn how we work and what we stand for.",
  path: "/about",
});

const values = [
  { k: "Evidence over adjectives", v: "We describe what a system does and show it. Metrics appear only when they can be verified." },
  { k: "Own the whole problem", v: "Design, engineering, infrastructure and documentation are one deliverable, not a handoff chain." },
  { k: "Small, deliberate releases", v: "Vertical slices that work end to end, tested with real data before anyone calls them done." },
  { k: "Respect for people's time", v: "Fast on ordinary phones, readable, accessible, and free of motion that gets in the way." },
  { k: "Security as a default", v: "Server side authorisation, audit trails and least privilege are part of the baseline, not a later phase." },
  { k: "Honest status", v: "In development means in development. Private means private. We never dress a concept as shipped software." },
];

export default async function AboutPage() {
  const [settings, projects] = await Promise.all([getPublicSettings(), getPublishedProjects()]);
  const withMedia = projects.filter((p) => p.coverMedia?.approvedForPublication);
  const location = settings.contact.showLocation ? [settings.contact.city, settings.contact.country].filter(Boolean).join(", ") : "";

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-about" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="About">areniX Technologies Limited</Eyebrow>
            <SplitLines as="h1" text="Technology partners for organisations that need software to actually work." accent="actually work" className="text-display-xl mt-6 max-w-[22ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">areniX designs and engineers digital products that help organisations work smarter, serve people better, and scale with confidence. We work as a focused team across design, engineering and operations.</p>
            </Reveal>
          </div>
          <Reveal delay={0.3} className="lg:col-span-5">
            <Tilt>
              <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
                <TopicImage image="team" className="aspect-[16/11] rounded-[inherit]" priority />
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <SectionHeading index="01" eyebrow="Who we are" title="Builders of complete systems." lead="Our portfolio spans public websites, service platforms, workforce and retail operations systems, and education products. Some are public. Some are private client systems we describe without exposing their data." />
            </div>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
            <Parallax speed={0.08}>
              <MaskReveal className="card">
                <div className="relative aspect-[16/11]">{withMedia[0] ? <ProjectMediaImage media={withMedia[0].coverMedia} title={withMedia[0].title} status={withMedia[0].status} sizes="(max-width: 1024px) 100vw, 50vw" /> : <ProjectMediaImage media={null} title="areniX" status="CONCEPT" />}</div>
              </MaskReveal>
            </Parallax>
            <div className="prose-editorial text-[var(--fg)]">
              <h2 className="!mt-0">Company story</h2>
              <p>areniX Technologies Limited was formed to build software for organisations whose needs did not fit off the shelf tools. Clinics that needed a credible public presence, service businesses that needed online ordering, and operations teams that needed staff, inventory and branch management to reconcile.</p>
              <p>We publish only verified history. Milestones, team details and client names appear on this page once the business owner approves them. We would rather show a short, true story than a long invented one.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section surface="dark">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <Reveal className="hover-lift card p-8 hover:border-accent/50 lg:p-10">
            <Eyebrow index="02">Vision</Eyebrow>
            <p className="mt-5 font-display text-[clamp(1.2rem,1.9vw,1.6rem)] font-semibold leading-snug">Software that moves ideas forward, for organisations of every size, on the devices people actually use.</p>
          </Reveal>
          <Reveal delay={0.1} className="hover-lift card p-8 hover:border-accent/50 lg:p-10">
            <Eyebrow index="03">Mission</Eyebrow>
            <p className="mt-5 font-display text-[clamp(1.2rem,1.9vw,1.6rem)] font-semibold leading-snug">Design and engineer dependable digital products, delivered transparently, that our clients can own and operate.</p>
          </Reveal>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="04" eyebrow="Values" title="What we hold ourselves to." size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <StaggerItem as="li" key={v.k} className="hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent">
                <span className="num-chip">0{i + 1}</span>
                <p className="font-display text-[1.05rem] font-semibold">{v.k}</p>
                <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{v.v}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="05" eyebrow="Approach" title="Engineering and design, together." />
          </div>
          <div className="prose-editorial lg:col-span-7">
            <p>Designers and engineers work on the same slice at the same time. Information architecture and data models are shaped together. Prototypes are tested on real devices from 250px wide upwards. Motion is specified with durations and easings and implemented exactly.</p>
            <p>On the engineering side we default to TypeScript, server side validation and authorisation, audit trails and simple infrastructure the client can own. We write documentation as we go, so handover is a formality rather than a project.</p>
          </div>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="06" eyebrow="Team and milestones" title="Published when verified." />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Reveal className="rounded-2xl border border-dashed border-[var(--line-strong)] p-6">
              <p className="font-display font-semibold">Leadership and team</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">Team profiles are shown here once the business owner authorises names, roles and photographs. We do not publish placeholder people.</p>
            </Reveal>
            <Reveal delay={0.05} className="rounded-2xl border border-dashed border-[var(--line-strong)] p-6">
              <p className="font-display font-semibold">Milestones</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Founding date, registrations and notable deliveries are listed after verification. Current verified portfolio is {projects.length} projects, {projects.filter((p) => p.isLiveUrlPublic).length} with public live sites.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="card p-6">
              <p className="font-display font-semibold">Where we work</p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">{location ? `Based in ${location}, working with clients remotely.` : "Working remotely with clients. The team operates on Lagos time. Office details are published once approved."}</p>
              <div className="mt-4">
                <Button href="/contact" variant="secondary" size="md">
                  Contact us <ArrowIcon />
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <CtaBand surface="dark" whatsappDigits={settings.contact.whatsappDigits} title="Work with a team that shows its work." lead="Tell us about your organisation and what needs to change." />
    </>
  );
}
