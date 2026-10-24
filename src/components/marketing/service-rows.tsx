"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { PortfolioProject, Service } from "@/types/content";
import { ProjectMediaImage } from "@/components/portfolio/browser-frame";
import { ArrowIcon } from "@/components/ui/button";
import { TopicImage } from "@/components/media/topic-image";
import { serviceImage, type ImageKey } from "@/content/images";

/**
 * Indexed service rows (the Altreex and Monoform principle). Hover or focus swaps the pinned
 * visual on desktop. On small screens each row expands with an explicit button.
 */
export function ServiceRows({ services, projects, compact = false }: { services: Service[]; projects: PortfolioProject[]; compact?: boolean }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const activeService = services[active];
  const mediaProject = activeService ? projects.find((p) => activeService.relatedProjectSlugs.includes(p.slug) && p.coverMedia?.approvedForPublication) : undefined;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="lg:col-span-7">
        {services.map((s, i) => {
          const isActive = i === active;
          const isExpanded = expanded === s.slug;
          return (
            <li key={s.slug} className="border-t border-[var(--line)] last:border-b">
              <div className={cn("group grid grid-cols-[auto_1fr_auto] items-start gap-3 py-5 transition-colors duration-500 sm:gap-5 sm:py-6", isActive && "text-[var(--fg)]")} onMouseEnter={() => setActive(i)} onFocusCapture={() => setActive(i)}>
                <span className="pt-1 num-chip">{s.index}</span>
                <div className="min-w-0">
                  <Link href={`/services/${s.slug}`} className={cn("block font-display font-semibold leading-tight transition-colors duration-500 hover:text-accent", compact ? "text-[clamp(1.05rem,1.6vw,1.35rem)]" : "text-[clamp(1.15rem,1.9vw,1.6rem)]")}>
                    {s.title}
                  </Link>
                  <p className={cn("mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--fg-muted)] lg:block", !isExpanded && "hidden lg:block")}>{s.summary}</p>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }} className="overflow-hidden lg:hidden">
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {s.deliverables.slice(0, 4).map((d) => (
                            <li key={d} className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--fg-muted)]">
                              {d}
                            </li>
                          ))}
                        </ul>
                        <Link href={`/services/${s.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                          Explore service <ArrowIcon />
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--line-strong)] text-sm lg:hidden" aria-expanded={isExpanded} aria-controls={`service-row-${s.slug}`} aria-label={isExpanded ? `Collapse ${s.title}` : `Expand ${s.title}`} onClick={() => setExpanded(isExpanded ? null : s.slug)}>
                    <span className={cn("transition-transform duration-500", isExpanded && "rotate-45")}>+</span>
                  </button>
                  <Link href={`/services/${s.slug}`} className="hidden size-10 items-center justify-center rounded-full border border-[var(--line-strong)] transition-colors duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-ink lg:inline-flex" aria-label={`Open ${s.title}`}>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28">
          <div className="relative aspect-[4/3] overflow-hidden card bg-surface-deep">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeService?.slug ?? "none"} className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }} transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}>
                {mediaProject ? <ProjectMediaImage media={mediaProject.coverMedia} title={mediaProject.title} status={mediaProject.status} sizes="40vw" /> : <TopicImage image={(activeService && serviceImage[activeService.slug]) || "code"} className="absolute inset-0" overlay="soft" sizes="40vw" />}
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-5 text-on-dark">
              <p className="text-micro text-muted">{activeService?.index} Service</p>
              <p className="mt-1 font-display text-base font-semibold">{activeService?.shortTitle ?? activeService?.title}</p>
              <p className="mt-1 text-xs text-muted">{mediaProject ? `Related work ${mediaProject.title}` : "Illustration"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Service hero art keyed by the service's heroStyle. */
export function ServiceArt({ style, className, slug }: { style: Service["heroStyle"]; className?: string; slug?: string }) {
  void style;
  const image: ImageKey = (slug && serviceImage[slug]) || "code";
  return <TopicImage image={image} className={className} overlay="soft" />;
}
