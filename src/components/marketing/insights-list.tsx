"use client";

import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Article } from "@/types/content";
import { cn, formatDate } from "@/lib/utils";
import { TopicImage } from "@/components/media/topic-image";

const PAGE_SIZE = 6;

export function InsightsList({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const deferred = useDeferredValue(query);
  const reduce = useReducedMotion();
  const categories = useMemo(() => Array.from(new Set(articles.map((a) => a.category))).sort(), [articles]);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return articles.filter((a) => (category === "all" || a.category === category) && (!q || [a.title, a.excerpt, ...a.tags].join(" ").toLowerCase().includes(q)));
  }, [articles, deferred, category]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)]" role="group" aria-label="Filter by category">
          {["all", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
              className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-500 sm:text-sm", category === c ? "border-accent bg-accent text-ink" : "border-[var(--line-strong)] text-[var(--fg-muted)]")}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 md:w-72">
          <span className="sr-only">Search articles</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search articles"
            className="min-h-11 w-full rounded-full border border-[var(--line-strong)] bg-transparent px-4 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <p className="text-sm text-[var(--fg-muted)]" role="status" aria-live="polite">
        {filtered.length} article{filtered.length === 1 ? "" : "s"}
      </p>

      <motion.ul layout={!reduce} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {visible.map((a) => (
            <motion.li key={a.slug} layout={!reduce} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}>
              <article className="group hover-lift flex h-full flex-col overflow-hidden card hover:border-accent/60">
                <Link href={`/insights/${a.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-surface-deep" aria-label={a.title}>
                  {a.coverSrc ? (
                    <Image src={a.coverSrc} alt={a.coverAlt ?? ""} fill sizes="(max-width: 768px) 100vw, 33vw" className="img-zoom object-cover" />
                  ) : (
                    <div className="img-zoom h-full w-full">
                      <TopicImage image="writing" className="absolute inset-0" overlay="soft" sizes="(max-width: 768px) 100vw, 33vw" />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <p className="text-micro text-[var(--fg-muted)]">
                    {a.category} · {a.readingTime} min read
                  </p>
                  <h3 className="font-display text-[1.05rem] font-semibold leading-snug">
                    <Link href={`/insights/${a.slug}`} className="transition-colors duration-500 hover:text-accent">
                      {a.title}
                    </Link>
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{a.excerpt}</p>
                  <p className="mt-auto pt-2 text-xs text-[var(--fg-muted)]">
                    {a.author} · {formatDate(a.publishedAt)}
                  </p>
                </div>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
          <button type="button" disabled={current === 1} onClick={() => setPage((p) => p - 1)} className="min-h-10 rounded-full border border-[var(--line-strong)] px-4 text-sm disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-[var(--fg-muted)]">
            Page {current} of {pages}
          </span>
          <button type="button" disabled={current === pages} onClick={() => setPage((p) => p + 1)} className="min-h-10 rounded-full border border-[var(--line-strong)] px-4 text-sm disabled:opacity-40">
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
