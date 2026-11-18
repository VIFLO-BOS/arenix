"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * While research is running, asks the server to work through queued tasks and refreshes the
 * page so progress shows. Stops as soon as the server reports nothing open. The work itself
 * also runs in the background after a search starts, so closing the page does not stop it.
 */
export function ResearchPoller({ active, searchId, prospectId, intervalMs = 5000 }: { active: boolean; searchId?: string; prospectId?: string; intervalMs?: number }) {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const work = async () => {
      if (busy.current || stopped) return;
      busy.current = true;
      try {
        const res = await fetch("/api/research/worker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ searchId, prospectId }) });
        if (res.ok) router.refresh();
      } catch {
        // A failed poll is retried on the next tick.
      } finally {
        busy.current = false;
      }
    };
    void work();
    const tick = setInterval(() => {
      router.refresh();
      void work();
    }, intervalMs);
    return () => {
      stopped = true;
      clearInterval(tick);
    };
  }, [active, searchId, prospectId, intervalMs, router]);

  if (!active) return null;
  return (
    <p className="flex items-center gap-2 text-xs text-slate-500" role="status">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />
      Research is running. This page updates by itself.
    </p>
  );
}
