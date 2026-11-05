"use client";

import Link from "next/link";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { GithubLanguageShare, GithubPush, GithubRepoLabel, GithubSnapshot } from "@/types/github";
import { cn } from "@/lib/utils";

/**
 * Live engineering activity read from GitHub. The server renders a complete snapshot, then the
 * section asks /api/github for fresh numbers while it is on screen and the tab is visible.
 * Changed numbers tween to their new value and their tile glows briefly, so updates are seen
 * without any layout jump. Relative times tick on a shared clock that only starts after
 * hydration, so server and client render the same text first.
 */

const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];
const numberFormat = new Intl.NumberFormat("en-GB");
const fmt = (n: number) => numberFormat.format(Math.round(n));

/** Ordinal orange ramp, validated against the dark card surface. Index 0 is an empty day. */
const HEAT = ["rgba(246, 243, 234, 0.07)", "#7a3f12", "#b65c1a", "#ec7f25", "#ffb36b"];
const OTHER_DOT = "#5b6478";
/** Weeks shown below the sm breakpoint so cells stay readable down to 250px. */
const MOBILE_WEEKS = 18;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY = 86_400_000;

/* ------------------------------------------------------------------------- shared clock */

let clockNow = typeof window === "undefined" ? 0 : Date.now();
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/** Null on the server and during hydration, then the current time, updated every second. */
function useClock(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => clockNow,
    () => null,
  );
}

