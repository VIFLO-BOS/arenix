"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Cycles through words with a slow masked lift. The box reserves the width of the longest word
 * so the surrounding line never reflows. Reduced motion shows the first word only.
 */
export function RotatingWords({ words, interval = 2800, className }: { words: string[]; interval?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || words.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [reduce, words.length, interval]);
  const word = words[i] ?? words[0] ?? "";
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <span className={`relative inline-block overflow-hidden align-bottom ${className ?? ""}`} style={{ height: "1.25em", lineHeight: "1.25em" }} aria-live="polite">
      <span className="invisible whitespace-nowrap" aria-hidden="true">
        {longest}
      </span>
      <AnimatePresence initial={false}>
        <motion.span key={word} className="text-gradient-gold absolute left-0 top-0 whitespace-nowrap" initial={reduce ? false : { y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }} transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1] }}>
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
