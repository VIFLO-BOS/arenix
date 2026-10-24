"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProcessStep } from "@/types/content";
import { Reveal } from "@/components/motion/reveal";
import { TopicImage } from "@/components/media/topic-image";
import { processImage } from "@/content/images";

/**
 * Sticky story panel on desktop. The left column pins while steps scroll and the active step
 * drives the visual and progress indicator (IntersectionObserver, no scroll hijack). On small
 * screens the steps stack and the visual is inline.
 */
export function ProcessTimeline({ steps, compact = false }: { steps: ProcessStep[]; compact?: boolean }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    refs.current.forEach((el, i) => {
      if (!el) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setActive(i);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
      );
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [steps.length]);

  const current = steps[active] ?? steps[0];

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28 flex flex-col gap-5">
          <div className="flex items-center gap-3" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.index} className={cn("h-1 flex-1 rounded-full transition-colors duration-700", i <= active ? "bg-accent" : "bg-[var(--line)]")} />
            ))}
          </div>
          <div className="relative overflow-hidden card bg-surface-deep text-on-dark" aria-live="polite">
            <div className="opacity-70 transition-opacity duration-700">
              <TopicImage image={processImage[active % processImage.length] ?? "planning"} className="aspect-[16/10] w-full" overlay="strong" sizes="(max-width: 1024px) 100vw, 40vw" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent p-6">
              <span className="font-mono text-3xl font-bold text-accent">{current?.index}</span>
              <p className="mt-2 font-display text-xl font-semibold">{current?.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{current?.expectation}</p>
            </div>
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-10 lg:col-span-7 lg:gap-20">
        {steps.map((s, i) => (
          <li
            key={s.index}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={cn("transition-opacity duration-700 lg:opacity-50", i === active && "lg:opacity-100")}
          >
            <Reveal>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-accent">{s.index}</span>
                <h3 className={cn("font-display font-semibold leading-tight", compact ? "text-[1.15rem]" : "text-display-sm")}>{s.title}</h3>
              </div>
              <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-relaxed text-[var(--fg-muted)]">{s.summary}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-micro mb-2 text-[var(--fg-muted)]">Deliverables</p>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {s.deliverables.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:hidden">
                  <p className="text-micro mb-2 text-[var(--fg-muted)]">What to expect</p>
                  <p className="text-sm text-[var(--fg-muted)]">{s.expectation}</p>
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
