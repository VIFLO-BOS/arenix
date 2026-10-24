"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ProjectMedia } from "@/types/content";
import { MaskReveal } from "@/components/motion/mask-reveal";

/**
 * Screenshot gallery with captions and a Radix Dialog lightbox. Radix handles focus trapping,
 * Escape, scroll locking and focus return. Arrow keys and swipe step between screenshots.
 * All media is approved authentic media or it is not rendered.
 */
export function ProjectGallery({ media, title }: { media: ProjectMedia[]; title: string }) {
  const items = media.filter((m) => m.approvedForPublication).sort((a, b) => a.sortOrder - b.sortOrder);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const touchStart = useRef<number | null>(null);

  const step = useCallback(
    (dir: 1 | -1) => {
      setOpenIndex((i) => (i === null ? i : (i + dir + items.length) % items.length));
    },
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  if (!items.length) return null;
  const current = openIndex !== null ? items[openIndex] : null;

  return (
    <Dialog.Root open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
      <div className="grid gap-6 sm:gap-8">
        {items.map((m, i) => {
          const isMobile = m.device === "mobile";
          return (
            <figure key={m.id} className={cn(isMobile ? "mx-auto w-full max-w-[320px]" : "w-full")}>
              <MaskReveal className={cn("card bg-surface-deep", isMobile ? "aspect-[390/844]" : "aspect-[1440/900]")}>
                <Dialog.Trigger asChild>
                  <button type="button" className="group relative block h-full w-full text-left" onClick={() => setOpenIndex(i)} aria-label={`Open ${m.pageLabel ?? "screenshot"} of ${title} in a larger view`}>
                    <Image src={m.src} alt={m.alt} fill sizes={isMobile ? "320px" : "(max-width: 1024px) 100vw, 1200px"} className="img-zoom object-cover object-top" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-on-dark opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">Enlarge</span>
                  </button>
                </Dialog.Trigger>
              </MaskReveal>
              <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{m.pageLabel ?? m.caption}</span>
                <span className="text-[var(--fg-muted)]">
                  {m.caption && m.pageLabel ? m.caption : ""} {m.isAuthenticScreenshot ? "Authentic screenshot" : "Stock photograph"}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="radix-fade fixed inset-0 z-[80] bg-ink/95 backdrop-blur-sm" />
        {current && (
          <Dialog.Content
            className="radix-fade fixed inset-0 z-[81] flex flex-col text-on-dark outline-none"
            aria-describedby={undefined}
            onTouchStart={(e) => (touchStart.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchStart.current;
              const end = e.changedTouches[0]?.clientX;
              if (start !== null && end !== undefined && Math.abs(end - start) > 50) step(end < start ? 1 : -1);
              touchStart.current = null;
            }}
          >
            <div className="flex items-center justify-between gap-3 px-[var(--gutter)] py-3">
              <Dialog.Title className="truncate text-sm font-normal">
                <span className="font-medium">{current.pageLabel ?? "Screenshot"}</span>
                <span className="ml-2 text-muted">
                  {openIndex! + 1} of {items.length}. {title}
                </span>
              </Dialog.Title>
              <Dialog.Close className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgba(246,243,234,0.2)] px-4 text-sm transition-colors duration-500 hover:border-accent hover:text-accent">
                Close <span aria-hidden="true">✕</span>
              </Dialog.Close>
            </div>
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-[var(--gutter)] pb-20">
              <motion.div key={current.id} initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }} className="relative h-full w-full max-w-6xl">
                <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" priority />
              </motion.div>
            </div>
            <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-3 px-[var(--gutter)] pb-5 pt-3">
              <button type="button" onClick={() => step(-1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[rgba(246,243,234,0.2)] px-4 text-sm transition-colors duration-500 hover:border-accent" aria-label="Previous screenshot">
                ←
              </button>
              <p className="max-w-[50vw] truncate text-xs text-muted">{current.caption ?? current.alt}</p>
              <button type="button" onClick={() => step(1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[rgba(246,243,234,0.2)] px-4 text-sm transition-colors duration-500 hover:border-accent" aria-label="Next screenshot">
                →
              </button>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
