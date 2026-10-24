"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Counts from zero to `value` the first time it scrolls into view. The server renders the final
 * value, and the animation writes straight to the DOM so no state changes during effects.
 */
export function CountUp({ value, pad = 2, className, duration = 1.8 }: { value: number; pad?: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const format = (v: number) => String(Math.round(v)).padStart(pad, "0");

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    if (!inView) {
      el.textContent = format(0);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.19, 1, 0.22, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
    // format is stable for a given pad
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration, reduce, pad]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
