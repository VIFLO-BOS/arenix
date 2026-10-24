"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PortfolioProject, Technology, TechnologyCategory } from "@/types/content";
import { TECH_CATEGORIES } from "@/content/technologies";
import { Stagger, StaggerItem } from "@/components/motion/reveal";

export function TechGrid({ technologies, projects, interactive = true }: { technologies: Technology[]; projects: PortfolioProject[]; interactive?: boolean }) {
  const [category, setCategory] = useState<TechnologyCategory | "all">("all");
  const categories = useMemo(() => TECH_CATEGORIES.filter((c) => technologies.some((t) => t.category === c)), [technologies]);
  const visible = category === "all" ? technologies : technologies.filter((t) => t.category === category);
  const grouped = categories.filter((c) => category === "all" || c === category).map((c) => ({ category: c, items: visible.filter((t) => t.category === c) }));

  return (
    <div className="flex flex-col gap-8">
      {interactive && (
        <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)]" role="group" aria-label="Filter technologies by category">
          {(["all", ...categories] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-500 sm:text-sm", category === c ? "border-accent bg-accent text-ink" : "border-[var(--line-strong)] text-[var(--fg-muted)] hover:text-[var(--fg)]")}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-10">
        {grouped.map((g) => (
          <div key={g.category} className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="text-micro text-[var(--fg-muted)]">{g.category}</p>
            </div>
            <Stagger as="ul" className="grid gap-3 xs:grid-cols-2 lg:col-span-9 lg:grid-cols-3" amount={0.1}>
              {g.items.map((t) => {
                const used = projects.filter((p) => t.projectSlugs.includes(p.slug));
                return (
                  <StaggerItem as="li" key={t.slug} className="hover-lift flex h-full flex-col gap-2 card card-sm p-4 hover:border-accent/60">
                    <p className="font-display text-[0.95rem] font-semibold">{t.name}</p>
                    <p className="text-xs leading-relaxed text-[var(--fg-muted)]">{t.description}</p>
                    {used.length > 0 && (
                      <p className="mt-auto pt-2 text-[0.7rem] text-[var(--fg-muted)]">
                        Used in{" "}
                        {used.slice(0, 3).map((p, i) => (
                          <span key={p.slug}>
                            {i > 0 && ", "}
                            <Link href={`/work/${p.slug}`} className="underline-offset-2 hover:underline">
                              {p.title}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Marquee strip for the home page. Pauses on hover or focus and wraps statically for reduced motion. */
export function TechMarquee({ technologies }: { technologies: Technology[] }) {
  const names = technologies.map((t) => t.name);
  const doubled = [...names, ...names];
  return (
    <div className="marquee overflow-hidden border-y border-[var(--line)] py-4" aria-label="Technologies we work with">
      <div className="marquee-track gap-8 px-4">
        {doubled.map((n, i) => (
          <span key={`${n}-${i}`} className="shrink-0 font-display text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]" aria-hidden={i >= names.length}>
            {n}
            <span className="ml-8 text-accent">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
