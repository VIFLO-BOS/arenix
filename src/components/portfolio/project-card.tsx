"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isSafeExternalUrl } from "@/lib/links";
import type { PortfolioProject } from "@/types/content";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { ArrowIcon, ExternalIcon } from "@/components/ui/button";
import { ProjectMediaImage } from "./browser-frame";

/**
 * Portfolio card with separate, unambiguous click targets. The media and title link to the
 * internal case study. "Visit Website" is a distinct external link rendered only when the URL
 * is valid and approved. Preview switcher crossfades slowly on hover and uses explicit dots on
 * touch devices.
 */
export function ProjectCard({ project, size = "md", index, priority = false }: { project: PortfolioProject; size?: "lg" | "md" | "sm"; index?: number; priority?: boolean }) {
  const previews = [project.coverMedia, ...project.gallery.filter((g) => g.id !== project.coverMedia?.id && g.device !== "mobile" && g.approvedForPublication)].filter(Boolean).slice(0, 3) as NonNullable<PortfolioProject["coverMedia"]>[];
  const [active, setActive] = useState(0);
  const external = project.isLiveUrlPublic && isSafeExternalUrl(project.liveUrl) ? project.liveUrl : null;
  const href = `/work/${project.slug}`;
  const ratio = size === "lg" ? "aspect-[16/10]" : size === "sm" ? "aspect-[4/3]" : "aspect-[4/3] lg:aspect-[16/11]";

  return (
    <article className="group flex h-full flex-col gap-4" aria-labelledby={`project-${project.slug}-title`}>
      <Link
        href={href}
        className={cn("hover-lift relative block overflow-hidden card bg-surface-deep hover:border-accent/50", ratio)}
        aria-label={`${project.title}. View case study`}
        onMouseEnter={() => previews.length > 1 && setActive(1)}
        onMouseLeave={() => setActive(0)}
      >
        {previews.length === 0 ? (
          <ProjectMediaImage media={null} title={project.title} status={project.status} />
        ) : (
          previews.map((m, i) => (
            <div key={m.id} className={cn("absolute inset-0 transition-opacity duration-[900ms] ease-[var(--ease-out-expo)]", i === active ? "opacity-100" : "opacity-0")} aria-hidden={i !== active}>
              <ProjectMediaImage media={m} title={project.title} status={project.status} priority={priority && i === 0} sizes={size === "lg" ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 768px) 100vw, 50vw"} className="img-zoom" />
            </div>
          ))
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <ProjectStatusBadge status={project.status} />
        </div>
        {typeof index === "number" && <span className="absolute bottom-3 right-3 font-mono text-xs text-on-dark/70">{String(index + 1).padStart(2, "0")}</span>}
      </Link>

      {previews.length > 1 && (
        <div className="flex gap-1.5 md:hidden" role="tablist" aria-label={`${project.title} previews`}>
          {previews.map((m, i) => (
            <button key={m.id} type="button" role="tab" aria-selected={i === active} aria-label={m.pageLabel ?? `Preview ${i + 1}`} onClick={() => setActive(i)} className={cn("h-2 rounded-full transition-all duration-500", i === active ? "w-6 bg-accent" : "w-2 bg-[var(--line-strong)]")} />
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={`project-${project.slug}-title`} className={cn("font-display font-semibold leading-tight", size === "lg" ? "text-display-sm" : "text-[1.05rem]")}>
            <Link href={href} className="transition-colors duration-500 hover:text-accent">
              {project.title}
            </Link>
          </h3>
          {project.industry && <span className="text-micro text-[var(--fg-muted)]">{project.industry}</span>}
        </div>
        <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{project.teaser}</p>
        {project.technologies.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Technologies">
            {project.technologies.slice(0, 4).map((t) => (
              <li key={t} className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[0.68rem] text-[var(--fg-muted)]">
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-3 text-sm font-medium">
          <Link href={href} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
            View Case Study <ArrowIcon className="transition-transform duration-500 group-hover:translate-x-0.5" />
          </Link>
          {external && (
            <a href={external} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--fg-muted)] underline-offset-4 transition-colors duration-500 hover:text-[var(--fg)] hover:underline">
              Visit Website <ExternalIcon />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
