"use client";

import { useRef, useState } from "react";
import { ScrollScale } from "@/components/motion/scroll-scale";
import { ProjectMediaImage } from "@/components/portfolio/browser-frame";
import type { PortfolioProject } from "@/types/content";
import { cn } from "@/lib/utils";

/**
 * Authentic showreel. When a real video URL is configured it plays muted with controls and a
 * poster. Otherwise it renders a cinematic sequence of authentic project screenshots with
 * explicit previous and next controls (no autoplaying slideshow).
 */
export function Showreel({
  videoUrl,
  posterUrl,
  projects,
}: {
  videoUrl?: string;
  posterUrl?: string;
  projects: PortfolioProject[];
}) {
  const slides = projects
    .filter((p) => p.coverMedia?.approvedForPublication)
    .slice(0, 4);
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = slides[index];

  return (
    <ScrollScale className="aspect-[16/10] w-full sm:aspect-[21/10]">
      {videoUrl ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={videoUrl}
          poster={posterUrl || undefined}
          muted
          playsInline
          loop
          controls
          preload="metadata"
          aria-label="areniX project showreel"
        />
      ) : current ? (
        <div className="relative h-full w-full bg-surface-deep">
          {slides.map((p, i) => (
            <div
              key={p.slug}
              className={cn(
                "absolute inset-0 transition-opacity duration-[1200ms] ease-[var(--ease-out-expo)]",
                i === index ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={i !== index}
            >
              <ProjectMediaImage
                media={p.coverMedia}
                title={p.title}
                status={p.status}
                sizes="100vw"
                priority={i === 0}
              />
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-4 text-on-dark sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-micro text-muted">
                {String(index + 1).padStart(2, "0")} of{" "}
                {String(slides.length).padStart(2, "0")}{" "}
                {current.industry ? `in ${current.industry}` : ""}
              </p>
              <p className="mt-1 font-display text-lg font-semibold sm:text-xl">
                {current.title}
              </p>
            </div>
            <div
              className="flex gap-2"
              role="group"
              aria-label="Showreel controls"
            >
              <button
                type="button"
                onClick={() =>
                  setIndex((i) => (i - 1 + slides.length) % slides.length)
                }
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[rgba(246,243,234,0.3)] bg-ink/40 text-sm backdrop-blur transition-colors duration-500 hover:border-accent hover:text-accent"
                aria-label="Previous project"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % slides.length)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[rgba(246,243,234,0.3)] bg-ink/40 text-sm backdrop-blur transition-colors duration-500 hover:border-accent hover:text-accent"
                aria-label="Next project"
              >
                →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-deep text-center text-sm text-muted">
          Showreel footage will appear here once approved project media is
          published.
        </div>
      )}
    </ScrollScale>
  );
}
