import Link from "next/link";
import type { Metadata } from "next";
import { getFaqs, getFeaturedProjects, getPublicSettings, getPublishedArticles, getPublishedProjects, getServices, getTechnologies, getTestimonials } from "@/server/repositories/content";
import { industriesFixture } from "@/content/solutions";
import { processFixture } from "@/content/process";
import { pageMetadata, organizationJsonLd } from "@/lib/metadata";
import { isSafeExternalUrl } from "@/lib/links";
import { formatDate } from "@/lib/utils";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Eyebrow, Section, SectionHeading } from "@/components/ui/section-heading";
import { SplitLines } from "@/components/motion/split-lines";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { Parallax } from "@/components/motion/parallax";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { HeroCollage } from "@/components/marketing/hero-collage";
import { Showreel } from "@/components/marketing/showreel";
import { DashboardShowcase } from "@/components/marketing/dashboard-showcase";
import { IndustrySwitcher } from "@/components/marketing/industry-switcher";
import { TechMarquee } from "@/components/marketing/tech-grid";
import { ProcessTimeline } from "@/components/marketing/process-timeline";
import { CtaBand } from "@/components/marketing/cta-band";
import { ProjectCard } from "@/components/portfolio/project-card";
import { ProjectMediaImage } from "@/components/portfolio/browser-frame";
import { Aurora } from "@/components/motion/aurora";
import { Tilt } from "@/components/motion/tilt";
import { CountUp } from "@/components/motion/count-up";
import { RotatingWords } from "@/components/motion/rotating-words";
import { KineticMarquee } from "@/components/motion/kinetic-marquee";
import { ServiceBento } from "@/components/marketing/service-bento";
import { TopicImage, HeroBackdrop } from "@/components/media/topic-image";

export const metadata: Metadata = pageMetadata({
  title: "areniX | Software, Websites and Business Systems",
  description: "areniX Technologies Limited designs and engineers digital products, including custom software, corporate websites, SaaS products and operations systems, that help organisations work smarter and scale with confidence.",
  path: "/",
});

