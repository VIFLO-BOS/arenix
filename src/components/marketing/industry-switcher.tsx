"use client";

import Link from "next/link";
import { useState } from "react";
import { Tabs } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { IndustryCard, PortfolioProject } from "@/types/content";
import { ProjectMediaImage } from "@/components/portfolio/browser-frame";
import { ArrowIcon } from "@/components/ui/button";
import { TopicImage } from "@/components/media/topic-image";
import { sectorImage } from "@/content/images";

/**
 * Radix Tabs. Each sector shows use cases and, where a real project exists, its authentic
 * media. Otherwise a topic photograph is shown and use cases are labelled as capabilities,
 * not completed engagements.
 */
export function IndustrySwitcher({ industries, projects }: { industries: IndustryCard[]; projects: PortfolioProject[] }) {
  const [value, setValue] = useState(industries[0]?.key ?? "");
  const reduce = useReducedMotion();
  const current = industries.find((i) => i.key === value) ?? industries[0];
  if (!current) return null;
  const proof = projects.filter((p) => current.deliveredProjectSlugs.includes(p.slug));
  const mediaProject = proof.find((p) => p.coverMedia?.approvedForPublication);

  return (
    <Tabs.Root value={current.key} onValueChange={setValue} orientation="vertical" activationMode="automatic" className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12">
      <Tabs.List aria-label="Industries" className="no-scrollbar -mx-[var(--gutter)] flex min-w-0 max-w-[100vw] gap-2 overflow-x-auto px-[var(--gutter)] lg:col-span-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {industries.map((ind, i) => (
          <Tabs.Trigger
            key={ind.key}
            value={ind.key}
            className="flex shrink-0 items-center justify-between gap-4 rounded-full border border-[var(--line-strong)] px-4 py-2.5 text-left text-sm text-[var(--fg-muted)] outline-none transition-colors duration-500 hover:text-[var(--fg)] focus-visible:border-accent data-[state=active]:border-accent data-[state=active]:bg-accent data-[state=active]:text-ink lg:rounded-xl lg:px-5 lg:py-3.5"
          >
            <span className="font-medium">{ind.label}</span>
            <span className="hidden font-mono text-xs opacity-70 lg:inline">{String(i + 1).padStart(2, "0")}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {industries.map((ind) => (
        <Tabs.Content key={ind.key} value={ind.key} forceMount={ind.key === current.key ? true : undefined} className="grid gap-6 outline-none data-[state=inactive]:hidden lg:col-span-8 lg:grid-cols-2">
          {ind.key === current.key && (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={current.key} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }} className="flex flex-col gap-5">
                  <p className="text-micro text-[var(--fg-muted)]">{current.label}</p>
                  <p className="text-[1.05rem] leading-relaxed">{current.summary}</p>
                  <div>
                    <p className="text-micro mb-3 text-[var(--fg-muted)]">Use cases we build</p>
                    <ul className="flex flex-col gap-2">
                      {current.useCases.map((u) => (
                        <li key={u} className="flex items-start gap-3 text-sm">
                          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                          {u}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-micro mb-3 text-[var(--fg-muted)]">{proof.length ? "Completed or active work in this sector" : "Proof"}</p>
                    {proof.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {proof.map((p) => (
                          <li key={p.slug}>
                            <Link href={`/work/${p.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-sm transition-colors duration-500 hover:border-accent hover:text-accent">
                              {p.title} <ArrowIcon className="size-3.5" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--fg-muted)]">No public case study yet. These are capabilities, not completed engagements.</p>
                    )}
                  </div>
                  <Link href={`/solutions/${current.key}`} className="mt-auto inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
                    Explore {current.label} solutions <ArrowIcon />
                  </Link>
                </motion.div>
              </AnimatePresence>
              <div className="relative aspect-[4/3] overflow-hidden card bg-surface-deep lg:aspect-auto lg:min-h-[320px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={mediaProject?.slug ?? current.key} className="absolute inset-0" initial={reduce ? false : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0 }} transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}>
                    {mediaProject ? <ProjectMediaImage media={mediaProject.coverMedia} title={mediaProject.title} status={mediaProject.status} sizes="(max-width: 1024px) 100vw, 40vw" /> : <TopicImage image={sectorImage[current.key] ?? "workforce"} className="absolute inset-0" overlay="soft" sizes="(max-width: 1024px) 100vw, 40vw" />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
