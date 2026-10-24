"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Navy curtain that wipes away after each route change. It plays on the incoming page so
 * navigation, focus and history are never delayed, and it is skipped for reduced motion and
 * on the very first load.
 */
export function RouteCurtain() {
  const pathname = usePathname();
  const first = useRef(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = requestAnimationFrame(() => setActive(true));
    const stop = setTimeout(() => setActive(false), 950);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(stop);
    };
  }, [pathname]);

  return <div aria-hidden="true" className={active ? "curtain is-active" : "curtain"} />;
}
