"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Image mask reveal (the Onart and Monoform principle). The frame un-clips from the bottom
 * while the media settles from a slight zoom, once, as it enters the viewport. Content is
 * fully visible on the server and for reduced motion. The clip is applied only after
 * hydration and only to elements that start below the fold, so nothing flashes.
 */
export function MaskReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    const media = inner.current;
    if (!el || !media) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    const ctx = gsap.context(() => {
      gsap.set(el, {
        clipPath:
          direction === "up" ? "inset(100% 0% 0% 0%)" : "inset(0% 100% 0% 0%)",
      });
      gsap.set(media, { scale: 1.12 });
      gsap
        .timeline({
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          delay,
        })
        .to(
          el,
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.out" },
          0,
        )
        .to(media, { scale: 1, duration: 1.8, ease: "expo.out" }, 0);
    }, wrap);
    return () => ctx.revert();
  }, [delay, direction]);

  return (
    <div ref={wrap} className={cn("relative overflow-hidden", className)}>
      <div
        ref={inner}
        className="h-full w-full origin-center will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
