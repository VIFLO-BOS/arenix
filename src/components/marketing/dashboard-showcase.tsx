import Link from "next/link";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { MaskReveal } from "@/components/motion/mask-reveal";
import { BrowserFrame, PhoneFrame, ProjectMediaImage } from "@/components/portfolio/browser-frame";
import type { PortfolioProject } from "@/types/content";
import { cn } from "@/lib/utils";
import { TopicImage } from "@/components/media/topic-image";

/**
 * Floating layered frames of real software screens (the Nexifye principle) with a software
 * illustration behind them. Only approved authentic media is shown. Private systems show the
 * labelled placeholder.
 */
export function DashboardShowcase({ projects }: { projects: PortfolioProject[] }) {
  const [primary, secondary, tertiary] = projects;
  if (!primary) return null;
  const mobile = primary.gallery.find((g) => g.device === "mobile" && g.approvedForPublication) ?? secondary?.gallery.find((g) => g.device === "mobile" && g.approvedForPublication);

  return (
    <div className="relative grid gap-6 lg:grid-cols-12 lg:gap-0">
      <div className="pointer-events-none absolute -right-6 -top-10 hidden w-[42%] opacity-80 lg:block" aria-hidden="true">
        <div className="drift-slow card">
          <TopicImage image="analytics" className="aspect-[16/10] rounded-[inherit]" sizes="(max-width: 1024px) 100vw, 40vw" />
        </div>
      </div>

      <Reveal className="relative lg:col-span-8">
        <Parallax speed={0.06}>
          <MaskReveal>
            <BrowserFrame url={primary.isLiveUrlPublic ? primary.liveUrl : undefined}>
              <div className="relative aspect-[16/10]">
                <ProjectMediaImage media={primary.coverMedia} title={primary.title} status={primary.status} sizes="(max-width: 1024px) 100vw, 66vw" />
              </div>
            </BrowserFrame>
          </MaskReveal>
        </Parallax>
        <Caption project={primary} />
      </Reveal>

      {secondary && (
        <Reveal delay={0.1} className="relative lg:col-span-5 lg:col-start-7 lg:-mt-24 lg:ml-6">
          <Parallax speed={0.12}>
            <MaskReveal delay={0.15}>
              <BrowserFrame url={secondary.isLiveUrlPublic ? secondary.liveUrl : undefined}>
                <div className="relative aspect-[16/10]">
                  <ProjectMediaImage media={secondary.gallery.find((g) => g.device !== "mobile" && g.id !== secondary.coverMedia?.id && g.approvedForPublication) ?? secondary.coverMedia} title={secondary.title} status={secondary.status} sizes="(max-width: 1024px) 100vw, 40vw" />
                </div>
              </BrowserFrame>
            </MaskReveal>
          </Parallax>
          <Caption project={secondary} />
        </Reveal>
      )}

      {(mobile || tertiary) && (
        <Reveal delay={0.15} className={cn("relative lg:col-span-3 lg:col-start-2 lg:-mt-40")}>
          <Parallax speed={0.18}>
            {mobile ? (
              <PhoneFrame>
                <div className="relative aspect-[390/780]">
                  <ProjectMediaImage media={mobile} title={primary.title} status={primary.status} sizes="260px" />
                </div>
              </PhoneFrame>
            ) : tertiary ? (
              <div className="relative aspect-[4/5] overflow-hidden card">
                <ProjectMediaImage media={tertiary.coverMedia} title={tertiary.title} status={tertiary.status} sizes="260px" />
              </div>
            ) : null}
          </Parallax>
          {mobile ? <p className="mt-3 text-center text-xs text-[var(--fg-muted)]">{primary.title} on a mobile viewport</p> : tertiary ? <Caption project={tertiary} /> : null}
        </Reveal>
      )}
    </div>
  );
}

function Caption({ project }: { project: PortfolioProject }) {
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-3 text-xs text-[var(--fg-muted)]">
      <Link href={`/work/${project.slug}`} className="font-medium text-[var(--fg)] underline-offset-4 hover:underline">
        {project.title}
      </Link>
      <span>{project.coverMedia?.approvedForPublication ? "Authentic screenshot" : "Preview pending approval"}</span>
    </p>
  );
}
