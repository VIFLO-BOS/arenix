import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getPublicSettings, getSolutionBySlug, getSolutions } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { bookConsultationHref, startProjectHref } from "@/lib/links";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ScrollScale } from "@/components/motion/scroll-scale";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { BrowserFrame, ProjectMediaImage } from "@/components/portfolio/browser-frame";
import { ProjectCard } from "@/components/portfolio/project-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";
import { sectorImage } from "@/content/images";

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getSolutions()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const solution = await getSolutionBySlug(slug);
  if (!solution) return { title: "Solution not found" };
  return pageMetadata({ title: `${solution.sector} solutions`, description: solution.summary, path: `/solutions/${solution.slug}` });
}

export default async function SolutionDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [solution, solutions, settings] = await Promise.all([getSolutionBySlug(slug), getSolutions(), getPublicSettings()]);
  if (!solution) notFound();

  const proof = (await Promise.all(solution.proofProjectSlugs.map((s) => getProjectBySlug(s)))).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getProjectBySlug>>>[];
  const hero = proof.find((p) => p.coverMedia?.approvedForPublication);
  const index = solutions.findIndex((s) => s.slug === solution.slug);
  const next = solutions[(index + 1) % solutions.length];
  const delivered = solution.capabilityStatus !== "proposed";

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-14 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
        <HeroBackdrop image={sectorImage[solution.slug] ?? "hero-solutions"} />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <nav aria-label="Breadcrumb" className="text-micro flex items-center gap-2 text-muted">
              <Link href="/solutions" className="link-underline hover:text-accent">
                Solutions
              </Link>
              <span aria-hidden="true">/</span>
              <span>{solution.sector}</span>
            </nav>
            <SplitLines as="h1" text={solution.title} className="text-display-xl mt-6 max-w-[16ch]" />
            <Reveal delay={0.2}>
              <p className="text-lead mt-6 text-muted">{solution.summary}</p>
            </Reveal>
            <Reveal delay={0.25} className="mt-5">
              <Badge tone={delivered ? "success" : "outline"}>{delivered ? "Delivered capability" : "Proposed capability"}</Badge>
            </Reveal>
            <Reveal delay={0.3} className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
              <Button href={startProjectHref({ solution: solution.sector })} variant="accent" size="lg">
                Start a project <ArrowIcon />
              </Button>
              <Button href={bookConsultationHref({ type: "discovery" })} variant="secondary" size="lg">
                Book a discovery call
              </Button>
            </Reveal>
          </div>
          <div className="lg:col-span-6">
            <ScrollScale>
              <MaskReveal direction="left" delay={0.2}>
                {hero ? (
                  <BrowserFrame url={hero.title} className="shadow-[0_40px_90px_-40px_rgba(2,10,30,0.9)]">
                    <div className="relative aspect-[16/10]">
                      <ProjectMediaImage media={hero.coverMedia} title={hero.title} status={hero.status} sizes="(max-width: 1024px) 100vw, 50vw" priority />
                    </div>
                  </BrowserFrame>
                ) : (
                  <div className="card shadow-[0_40px_90px_-40px_rgba(2,10,30,0.9)]">
                    <TopicImage image={sectorImage[solution.slug] ?? "workforce"} className="aspect-[16/10] rounded-[inherit]" priority />
                  </div>
                )}
              </MaskReveal>
            </ScrollScale>
            <p className="text-micro mt-3 text-muted">{hero ? `Shown. ${hero.title}, an authentic screenshot.` : "Stock photograph. No delivered screens are public for this sector yet."}</p>
          </div>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="01" eyebrow="Overview" title="The sector, as we understand it." />
          </div>
          <div className="prose-editorial lg:col-span-7">
            <p>{solution.description}</p>
          </div>
        </div>
      </Section>

      <Section surface="deep">
        <div className="container-x">
          <SectionHeading index="02" eyebrow="Needs" title="What organisations in this sector ask for." size="md" className="mb-10" />
          <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {solution.needs.map((n) => (
              <StaggerItem as="li" key={n} className="flex gap-4 card card-sm p-4 transition-colors duration-500 hover:border-accent/50">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <p className="text-sm leading-relaxed text-muted">{n}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="03" eyebrow="Use cases" title="What we would build." lead={delivered ? "Some of these are shipped and shown in the proof section below. The rest are scoped proposals." : "These are proposals based on our delivery experience in adjacent sectors."} size="md" className="mb-12" />
          <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solution.useCases.map((u, i) => (
              <StaggerItem as="li" key={u.title} className="hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent">
                <span className="num-chip">0{i + 1}</span>
                <p className="font-display text-[1.05rem] font-semibold">{u.title}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{u.detail}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <Section surface="dark">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="04" eyebrow="Workflow" title="How a typical rollout runs." size="sm" className="mb-8" />
            <Stagger as="ol" className="flex flex-col gap-3">
              {solution.workflow.map((w, i) => (
                <StaggerItem as="li" key={w} className="flex gap-4">
                  <span className="num-chip">0{i + 1}</span>
                  <p className="text-sm leading-relaxed text-muted">{w}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div className="lg:col-span-7">
            <SectionHeading index="05" eyebrow="Architecture notes" title="How it is built." size="sm" className="mb-8" />
            <div className="prose-editorial">
              <p>{solution.architectureNotes}</p>
            </div>
            <Reveal className="mt-8 card">
              <TopicImage image="server" className="aspect-[16/9] rounded-[inherit]" overlay="soft" />
            </Reveal>
          </div>
        </div>
      </Section>

      {proof.length > 0 && (
        <Section surface="light">
          <div className="container-x">
            <SectionHeading index="06" eyebrow="Proof" title="Delivered in this sector." size="md" className="mb-10" />
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {proof.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.08}>
                  <ProjectCard project={p} index={i} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>
      )}

      <CtaBand surface="deep" whatsappDigits={settings.contact.whatsappDigits} title={`Building for ${solution.sector.toLowerCase()}?`} lead="Tell us about your organisation. We will map the workflow first and propose software second." />

      {next && next.slug !== solution.slug && (
        <section data-surface="dark" className="relative overflow-hidden">
          <Link href={`/solutions/${next.slug}`} className="group container-x flex flex-col gap-4 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-20">
            <div>
              <Eyebrow>Next sector</Eyebrow>
              <p className="text-display-md mt-4 max-w-[18ch] transition-colors duration-700 group-hover:text-accent">{next.sector}</p>
            </div>
            <ArrowIcon className="size-8 shrink-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3" />
          </Link>
        </section>
      )}
    </>
  );
}
