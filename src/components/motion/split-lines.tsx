"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * Masked line reveal. The heading renders as plain text on the server (fully readable without
 * JavaScript). After hydration it measures natural line breaks, splits into lines and slowly
 * lifts each line up from behind an overflow mask. Reduced motion keeps the static text.
 *
 * `accent` names a phrase inside the text to paint with the gold gradient.
 *
 * Visibility is observed on the heading itself, not on the translated lines. A line that
 * starts outside its clipping mask has an intersection ratio of zero, so observing it would
 * never fire.
 */
export function SplitLines({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  once = true,
  accent,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  once?: boolean;
  accent?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const inView = useInView(ref, { once, amount: 0.3 });

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;

    // Measure in a hidden clone so React's own children are never touched.
    const measure = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const probe = el.cloneNode(false) as HTMLElement;
      probe.removeAttribute("aria-label");
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.pointerEvents = "none";
      probe.style.width = `${el.getBoundingClientRect().width}px`;
      probe.style.top = "0";
      probe.style.left = "0";
      const words = text.split(/\s+/).filter(Boolean);
      const spans = words.map((w) => {
        const s = document.createElement("span");
        s.textContent = w + " ";
        s.style.display = "inline";
        probe.appendChild(s);
        return s;
      });
      parent.appendChild(probe);
      const result: string[] = [];
      let current: string[] = [];
      let lastTop: number | null = null;
      for (const s of spans) {
        const top = s.getBoundingClientRect().top;
        if (lastTop !== null && Math.abs(top - lastTop) > 2) {
          result.push(current.join(" "));
          current = [];
        }
        current.push((s.textContent ?? "").trim());
        lastTop = top;
      }
      if (current.length) result.push(current.join(" "));
      parent.removeChild(probe);
      setLines((prev) => (prev && prev.length === result.length && prev.every((l, i) => l === result[i]) ? prev : result));
    };

    measure();
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text, reduce]);

  const Comp = Tag as ElementType;
  const accentSet = accentWordIndices(text, accent);

  if (reduce || !lines) {
    return (
      <Comp ref={ref} className={className}>
        {accentSet.size ? paint(text.split(/\s+/).filter(Boolean), 0, accentSet) : text}
      </Comp>
    );
  }

  const starts = lines.reduce<number[]>((acc, line, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1]! + lines[i - 1]!.split(" ").length);
    return acc;
  }, []);
  return (
    <Comp ref={ref} className={className} aria-label={text}>
      {lines.map((line, i) => {
        const words = line.split(" ");
        const start = starts[i] ?? 0;
        return (
          <span key={`${i}-${line}`} className="line-mask" aria-hidden="true">
            <motion.span
              className="block will-change-transform"
              initial={{ y: "110%", opacity: 0 }}
              animate={inView ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1], delay: delay + i * 0.13 }}
            >
              {accentSet.size ? paint(words, start, accentSet) : line}
            </motion.span>
          </span>
        );
      })}
    </Comp>
  );
}

/** Indices (in the full word list) of the words that make up the accent phrase. */
function accentWordIndices(text: string, accent?: string): Set<number> {
  const set = new Set<number>();
  if (!accent) return set;
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = text.split(/\s+/).filter(Boolean).map(norm);
  const target = accent.split(/\s+/).filter(Boolean).map(norm);
  if (!target.length) return set;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((t, k) => words[i + k] === t)) {
      for (let k = 0; k < target.length; k++) set.add(i + k);
      break;
    }
  }
  return set;
}

function paint(words: string[], start: number, set: Set<number>): ReactNode {
  return words.map((w, k) => {
    const idx = start + k;
    const node = set.has(idx) ? (
      <span key={k} className="text-gradient-gold">
        {w}
      </span>
    ) : (
      <Fragment key={k}>{w}</Fragment>
    );
    return (
      <Fragment key={`w-${k}`}>
        {node}
        {k < words.length - 1 ? " " : ""}
      </Fragment>
    );
  });
}
