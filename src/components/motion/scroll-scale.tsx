"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Full width media reveal. The wrapper's clip inset shrinks and the media settles from a
 * slight zoom as it scrolls into view, scrubbed to the scroll position for a slow, cinematic
 * feel. Reduced motion and narrow screens render the media statically.
 */
export function ScrollScale({
  children,
  className,
  scrub = true,
}: {
  children: ReactNode;
  className?: string;
  scrub?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    if (prefersReduced || narrow || !wrap.current || !inner.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        wrap.current,
        { clipPath: "inset(8% 10% 8% 10% round 20px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 14px)",
          ease: "none",
          scrollTrigger: {
            trigger: wrap.current,
            start: "top 90%",
            end: "top 35%",
            scrub: scrub ? 1.2 : false,
            once: !scrub,
          },
        },
      );
      gsap.fromTo(
        inner.current,
        { scale: 1.14 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: wrap.current,
            start: "top 90%",
            end: "top 35%",
            scrub: scrub ? 1.2 : false,
            once: !scrub,
          },
        },
      );
    }, wrap);
    return () => ctx.revert();
  }, [scrub]);

  return (
    <div
      ref={wrap}
      className={cn("relative overflow-hidden rounded-2xl", className)}
    >
      <div
        ref={inner}
        className="h-full w-full origin-center will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
