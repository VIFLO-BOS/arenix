import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getPublicSettings, getPublishedProjects, getServiceBySlug, getServices } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { bookConsultationHref, startProjectHref } from "@/lib/links";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ScrollScale } from "@/components/motion/scroll-scale";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { ServiceArt } from "@/components/marketing/service-rows";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBand } from "@/components/marketing/cta-band";
import { ProjectCard } from "@/components/portfolio/project-card";
import { BrowserFrame, ProjectMediaImage } from "@/components/portfolio/browser-frame";
import type { Service } from "@/types/content";
import { HeroBackdrop } from "@/components/media/topic-image";
import { serviceImage } from "@/content/images";

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service not found" };
  return pageMetadata({ title: service.title, description: service.summary, path: `/services/${service.slug}` });
}

const heroLayout: Record<Service["heroStyle"], string> = {
  grid: "lg:grid-cols-12",
  stack: "lg:grid-cols-12",
  frame: "lg:grid-cols-12",
  orbit: "lg:grid-cols-12",
  split: "lg:grid-cols-2",
  ledger: "lg:grid-cols-12",
  flow: "lg:grid-cols-12",
  cloud: "lg:grid-cols-12",
};

export default async function ServiceDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [service, services, projects, settings] = await Promise.all([getServiceBySlug(slug), getServices(), getPublishedProjects(), getPublicSettings()]);
  if (!service) notFound();

  const related = (await Promise.all(service.relatedProjectSlugs.map((s) => getProjectBySlug(s)))).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getProjectBySlug>>>[];
  const withMedia = related.find((p) => p.coverMedia?.approvedForPublication) ?? projects.find((p) => p.services.includes(service.title) && p.coverMedia?.approvedForPublication);
  const index = services.findIndex((s) => s.slug === service.slug);
  const next = services[(index + 1) % services.length];
  const isSplit = service.heroStyle === "split";

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image={serviceImage[service.slug] ?? "hero-services"} />
        <div className={`container-x relative grid gap-10 lg:items-center ${heroLayout[service.heroStyle]}`}>
          <div className={isSplit ? "" : "lg:col-span-6"}>
            <nav aria-label="Breadcrumb" className="text-micro flex items-center gap-2 text-muted">
              <Link href="/services" className="link-underline hover:text-accent">
                Services
              </Link>
              <span aria-hidden="true">/</span>
              <span className="num-chip">{service.index}</span>
            </nav>
            <SplitLines as="h1" text={service.title} className="text-display-xl mt-6 max-w-[16ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">{service.summary}</p>
            </Reveal>
            <Reveal delay={0.3} className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
              <Button href={startProjectHref({ service: service.title })} variant="accent" size="lg">
                Request a quote <ArrowIcon />
              </Button>
              <Button href={bookConsultationHref({ service: service.title })} variant="secondary" size="lg">
                Book a consultation
              </Button>
            </Reveal>
          </div>
          <div className={isSplit ? "" : "lg:col-span-6"}>
            <ScrollScale>
              <MaskReveal direction="left" delay={0.2}>
                {withMedia ? (
                  <BrowserFrame url={withMedia.title} className="shadow-[0_40px_90px_-40px_rgba(2,10,30,0.9)]">
                    <div className="relative aspect-[16/10]">
                      <ProjectMediaImage media={withMedia.coverMedia} title={withMedia.title} status={withMedia.status} sizes="(max-width: 1024px) 100vw, 50vw" priority />
                    </div>
                  </BrowserFrame>
                ) : (
                  <div className="card shadow-[0_40px_90px_-40px_rgba(2,10,30,0.9)]">
                    <ServiceArt style={service.heroStyle} slug={service.slug} className="aspect-[16/10] rounded-[inherit]" />
                  </div>
                )}
              </MaskReveal>
            </ScrollScale>
            {withMedia && <p className="text-micro mt-3 text-muted">Shown. {withMedia.title}, an authentic screenshot.</p>}
          </div>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="01" eyebrow="Overview" title="What this service is for." />
          </div>
          <div className="prose-editorial lg:col-span-7">
            <p>{service.description}</p>
          </div>
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading index="02" eyebrow="Problems we solve" title="Where it usually starts." size="sm" className="mb-8" />
            <Stagger as="ul" className="flex flex-col gap-3">
              {service.problems.map((p) => (
                <StaggerItem as="li" key={p} className="flex gap-4 card card-sm p-4 transition-colors duration-500 hover:border-accent/50">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <p className="text-sm leading-relaxed text-muted">{p}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div>
            <SectionHeading index="03" eyebrow="Deliverables" title="What you receive." size="sm" className="mb-8" />
            <Stagger as="ul" className="flex flex-col gap-3">
              {service.deliverables.map((d) => (
                <StaggerItem as="li" key={d} className="flex gap-4 card card-sm p-4 transition-colors duration-500 hover:border-accent/50">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <p className="text-sm leading-relaxed text-muted">{d}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="04" eyebrow="Workflow" title="How the engagement runs." size="md" className="mb-12" />
          <Stagger as="ol" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {service.workflow.map((w, i) => (
              <StaggerItem as="li" key={w.title} className="hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent">
                <span className="num-chip">0{i + 1}</span>
                <p className="font-display text-[1.05rem] font-semibold">{w.title}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{w.detail}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="dark">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="05" eyebrow="Technical approach" title="How we build it." />
          </div>
          <div className="prose-editorial lg:col-span-7">
            <p>{service.technicalApproach}</p>
            <p>
              Related stack on the <Link href="/technologies">Technologies</Link> page.
            </p>
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section surface="light">
          <div className="container-x">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading index="06" eyebrow="Related case studies" title="Where we have done this." size="md" />
              <Button href="/work" variant="link">
                All work <ArrowIcon />
              </Button>
            </div>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <ProjectCard project={p} index={i} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      {service.faqs.length > 0 && (
        <Section surface="deep">
          <div className="container-x grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading index="07" eyebrow="FAQ" title="Specific to this service." />
            </div>
            <div className="lg:col-span-8">
              <FaqAccordion items={service.faqs} />
            </div>
          </div>
        </Section>
      )}

      <CtaBand surface="light" service={service.title} whatsappDigits={settings.contact.whatsappDigits} title={`Ready to talk about ${service.shortTitle ?? service.title}?`} lead="Send the brief as you have it today. We will come back with questions, not a template." />

      {next && (
        <section data-surface="dark" className="relative overflow-hidden">
          <Link href={`/services/${next.slug}`} className="group container-x flex flex-col gap-4 py-14 transition-colors duration-700 sm:flex-row sm:items-center sm:justify-between lg:py-20">
            <div>
              <Eyebrow index={next.index}>Next service</Eyebrow>
              <p className="text-display-md mt-4 max-w-[18ch] transition-colors duration-700 group-hover:text-accent">{next.title}</p>
            </div>
            <ArrowIcon className="size-8 shrink-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3" />
          </Link>
        </section>
      )}
    </>
  );
}
