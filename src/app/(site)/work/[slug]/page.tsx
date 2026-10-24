import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug, getPublicSettings, getPublishedProjects } from "@/server/repositories/content";
import { pageMetadata } from "@/lib/metadata";
import { hostnameOf, isSafeExternalUrl } from "@/lib/links";
import { Button, ArrowIcon, ExternalIcon } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ScrollScale } from "@/components/motion/scroll-scale";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { BrowserFrame, PhoneFrame, ProjectMediaImage } from "@/components/portfolio/browser-frame";
import { ProjectGallery } from "@/components/portfolio/project-gallery";
import { ProjectCard } from "@/components/portfolio/project-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { PROJECT_STATUS_LABEL } from "@/types/content";

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getPublishedProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project not found" };
  return pageMetadata({ title: project.title, description: project.teaser, path: `/work/${project.slug}`, image: project.coverMedia?.approvedForPublication ? project.coverMedia.src : undefined });
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [project, all, settings] = await Promise.all([getProjectBySlug(slug), getPublishedProjects(), getPublicSettings()]);
  if (!project) notFound();

  const index = all.findIndex((p) => p.slug === project.slug);
  const next = all[(index + 1) % all.length];
  const related = project.relatedSlugs.map((s) => all.find((p) => p.slug === s)).filter(Boolean) as typeof all;
  const approvedGallery = project.gallery.filter((m) => m.approvedForPublication).sort((a, b) => a.sortOrder - b.sortOrder);
  const desktopShot = approvedGallery.find((m) => m.device === "desktop") ?? project.coverMedia;
  const mobileShot = approvedGallery.find((m) => m.device === "mobile");
  const showLive = project.isLiveUrlPublic && isSafeExternalUrl(project.liveUrl);

  const meta: [string, string | undefined][] = [
    ["Client or owner", project.clientOrOwner],
    ["Our role", project.publishedRole],
    ["Industry", project.industry],
    ["Year", project.year ? String(project.year) : undefined],
    ["Status", PROJECT_STATUS_LABEL[project.status]],
    ["Services", project.services.join(", ")],
  ];

  return (
    <>
      <section data-surface="dark" className="relative overflow-hidden pb-10 pt-28 sm:pt-32 lg:pt-36">
        <div className="flare right-[-15%] top-[-20%]" aria-hidden="true" />
        <div className="container-x relative">
          <nav aria-label="Breadcrumb" className="text-micro flex items-center gap-2 text-muted">
            <Link href="/work" className="link-underline hover:text-accent">
              Work
            </Link>
            <span aria-hidden="true">/</span>
            <span>Project</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ProjectStatusBadge status={project.status} />
            {project.industry && <span className="text-micro text-muted">{project.industry}</span>}
          </div>
          <SplitLines as="h1" text={project.title} className="text-display-xl mt-5 max-w-[16ch]" />
          <Reveal delay={0.2}>
            <p className="text-lead mt-6 max-w-[60ch] text-muted">{project.teaser}</p>
          </Reveal>
          <Reveal delay={0.3} className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            <Button href={`/start-project?project=${encodeURIComponent(project.title)}`} variant="accent" size="lg">
              Discuss a similar project <ArrowIcon />
            </Button>
            {showLive ? (
              <Button href={project.liveUrl!} external variant="secondary" size="lg">
                Visit {hostnameOf(project.liveUrl!)} <ExternalIcon />
              </Button>
            ) : (
              <p className="inline-flex min-h-12 items-center text-sm text-muted">This system has no public link yet.</p>
            )}
          </Reveal>

          <Stagger as="dl" className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-6">
            {meta
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <StaggerItem key={k}>
                  <dt className="text-micro text-muted">{k}</dt>
                  <dd className="mt-1 text-sm">{v}</dd>
                </StaggerItem>
              ))}
          </Stagger>
        </div>
      </section>

      <section data-surface="dark" className="pb-16 lg:pb-24">
        <div className="container-x">
          <ScrollScale>
            <MaskReveal>
              <BrowserFrame url={showLive ? hostnameOf(project.liveUrl!) : project.title} className="shadow-[0_50px_120px_-50px_rgba(2,10,30,0.95)]">
                <div className="relative aspect-[16/10]">
                  <ProjectMediaImage media={desktopShot} title={project.title} status={project.status} sizes="(max-width: 1320px) 100vw, 1320px" priority />
                </div>
              </BrowserFrame>
            </MaskReveal>
          </ScrollScale>
          <p className="text-micro mt-4 text-muted">{desktopShot?.approvedForPublication ? `${desktopShot.caption ?? desktopShot.pageLabel ?? "Screenshot"}. Authentic screenshot of the project.` : "Preview being prepared. No fabricated imagery is shown."}</p>
        </div>
      </section>

      <Section surface="light">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionHeading index="01" eyebrow="Brief" title="What the project set out to do." size="sm" />
            </div>
          </div>
          <div className="prose-editorial lg:col-span-8">
            <p>{project.description}</p>
            {project.challenge && (
              <>
                <h2>Challenge</h2>
                <p>{project.challenge}</p>
              </>
            )}
            {project.goals && project.goals.length > 0 && (
              <>
                <h2>Goals</h2>
                <ul>
                  {project.goals.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </>
            )}
            {project.approach && (
              <>
                <h2>Approach</h2>
                <p>{project.approach}</p>
              </>
            )}
          </div>
        </div>
      </Section>

      {approvedGallery.length > 0 && (
        <Section surface="deep">
          <div className="container-x">
            <SectionHeading index="02" eyebrow="Screens" title="Authentic screenshots." lead="Captured from the deployed product. Click any frame to enlarge." size="md" className="mb-10" />
            <ProjectGallery media={approvedGallery} title={project.title} />
          </div>
        </Section>
      )}

      <Section surface="light">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading index="03" eyebrow="Features" title="What the system does." size="sm" className="mb-8" />
            <Stagger as="ul" className="flex flex-col gap-3">
              {project.features.map((f) => (
                <StaggerItem as="li" key={f} className="flex gap-4 card card-sm p-4 transition-colors duration-500 hover:border-accent/50">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <p className="text-sm leading-relaxed text-fg-muted">{f}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div>
            <SectionHeading index="04" eyebrow="Technology" title="Built with." size="sm" className="mb-8" />
            <Reveal>
              <ul className="flex flex-wrap gap-2">
                {project.technologies.map((t) => (
                  <li key={t} className="rounded-full border border-line-strong px-3 py-1.5 text-sm transition-colors duration-500 hover:border-accent hover:text-accent">
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            {project.engineeringNotes && (
              <div className="prose-editorial mt-8">
                <h3>Engineering notes</h3>
                <p>{project.engineeringNotes}</p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {desktopShot?.approvedForPublication && mobileShot && (
        <Section surface="dark">
          <div className="container-x">
            <SectionHeading index="05" eyebrow="Responsive" title="Desktop and mobile, side by side." size="md" className="mb-10" />
            <div className="grid items-end gap-8 lg:grid-cols-12">
              <MaskReveal className="lg:col-span-8">
                <BrowserFrame url={showLive ? hostnameOf(project.liveUrl!) : project.title}>
                  <div className="relative aspect-[16/10]">
                    <ProjectMediaImage media={desktopShot} title={project.title} status={project.status} sizes="(max-width: 1024px) 100vw, 66vw" />
                  </div>
                </BrowserFrame>
              </MaskReveal>
              <MaskReveal delay={0.15} className="mx-auto w-full max-w-[260px] lg:col-span-4">
                <PhoneFrame>
                  <div className="relative aspect-[390/844]">
                    <ProjectMediaImage media={mobileShot} title={project.title} status={project.status} sizes="260px" />
                  </div>
                </PhoneFrame>
              </MaskReveal>
            </div>
          </div>
        </Section>
      )}

      <Section surface="deep">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="06" eyebrow="Outcomes and status" title="Where it stands today." />
          </div>
          <div className="lg:col-span-7">
            {project.outcomes && project.outcomes.length > 0 ? (
              <Stagger as="ul" className="flex flex-col gap-3">
                {project.outcomes.map((o) => (
                  <StaggerItem as="li" key={o} className="card card-sm p-4 text-sm leading-relaxed text-muted">
                    {o}
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <Reveal className="card card-dashed p-6">
                <p className="font-display font-semibold">Current status. {PROJECT_STATUS_LABEL[project.status]}</p>
                <p className="mt-2 text-sm text-muted">Measured outcomes are published only when the owner has verified them. Until then we describe what the system does rather than what it achieved.</p>
              </Reveal>
            )}
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section surface="light">
          <div className="container-x">
            <SectionHeading index="07" eyebrow="Related" title="More from the portfolio." size="md" className="mb-10" />
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

      <CtaBand surface="dark" project={project.title} whatsappDigits={settings.contact.whatsappDigits} title="Need something like this?" lead="Describe your organisation and what needs to change. We will reply with questions and a proposed next step." />

      {next && next.slug !== project.slug && (
        <section data-surface="deep" className="relative overflow-hidden">
          <Link href={`/work/${next.slug}`} className="group container-x flex flex-col gap-4 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-20">
            <div>
              <Eyebrow>Next project</Eyebrow>
              <p className="text-display-md mt-4 max-w-[18ch] transition-colors duration-700 group-hover:text-accent">{next.title}</p>
            </div>
            <ArrowIcon className="size-8 shrink-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3" />
          </Link>
        </section>
      )}
    </>
  );
}