function relative(fromMs: number, nowMs: number) {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ${d === 1 ? "day" : "days"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ${mo === 1 ? "month" : "months"} ago`;
  const y = Math.floor(d / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}

function formatDay(ms: number) {
  const d = new Date(ms);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatShortDay(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Relative to `reference` until hydrated, then to the live clock. */
function RelativeTime({ iso, reference, className }: { iso: string; reference: string; className?: string }) {
  const now = useClock();
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  return (
    <time dateTime={iso} className={className}>
      {relative(at, now ?? Date.parse(reference))}
    </time>
  );
}

/* ---------------------------------------------------------------------- animated figures */

/**
 * Counts up the first time it scrolls into view and tweens to every later value. React renders
 * the first value once and never touches the text again. Updates are written to the DOM.
 */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const shown = useRef<number | null>(null);
  const [initial] = useState(() => fmt(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value);
      shown.current = value;
      return;
    }
    if (!inView) {
      if (shown.current === null) el.textContent = fmt(0);
      return;
    }
    const from = shown.current ?? 0;
    if (from === value && shown.current !== null) return;
    const controls = animate(from, value, {
      duration: shown.current === null ? 1.8 : 1.2,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    shown.current = value;
    return () => controls.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}

/** Adds a short accent glow to an element whenever `value` changes after the first render. */
function useChangeGlow<T extends HTMLElement>(value: number | string | null) {
  const ref = useRef<T>(null);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    const el = ref.current;
    if (!el) return;
    el.classList.remove("gh-glow");
    void el.offsetWidth;
    el.classList.add("gh-glow");
    const t = setTimeout(() => el.classList.remove("gh-glow"), 1800);
    return () => clearTimeout(t);
  }, [value]);
  return ref;
}

/* ------------------------------------------------------------------------- building blocks */

function RepoName({ repo, className }: { repo: GithubRepoLabel; className?: string }) {
  const base = cn("font-display font-semibold", repo.masked && "font-medium text-[var(--fg-muted)]", className);
  if (!repo.href) return <span className={base}>{repo.name}</span>;
  if (repo.external) {
    return (
      <a href={repo.href} target="_blank" rel="noopener noreferrer" className={cn(base, "link-underline")}>
        {repo.name}
      </a>
    );
  }
  return (
    <Link href={repo.href} className={cn(base, "link-underline")}>
      {repo.name}
    </Link>
  );
}

function pushDetail(push: GithubPush) {
  if (push.headline) return push.headline;
  const parts = [push.repo.isPrivate ? "Private code" : null, `${fmt(push.commits)} ${push.commits === 1 ? "commit" : "commits"}`, push.language?.name ?? null];
  return parts.filter(Boolean).join(" · ");
}

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  const ref = useChangeGlow<HTMLDivElement>(value);
  return (
    <div ref={ref} className="card card-sm gh-tile flex flex-col justify-between gap-6 p-5">
      <p className="text-micro">{label}</p>
      <div>
        <AnimatedNumber value={value} className="block font-display text-[clamp(1.75rem,3.2vw,2.25rem)] font-bold leading-none tracking-tight" />
        <p className="mt-2 text-xs text-[var(--fg-muted)]">{note}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- the heatmap */

type Cell = { i: number; ms: number; count: number; level: number };

function buildCalendar(firstDay: string, weeks: number[][]) {
  const start = Date.parse(`${firstDay}T00:00:00Z`);
  const counts = weeks.flat();
  const nonZero = counts.filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p: number) => nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const level = (c: number) => (c <= 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4);

  const padTop = Number.isNaN(start) ? 0 : new Date(start).getUTCDay();
  let i = 0;
  const grid: (Cell | null)[][] = weeks.map((week, w) => {
    const slots: (Cell | null)[] = w === 0 ? Array.from({ length: padTop }, () => null) : [];
    for (const count of week) {
      slots.push({ i, ms: start + i * DAY, count, level: level(count) });
      i++;
    }
    return slots;
  });

  // Month labels sit over the week that holds the 1st (and over the first week), skipping any
  // label that would crowd the previous one.
  const labels: (string | null)[] = grid.map(() => null);
  let lastLabelled = -10;
  grid.forEach((week, w) => {
    const days = week.filter(Boolean) as Cell[];
    const anchor = days.find((c) => new Date(c.ms).getUTCDate() === 1) ?? (w === 0 ? days[0] : undefined);
    if (anchor && w - lastLabelled >= 3) {
      labels[w] = MONTHS[new Date(anchor.ms).getUTCMonth()] ?? null;
      lastLabelled = w;
    }
  });

  const cells = grid.flat().filter(Boolean) as Cell[];
  let busiest: Cell | null = null;
  let longest = 0;
  let run = 0;
  const months = new Map<string, number>();
  for (const c of cells) {
    if (c.count > 0 && (!busiest || c.count > busiest.count)) busiest = c;
    run = c.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
    const d = new Date(c.ms);
    const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    months.set(key, (months.get(key) ?? 0) + c.count);
  }
  // A streak is still current if today has no contributions yet.
  let current = 0;
  let idx = cells.length - 1;
  if (cells[idx]?.count === 0) idx--;
  for (; (cells[idx]?.count ?? 0) > 0; idx--) current++;

  return {
    grid,
    labels,
    busiest,
    longest,
    current,
    activeDays: cells.filter((c) => c.count > 0).length,
    totalDays: cells.length,
    months: [...months.entries()],
  };
}

function Heatmap({ calendar }: { calendar: GithubSnapshot["calendar"] }) {
  const model = useMemo(() => buildCalendar(calendar.firstDay, calendar.weeks), [calendar.firstDay, calendar.weeks]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const cellsByIndex = useMemo(() => new Map((model.grid.flat().filter(Boolean) as Cell[]).map((c) => [c.i, c])), [model]);
  const hiddenBefore = Math.max(0, model.grid.length - MOBILE_WEEKS);

  // Cells sweep in from the oldest week when the grid first scrolls into view. Grids that are
  // already on screen at hydration stay static, matching the Reveal behaviour across the site.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (grid.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    grid.dataset.armed = "true";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        grid.classList.add("is-in");
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(grid);
    return () => io.disconnect();
  }, []);

  const show = (target: EventTarget | null) => {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-i]");
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!el || !wrap || !tip) return;
    const cell = cellsByIndex.get(Number(el.dataset.i));
    if (!cell) return;
    tip.firstElementChild!.textContent = `${fmt(cell.count)} ${cell.count === 1 ? "contribution" : "contributions"}`;
    tip.lastElementChild!.textContent = formatDay(cell.ms);
    tip.hidden = false;
    const a = el.getBoundingClientRect();
    const b = wrap.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const x = Math.min(Math.max(a.left - b.left + a.width / 2, half), b.width - half);
    tip.style.transform = `translate(${x - half}px, ${a.top - b.top - tip.offsetHeight - 8}px)`;
  };

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative"
        onPointerMove={(e) => show(e.target)}
        onPointerLeave={() => {
          if (tipRef.current) tipRef.current.hidden = true;
        }}
      >
        <div className="mb-1.5 flex gap-[2px]" aria-hidden="true">
          {model.labels.map((label, w) => (
            <div key={w} className={cn("relative h-4 min-w-0 flex-1", w < hiddenBefore && "hidden sm:block")}>
              {label && <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] leading-4 text-[var(--fg-muted)]">{label}</span>}
            </div>
          ))}
        </div>
        <div ref={gridRef} className="gh-grid flex gap-[2px]" aria-hidden="true">
          {model.grid.map((week, w) => (
            <div key={w} className={cn("flex min-w-0 flex-1 flex-col gap-[2px]", w < hiddenBefore && "hidden sm:flex")}>
              {Array.from({ length: 7 }, (_, d) => {
                const cell = week[d];
                if (!cell) return <span key={d} className="block aspect-square w-full" />;
                return (
                  <span
                    key={d}
                    data-i={cell.i}
                    className="gh-cell block aspect-square w-full rounded-[2px]"
                    style={{ background: HEAT[cell.level], "--w": w } as CSSProperties}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div ref={tipRef} hidden className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-lg border border-[var(--line-strong)] bg-[#0b1f3f] px-3 py-2 text-xs shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)]">
          <p className="font-display font-semibold text-on-dark" />
          <p className="mt-0.5 text-[var(--fg-muted)]" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--fg-muted)]">
          <span className="sm:hidden">Last {MOBILE_WEEKS} weeks shown</span>
          <span className="hidden sm:inline">Each square is one day</span>
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--fg-muted)]" aria-hidden="true">
          <span>Less</span>
          {HEAT.map((c) => (
            <span key={c} className="size-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--line)] pt-5 text-sm 2xs:grid-cols-2 md:grid-cols-4">
        <div>
          <dt className="text-micro">Busiest day</dt>
          <dd className="mt-1.5 font-display font-semibold">{model.busiest ? `${fmt(model.busiest.count)} on ${formatShortDay(model.busiest.ms)}` : "None yet"}</dd>
        </div>
        <div>
          <dt className="text-micro">Active days</dt>
          <dd className="mt-1.5 font-display font-semibold">
            {fmt(model.activeDays)} <span className="font-sans font-normal text-[var(--fg-muted)]">of {fmt(model.totalDays)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-micro">Current streak</dt>
          <dd className="mt-1.5 font-display font-semibold">
            {fmt(model.current)} {model.current === 1 ? "day" : "days"}
          </dd>
        </div>
        <div>
          <dt className="text-micro">Longest streak</dt>
          <dd className="mt-1.5 font-display font-semibold">
            {fmt(model.longest)} {model.longest === 1 ? "day" : "days"}
          </dd>
        </div>
      </dl>

      {/* sr-only cannot clip a table directly, so the wrapper does it. */}
      <div className="sr-only">
      <table>
        <caption>Contributions per month over the last year</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Contributions</th>
          </tr>
        </thead>
        <tbody>
          {model.months.map(([month, total]) => (
            <tr key={month}>
              <th scope="row">{month}</th>
              <td>{total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- languages */

function pct(share: number) {
  const v = share * 100;
  if (v < 1) return "under 1%";
  return `${v < 10 ? v.toFixed(1) : Math.round(v)}%`;
}

function LanguageBar({ languages }: { languages: GithubLanguageShare[] }) {
  if (!languages.length) return <p className="mt-4 text-sm text-[var(--fg-muted)]">No language data yet.</p>;
  return (
    <>
      <div className="mt-5 flex h-2 w-full gap-[2px]" role="img" aria-label={`Code by language. ${languages.map((l) => `${l.name} ${pct(l.share)}`).join(", ")}.`}>
        {languages.map((l) => (
          <span key={l.name} title={`${l.name} ${pct(l.share)}`} className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full" style={{ flexGrow: l.share, flexBasis: 0, background: l.color }} />
        ))}
      </div>
      <ul className="mt-5 grid gap-2.5">
        {languages.map((l) => (
          <li key={l.name} className="flex items-center gap-3 text-sm">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            <span className="tabular-nums text-[var(--fg-muted)]">{pct(l.share)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------------------------------------------------------------------- the section */

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card p-5 sm:p-6", className)}>{children}</div>;
}

export function GithubPulse({ initial, pollSeconds }: { initial: GithubSnapshot; pollSeconds: number }) {
  const [snap, setSnap] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onScreen = useInView(rootRef, { amount: 0.05 });
  const lastPoll = useRef(Date.parse(initial.fetchedAt) || 0);

  useEffect(() => {
    if (!onScreen) return;
    const every = pollSeconds * 1000;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      lastPoll.current = Date.now();
      setSyncing(true);
      try {
        const res = await fetch("/api/github", { cache: "no-store" });
        const body = res.ok ? ((await res.json()) as { ok: boolean; snapshot?: GithubSnapshot }) : null;
        if (body?.ok && body.snapshot) setSnap(body.snapshot);
      } catch {
        // Keep showing the last good numbers. The next tick tries again.
      } finally {
        setSyncing(false);
      }
    };
    const first = Date.now() - lastPoll.current >= every ? setTimeout(refresh, 600) : null;
    const timer = setInterval(refresh, every);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastPoll.current >= every) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (first) clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [onScreen, pollSeconds]);

  const t = snap.totals;
  const linesRef = useChangeGlow<HTMLDivElement>(t.linesAdded);
  const pushRef = useChangeGlow<HTMLDivElement>(snap.lastPush?.at ?? null);
  const tiles =
    t.views !== null && t.clones !== null
      ? [
          { label: "Commits shipped", value: t.commits, note: `across ${fmt(t.repositories)} repositories` },
          { label: "Repositories", value: t.repositories, note: `${fmt(t.publicRepositories)} public, ${fmt(t.privateRepositories)} private` },
          { label: "Repository views", value: t.views, note: "last 14 days" },
          { label: "Repository clones", value: t.clones, note: "last 14 days" },
        ]
      : [
          { label: "Commits shipped", value: t.commits, note: `across ${fmt(t.repositories)} repositories` },
          { label: "Repositories", value: t.repositories, note: `${fmt(t.publicRepositories)} public, ${fmt(t.privateRepositories)} private` },
          { label: "Forks", value: t.forks, note: "of our repositories" },
          { label: "Stars", value: t.stars, note: "across our repositories" },
        ];

  return (
    <div ref={rootRef} className="mt-10 sm:mt-12">
      {/* Status bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="pill w-fit normal-case tracking-normal">
          <span aria-hidden="true" className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <span className="font-semibold uppercase tracking-[0.12em] text-accent">Live</span>
          <span className="text-[var(--fg-muted)]">
            {syncing ? "Refreshing" : <>Synced <RelativeTime iso={snap.fetchedAt} reference={snap.fetchedAt} /></>}
          </span>
        </p>
        <a href={snap.profileUrl} target="_blank" rel="noopener noreferrer" className="link-underline inline-flex w-fit items-center gap-2 text-sm">
          <GithubMark className="size-4" />@{snap.username} on GitHub
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Contribution calendar */}
        <Card className="lg:col-span-8">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-display text-[1.05rem] font-semibold">
              <AnimatedNumber value={t.contributionsYear} /> contributions in the last year
            </h3>
            <p className="text-xs text-[var(--fg-muted)]">Commits, pull requests and issues, private work included</p>
          </div>
          <Heatmap calendar={snap.calendar} />
        </Card>

        {/* Lines of code and last push */}
        <div className="grid gap-4 lg:col-span-4">
          <div ref={linesRef} className="card gh-tile relative overflow-hidden p-5 sm:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(252,143,45,0.28),transparent_70%)]" />
            <p className="text-micro">Lines of code committed</p>
            {t.linesAdded !== null && t.linesDeleted !== null ? (
              <>
                <AnimatedNumber value={t.linesAdded} className="text-gradient-gold mt-4 block font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-none tracking-tight" />
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--fg-muted)]">Removed</dt>
                    <dd className="mt-1 font-display font-semibold">
                      <AnimatedNumber value={t.linesDeleted} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--fg-muted)]">Net lines</dt>
                    <dd className="mt-1 font-display font-semibold">
                      <AnimatedNumber value={Math.max(0, t.linesAdded - t.linesDeleted)} />
                    </dd>
                  </div>
                </dl>
                {t.pendingRepositories > 0 && (
                  <p className="mt-4 text-xs text-[var(--fg-muted)]">
                    GitHub is still counting {fmt(t.pendingRepositories)} {t.pendingRepositories === 1 ? "repository" : "repositories"}. They join the total on the next refresh.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-[var(--fg-muted)]">GitHub is preparing line counts. They appear on the next refresh.</p>
            )}
          </div>

          <div ref={pushRef} className="card gh-tile p-5 sm:p-6">
            <p className="text-micro">Last push</p>
            {snap.lastPush ? (
              <>
                <p className="mt-3 font-display text-[clamp(1.5rem,2.6vw,1.9rem)] font-bold leading-tight tracking-tight">
                  <RelativeTime iso={snap.lastPush.at} reference={snap.fetchedAt} />
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-[var(--fg-muted)]">to </span>
                  <RepoName repo={snap.lastPush.repo} />
                </p>
                <p className="mt-1 truncate text-xs text-[var(--fg-muted)]">{pushDetail(snap.lastPush)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--fg-muted)]">No pushes yet.</p>
            )}
          </div>
        </div>

        {/* Headline tiles */}
        <div className="grid grid-cols-1 gap-4 2xs:grid-cols-2 lg:col-span-12 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Tile key={tile.label} {...tile} />
          ))}
        </div>

        {/* Languages */}
        <Card className="lg:col-span-5">
          <h3 className="font-display text-[1.05rem] font-semibold">Languages by code size</h3>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">Bytes of code across every repository, as GitHub measures them</p>
          <LanguageBar languages={snap.languages} />
        </Card>

        {/* Recent pushes */}
        <Card className="lg:col-span-7">
          <h3 className="font-display text-[1.05rem] font-semibold">Recent activity</h3>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">Latest pushes. Client repositories show totals only.</p>
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {snap.recent.map((push, i) => (
              <li key={`${push.repo.name}-${push.at}-${i}`} className="flex items-start gap-3 py-3.5">
                <span aria-hidden="true" className="mt-[7px] size-2 shrink-0 rounded-full" style={{ background: push.language?.color ?? OTHER_DOT }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <RepoName repo={push.repo} className="text-sm" />
                    <RelativeTime iso={push.at} reference={snap.fetchedAt} className="shrink-0 text-xs text-[var(--fg-muted)]" />
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--fg-muted)]">{pushDetail(push)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Footnote */}
      <div className="mt-6 flex flex-col gap-3 text-xs text-[var(--fg-muted)] lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-[78ch] leading-relaxed">
          Numbers come straight from the GitHub API and refresh while this page is open. Forks are excluded. Lines count every addition and removal by the account, generated files included. Views and clones are the last 14 days as GitHub reports them. Private client code is never shown, only its totals.
        </p>
        <p className="flex shrink-0 flex-wrap gap-2">
          <span className="pill normal-case tracking-normal">{fmt(t.forks)} {t.forks === 1 ? "fork" : "forks"}</span>
          <span className="pill normal-case tracking-normal">{fmt(t.stars)} {t.stars === 1 ? "star" : "stars"}</span>
          <span className="pill normal-case tracking-normal">{fmt(t.watchers)} {t.watchers === 1 ? "watcher" : "watchers"}</span>
        </p>
      </div>
    </div>
  );
}

/** Same footprint as the live section, shown while the snapshot streams in. */
export function GithubPulseSkeleton() {
  return (
    <div className="mt-10 sm:mt-12" aria-busy="true" aria-label="Loading live GitHub activity">
      <div className="mb-5 h-8 w-56 rounded-full bg-[var(--glass-bg)]" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card h-[22rem] lg:col-span-8" />
        <div className="grid gap-4 lg:col-span-4">
          <div className="card h-[11rem]" />
          <div className="card h-[10rem]" />
        </div>
        <div className="grid grid-cols-1 gap-4 2xs:grid-cols-2 lg:col-span-12 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card card-sm h-32" />
          ))}
        </div>
      </div>
    </div>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
