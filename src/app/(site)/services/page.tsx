import type { Metadata } from "next";
import Link from "next/link";
import { getFaqs, getPublicSettings, getPublishedProjects, getServices } from "@/server/repositories/content";
import { processFixture } from "@/content/process";
import { pageMetadata } from "@/lib/metadata";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { ServiceRows } from "@/components/marketing/service-rows";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBand } from "@/components/marketing/cta-band";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Aurora } from "@/components/motion/aurora";
import { Tilt } from "@/components/motion/tilt";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "Services",
  description: "Custom software, corporate websites, SaaS product engineering, enterprise and operations systems, mobile apps, product design, integration and cloud consulting from areniX.",
  path: "/services",
});

const engagementModels = [
  { k: "Scoped project", v: "A defined release with a written, versioned proposal. Best for websites, MVPs and first versions of a system." },
  { k: "Phased programme", v: "Several scoped releases planned together, for operations platforms rolled out module by module." },
  { k: "Retained team", v: "Ongoing design and engineering capacity with product input, for products that keep evolving." },
  { k: "Maintenance and support", v: "Updates, monitoring and defined response expectations for systems we built or assessed." },
];

export default async function ServicesPage() {
  const [services, projects, faqs, settings] = await Promise.all([getServices(), getPublishedProjects(), getFaqs("services"), getPublicSettings()]);
  const relevant = projects.filter((p) => p.coverMedia?.approvedForPublication).slice(0, 3);

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image="hero-services" />
        <Aurora tone="quiet" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow index="Services">What we do</Eyebrow>
            <SplitLines as="h1" text="Design and engineering for products that have to work." accent="have to work" className="text-display-xl mt-6 max-w-[20ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">Eight service categories, one way of working. Understand the real workflow, ship working slices, prove it with the running product.</p>
            </Reveal>
            <Reveal delay={0.3}>
              <nav aria-label="Jump to section" className="mt-6 flex flex-wrap gap-2">
                {[
                  ["#categories", "Categories"],
                  ["#approach", "Approach"],
                  ["#stages", "Stages"],
                  ["#engagement", "Engagement"],
                  ["#faq", "FAQ"],
                ].map(([href, label]) => (
                  <a key={href} href={href} className="rounded-full border border-[rgba(246,243,234,0.2)] px-3 py-1.5 text-xs text-muted transition-colors duration-500 hover:border-accent hover:text-accent">
                    {label}
                  </a>
                ))}
              </nav>
            </Reveal>
          </div>
          <Reveal delay={0.25} className="lg:col-span-5">
            <Tilt>
              <div className="drift-slow card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.8)]">
                <TopicImage image="code" className="aspect-[16/11] rounded-[inherit]" priority />
              </div>
            </Tilt>
          </Reveal>
        </div>
      </section>

      <Section surface="dark" id="categories" className="pt-0">
        <div className="container-x">
          <SectionHeading index="01" eyebrow="Service categories" title="Indexed, not templated." lead="Each category is a distinct practice with its own problems, deliverables and workflow. Offerings not yet available are unpublished rather than oversold." size="md" className="mb-12" />
          <ServiceRows services={services} projects={projects} />
        </div>
      </Section>

      <Section surface="light" id="approach">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="02" eyebrow="Technical approach" title="One stack, applied deliberately." />
          </div>
          <div className="prose-editorial lg:col-span-7">
            <p>TypeScript end to end. Next.js for marketing sites and applications, Node.js services where a separate API is justified, MongoDB or PostgreSQL chosen by the shape of the data, React Native for mobile companions.</p>
            <p>Every boundary is validated with schemas. Permissions are enforced on the server. Integrations verify signatures and process events idempotently. Email goes through an outbox so failures are visible instead of silent.</p>
            <p>
              See the <Link href="/technologies">Technologies</Link> page for the full stack and which projects use what.
            </p>
          </div>
        </div>
      </Section>

      <Section surface="deep" id="stages">
        <div className="container-x">
          <SectionHeading index="03" eyebrow="Delivery stages" title="From discovery to maintenance." size="md" className="mb-12" />
          <Stagger as="ol" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {processFixture.map((s) => (
              <StaggerItem as="li" key={s.index} className="hover-lift flex flex-col gap-2 card card-sm p-5 hover:border-accent/50">
                <span className="num-chip">{s.index}</span>
                <p className="font-display text-[1.05rem] font-semibold">{s.title}</p>
                <p className="text-sm text-muted">{s.summary}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-10">
            <Button href="/process" variant="secondary">
              Full process <ArrowIcon />
            </Button>
          </Reveal>
        </div>
      </Section>

      <Section surface="light" id="engagement">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="04" eyebrow="Engagement models" title="How we can work together." lead="No published price list. Every engagement is quoted in a written, versioned proposal with explicit assumptions." />
          </div>
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {engagementModels.map((m) => (
              <StaggerItem as="li" key={m.k} className="hover-lift card p-6 hover:border-accent/50">
                <p className="font-display text-[1.05rem] font-semibold">{m.k}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">{m.v}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      {relevant.length > 0 && (
        <Section surface="dark">
          <div className="container-x">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading index="05" eyebrow="Relevant work" title="Services in practice." size="md" />
              <Button href="/work" variant="link">
                All work <ArrowIcon />
              </Button>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {relevant.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <ProjectCard project={p} index={i} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section surface="light" id="faq">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading index="06" eyebrow="FAQ" title="Questions we hear often." />
          </div>
          <div className="lg:col-span-8">
            <MaskReveal>
              <FaqAccordion items={faqs} />
            </MaskReveal>
          </div>
        </div>
      </Section>

      <CtaBand surface="gold" whatsappDigits={settings.contact.whatsappDigits} />
    </>
  );
}
