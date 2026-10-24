"use client";

import { useEffect, useRef } from "react";

/**
 * Gold ring that trails the native cursor on fine pointer devices and grows over links and
 * buttons. The native cursor stays visible, so nothing depends on this for usability.
 * Hidden by CSS on coarse pointers and under reduced motion.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let scale = 1;
    let visible = false;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      visible = true;
      const t = e.target as Element | null;
      scale = t?.closest?.("a, button, [role=button], input, textarea, select, summary") ? 2.2 : 1;
    };
    const onLeave = () => {
      visible = false;
    };
    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      const node = ref.current;
      if (node) {
        node.style.transform = `translate3d(${x - 18}px, ${y - 18}px, 0) scale(${scale})`;
        node.style.opacity = visible ? "1" : "0";
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="cursor-ring pointer-events-none fixed left-0 top-0 z-[95] size-9 rounded-full border border-accent/70 opacity-0 mix-blend-difference will-change-transform" />;
}