export default async function HomePage() {
  const [settings, projects, featured, services, technologies, articles, testimonials, faqs] = await Promise.all([
    getPublicSettings(),
    getPublishedProjects(),
    getFeaturedProjects(8),
    getServices(),
    getTechnologies(),
    getPublishedArticles(),
    getTestimonials(),
    getFaqs("general"),
  ]);
  const showcase = (settings.home.showcaseProjectSlugs.length ? settings.home.showcaseProjectSlugs.map((s) => projects.find((p) => p.slug === s)).filter(Boolean) : projects.filter((p) => p.coverMedia?.approvedForPublication)) as typeof projects;
  const heroProjects = projects.filter((p) => p.coverMedia?.approvedForPublication);
  const latest = articles.slice(0, 3);
  const whatsapp = settings.contact.whatsappDigits;
  const jsonLd = organizationJsonLd({ email: settings.contact.email || undefined, phone: settings.contact.phone || undefined, sameAs: Object.values(settings.socials).filter(isSafeExternalUrl) });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* 01 Hero */}
      <section data-surface="dark" className="grain relative overflow-hidden pb-16 pt-32 sm:pt-36 lg:pb-24 lg:pt-40">
        <HeroBackdrop image="hero-home" />
        <Aurora tone="quiet" />
        <div className="dots absolute inset-x-0 top-0 h-[70%]" aria-hidden="true" />
        <div className="container-x relative grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <Eyebrow index="01">areniX Technologies Limited</Eyebrow>
            <SplitLines as="h1" text={settings.home.heroHeadline} accent={settings.home.heroHeadline.split(" ").slice(-2).join(" ")} className="text-display-xl mt-6 max-w-[18ch]" />
            <Reveal delay={0.25}>
              <p className="mt-5 font-display text-[clamp(1.05rem,1.6vw,1.35rem)] font-semibold tracking-tight text-on-dark/90">
                Built for <RotatingWords words={industriesFixture.map((i) => i.label.toLowerCase())} />
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="text-lead mt-4 text-muted">{settings.home.heroSupport || settings.brand.description}</p>
            </Reveal>
            <Reveal delay={0.4} className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
              <Magnetic>
                <Button href="/work" variant="primary" size="lg">
                  Explore Our Work <ArrowIcon />
                </Button>
              </Magnetic>
              <Button href="/start-project" variant="accent" size="lg">
                Start a Project
              </Button>
            </Reveal>
            <Reveal delay={0.5} className="mt-10 grid grid-cols-2 gap-3 text-xs text-muted sm:grid-cols-3">
              <div className="card card-sm p-4">
                <p className="text-gradient-gold font-display text-2xl font-bold"><CountUp value={projects.length} /></p>
                <p className="mt-1">Projects in portfolio</p>
              </div>
              <div className="card card-sm p-4">
                <p className="text-gradient-gold font-display text-2xl font-bold"><CountUp value={services.length} /></p>
                <p className="mt-1">Service categories</p>
              </div>
              <div className="card card-sm col-span-2 p-4 sm:col-span-1">
                <p className="text-gradient-gold font-display text-2xl font-bold"><CountUp value={projects.filter((p) => p.status === "LIVE").length} /></p>
                <p className="mt-1">Publicly live products</p>
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-6">
            <Parallax speed={0.05}>
              <Tilt max={5}>
                <HeroCollage projects={heroProjects.length ? heroProjects : projects} />
              </Tilt>
            </Parallax>
          </div>
        </div>
      </section>

      {/* Kinetic strip */}
      <div data-surface="dark" className="relative border-y border-line">
        <KineticMarquee items={services.map((s) => s.shortTitle ?? s.title)} />
      </div>

      {/* 02 Showreel */}
      <Section surface="dark" sheet={false} className="pt-16">
        <div className="container-x">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading index="02" eyebrow="Showreel" title="Authentic interfaces, not stock imagery." accent="Authentic interfaces" size="md" />
            <Button href="/work" variant="link">
              View Work <ArrowIcon />
            </Button>
          </div>
          <Showreel videoUrl={settings.home.showreelVideoUrl || undefined} posterUrl={settings.home.showreelPosterUrl || undefined} projects={projects} />
        </div>
      </Section>

      {/* 03 Company preview */}
      <Section surface="light">
        <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <SectionHeading index="03" eyebrow="About areniX" title="A small team that ships complete systems, not slide decks." accent="complete systems" lead="From custom business systems to ambitious digital products, we turn complex needs into thoughtful, reliable software experiences." />
            <Reveal delay={0.1} className="mt-8">
              <Button href="/about" variant="secondary" size="lg">
                About areniX <ArrowIcon />
              </Button>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <Parallax speed={0.1}>
              <MaskReveal className="card shadow-[0_30px_80px_-40px_rgba(2,10,30,0.5)]">
                <TopicImage image="team" className="aspect-[16/11] rounded-[inherit]" overlay="soft" />
              </MaskReveal>
            </Parallax>
          </div>
        </div>
      </Section>

      {/* 04 Services */}
      <Section surface="dark" id="services">
        <div className="container-x">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading index="04" eyebrow="Services" title="Eight ways we help organisations build." accent="build" size="md" />
            <Button href="/services" variant="link">
              All Services <ArrowIcon />
            </Button>
          </div>
          <ServiceBento services={services} />
        </div>
      </Section>

      {/* 05 Selected work */}
      <Section surface="light" id="work">
        <div className="container-x">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading index="05" eyebrow="Selected work" title="See what we have built." accent="built" lead="Explore real websites, applications and systems through authentic interfaces and project stories." size="md" />
            <Button href="/work" variant="link">
              All Projects <ArrowIcon />
            </Button>
          </div>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-6">
            {featured.slice(0, 6).map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.08} className={i === 0 || i === 3 ? "sm:col-span-2 lg:col-span-4" : "lg:col-span-2"}>
                <ProjectCard project={p} size={i === 0 || i === 3 ? "lg" : "md"} index={i} priority={i === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* 06 Software showcase */}
      <Section surface="deep" className="overflow-hidden">
        <Aurora tone="quiet" />
        <div className="container-x relative">
          <SectionHeading index="06" eyebrow="Software in use" title="Real product screens, framed honestly." accent="Real product screens" lead="Where a product is public we show it as it is. Where a system is private, we say so and show a labelled illustration until the owner approves sanitised screenshots." size="md" className="mb-14" />
          <DashboardShowcase projects={showcase.length ? showcase : projects.slice(0, 3)} />
          <Reveal className="mt-14">
            <Button href="/solutions" variant="secondary" size="lg">
              Explore Solutions <ArrowIcon />
            </Button>
          </Reveal>
        </div>
      </Section>

      {/* 07 Industries */}
      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="07" eyebrow="Industries" title="Sector knowledge, stated honestly." lead="Use cases describe what we build. Completed engagements link to real case studies." size="md" className="mb-12" />
          <IndustrySwitcher industries={industriesFixture} projects={projects} />
        </div>
      </Section>

      {/* 08 Technology */}
      <Section surface="dark" className="py-12 sm:py-16">
        <div className="container-x mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Eyebrow index="08">Technology stack</Eyebrow>
          <Link href="/technologies" className="link-underline inline-flex items-center gap-1.5 text-sm">
            Technologies <ArrowIcon />
          </Link>
        </div>
        <TechMarquee technologies={technologies} />
        <div className="container-x mt-10 grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-micro text-muted">How a typical areniX system fits together</p>
            <p className="mt-3 text-lead text-muted">Clients on web and mobile, one application layer with server enforced permissions, a database the client owns, media storage, email and verified webhooks for scheduling.</p>
          </div>
          <Reveal className="lg:col-span-7">
            <MaskReveal className="card">
              <TopicImage image="server" className="aspect-[16/10] rounded-[inherit]" overlay="soft" />
            </MaskReveal>
          </Reveal>
        </div>
      </Section>

      {/* 09 Process */}
      <Section surface="light">
        <div className="container-x">
          <SectionHeading index="09" eyebrow="How we work" title="A process built for visibility." lead="Eight stages, each with named deliverables and clear expectations." size="md" className="mb-14" />
          <ProcessTimeline steps={processFixture.slice(0, 5)} compact />
          <Reveal className="mt-14">
            <Button href="/process" variant="secondary" size="lg">
              Our Process <ArrowIcon />
            </Button>
          </Reveal>
        </div>
      </Section>

      {/* 10 Trust */}
      <Section surface="gold" className="overflow-hidden">
        <Aurora tone="gold" />
        <div className="container-x relative grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading index="10" eyebrow="Credibility" title="Proof, not promises." lead={testimonials.length ? "What clients have said, with permission." : "We publish verified facts only. Client testimonials appear here once approved by the people who gave them. Nothing is invented."} size="md" />
          </div>
          <div className="lg:col-span-7">
            {testimonials.length ? (
              <Stagger as="ul" className="grid gap-4 sm:grid-cols-2">
                {testimonials.map((t) => (
                  <StaggerItem as="li" key={t.id} className="card p-6">
                    <p className="font-display text-base leading-snug">“{t.quote}”</p>
                    <p className="mt-4 text-sm text-muted">
                      {t.author}
                      {t.role ? `, ${t.role}` : ""}
                      {t.company ? ` at ${t.company}` : ""}
                    </p>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <Stagger as="ul" className="grid gap-4 sm:grid-cols-2">
                {[
                  { k: "Public deployments", v: `${projects.filter((p) => p.isLiveUrlPublic).length} projects link to live public sites you can open right now.` },
                  { k: "Authentic media", v: "Every screenshot is captured from the real product or clearly labelled as an illustration." },
                  { k: "Written proposals", v: "Versioned, with explicit assumptions. No invented prices or packages." },
                  { k: "Your ownership", v: "Code, infrastructure and documentation are handed over." },
                ].map((item) => (
                  <StaggerItem as="li" key={item.k} className="hover-lift card p-6 hover:border-accent/60">
                    <p className="text-micro text-accent">{item.k}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{item.v}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
            <Reveal className="mt-8">
              <Button href="/start-project" variant="primary" size="lg">
                Start a Project <ArrowIcon />
              </Button>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* 11 Insights */}
      <Section surface="light">
        <div className="container-x">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading index="11" eyebrow="Insights" title="Notes from the studio." size="md" />
            <Button href="/insights" variant="link">
              All Insights <ArrowIcon />
            </Button>
          </div>
          {latest.length ? (
            <Stagger as="ul" className="grid gap-6 md:grid-cols-3">
              {latest.map((a) => (
                <StaggerItem as="li" key={a.slug}>
                  <article className="group hover-lift flex h-full flex-col gap-3 card p-6 hover:border-accent/60">
                    <p className="text-micro text-[var(--fg-muted)]">
                      {a.category} · {a.readingTime} min read
                    </p>
                    <h3 className="font-display text-[1.05rem] font-semibold leading-snug">
                      <Link href={`/insights/${a.slug}`} className="transition-colors duration-500 hover:text-accent">
                        {a.title}
                      </Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{a.excerpt}</p>
                    <p className="mt-auto pt-3 text-xs text-[var(--fg-muted)]">
                      {a.author} · {formatDate(a.publishedAt)}
                    </p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--line-strong)] p-8 text-center text-sm text-[var(--fg-muted)]">No published insights yet.</p>
          )}
        </div>
      </Section>

      {/* FAQ snippet */}
      {faqs.length > 0 && (
        <Section surface="light" className="pt-0">
          <div className="container-x grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Eyebrow>Common questions</Eyebrow>
            </div>
            <div className="lg:col-span-8">
              <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {faqs.slice(0, 3).map((f) => (
                  <li key={f.id} className="py-5">
                    <p className="font-display text-[1.02rem] font-semibold">{f.question}</p>
                    <p className="mt-2 text-sm text-[var(--fg-muted)]">{f.answer}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {/* 12 CTA */}
      <CtaBand surface="gold" whatsappDigits={whatsapp} title="Have a project in mind? Let us build it." lead="Book a consultation or tell us what you are building. Every request is saved with a reference and reviewed by the team." />

      {/* Hidden image preload for the first showcase screenshot keeps LCP stable */}
      {showcase[0]?.coverMedia && <span className="sr-only">{showcase[0].title}</span>}
      {heroProjects.length === 0 && (
        <div className="hidden">
          <ProjectMediaImage media={null} title="areniX" status="CONCEPT" />
        </div>
      )}
    </>
  );
}
