"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Editorial reveal that is safe for SSR and reduced motion.
 * The server (and the hydration render) always output a plain, fully visible element, so
 * content is never hidden behind an unrun animation and hydration never mismatches.
 * After hydration, elements that start below the fold switch to a motion element that fades
 * and lifts in slowly when scrolled into view. Elements already visible stay static.
 */

type Tag = "div" | "section" | "article" | "li" | "span" | "figure";

function useBelowFold<T extends HTMLElement>(disabled: boolean) {
  const ref = useRef<T | null>(null);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.92) setAnimate(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [disabled]);
  return { ref, animate };
}

const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];

export function Reveal({
  children,
  className,
  delay = 0,
  y = 32,
  once = true,
  as = "div",
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  as?: Tag;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  const { ref, animate } = useBelowFold<HTMLDivElement>(!!reduce);
  const Comp = motion[as];
  if (!animate) {
    const Static = as;
    return (
      <Static ref={ref as never} className={className}>
        {children}
      </Static>
    );
  }
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
};

const StaggerContext = createContext(false);

/** Staggered list reveal for process steps, badges and value propositions. */
export function Stagger({ children, className, as = "div", amount = 0.2 }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" | "dl"; amount?: number }) {
  const reduce = useReducedMotion();
  const { ref, animate } = useBelowFold<HTMLDivElement>(!!reduce);
  const Comp = motion[as];
  if (!animate) {
    const Static = as;
    return (
      <StaggerContext.Provider value={false}>
        <Static ref={ref as never} className={className}>
          {children}
        </Static>
      </StaggerContext.Provider>
    );
  }
  return (
    <StaggerContext.Provider value={true}>
      <Comp className={className} variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount }}>
        {children}
      </Comp>
    </StaggerContext.Provider>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  const animate = useContext(StaggerContext);
  const Comp = motion[as];
  if (!animate) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  return (
    <Comp className={className} variants={itemVariants}>
      {children}
    </Comp>
  );
}
