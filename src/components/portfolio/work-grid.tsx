"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ToggleGroup } from "radix-ui";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, type PortfolioProject, type ProjectStatus } from "@/types/content";
import { ProjectCard } from "./project-card";

type Props = { projects: PortfolioProject[]; initialService?: string };

export function WorkGrid({ projects, initialService }: Props) {
  const [query, setQuery] = useState("");
  const [service, setService] = useState(initialService ?? "all");
  const [industry, setIndustry] = useState("all");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const deferred = useDeferredValue(query);
  const reduce = useReducedMotion();

  const services = useMemo(() => Array.from(new Set(projects.flatMap((p) => p.services))).sort(), [projects]);
  const industries = useMemo(() => Array.from(new Set(projects.map((p) => p.industry).filter(Boolean) as string[])).sort(), [projects]);
  const statuses = useMemo(() => Array.from(new Set(projects.map((p) => p.status))), [projects]);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return projects.filter((p) => {
      if (service !== "all" && !p.services.includes(service)) return false;
      if (industry !== "all" && p.industry !== industry) return false;
      if (status !== "all" && p.status !== status) return false;
      if (q && ![p.title, p.teaser, p.industry ?? "", ...p.technologies, ...p.services].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, deferred, service, industry, status]);

  const reset = () => {
    setQuery("");
    setService("all");
    setIndustry("all");
    setStatus("all");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-micro text-[var(--fg-muted)]">Search</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, industry or technology" className="min-h-11 w-full max-w-xl rounded-full border border-[var(--line-strong)] bg-transparent px-4 text-sm transition-colors duration-500 focus:border-accent focus:outline-none" />
        </label>
        <FilterRow label="Service" value={service} onChange={setService} options={services} />
        <FilterRow label="Industry" value={industry} onChange={setIndustry} options={industries} />
        <FilterRow label="Status" value={status} onChange={(v) => setStatus(v as ProjectStatus | "all")} options={statuses} render={(s) => PROJECT_STATUS_LABEL[s as ProjectStatus]} />
      </div>

      <p className="text-sm text-[var(--fg-muted)]" role="status" aria-live="polite">
        Showing {filtered.length} of {projects.length} projects
        {(service !== "all" || industry !== "all" || status !== "all" || query) && (
          <button type="button" onClick={reset} className="ml-3 underline underline-offset-4 hover:text-[var(--fg)]">
            Clear filters
          </button>
        )}
      </p>

      <LayoutGroup>
        <motion.ul layout={!reduce} className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {filtered.map((p, i) => (
              <motion.li key={p.slug} layout={!reduce} initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }} transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }} className={cn(i % 5 === 0 && "sm:col-span-2 xl:col-span-2")}>
                <ProjectCard project={p} size={i % 5 === 0 ? "lg" : "md"} index={i} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>

      {filtered.length === 0 && (
        <div className="card card-dashed p-8 text-center">
          <p className="font-display text-lg font-semibold">No projects match these filters.</p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">Try clearing a filter or searching for a different term.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

/** Radix ToggleGroup of filter chips. Exactly one chip is pressed at a time, "All" included. */
function FilterRow({ label, value, onChange, options, render }: { label: string; value: string; onChange: (v: string) => void; options: string[]; render?: (v: string) => string }) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-micro text-[var(--fg-muted)]">{label}</span>
      <ToggleGroup.Root type="single" value={value} onValueChange={(v) => v && onChange(v)} aria-label={`Filter by ${label.toLowerCase()}`} className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1">
        {["all", ...options].map((opt) => (
          <ToggleGroup.Item key={opt} value={opt} className="shrink-0 rounded-full border border-[var(--line-strong)] px-3.5 py-1.5 text-xs text-[var(--fg-muted)] outline-none transition-colors duration-500 hover:text-[var(--fg)] focus-visible:border-accent data-[state=on]:border-accent data-[state=on]:bg-accent data-[state=on]:text-ink sm:text-sm">
            {opt === "all" ? "All" : render ? render(opt) : opt}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
