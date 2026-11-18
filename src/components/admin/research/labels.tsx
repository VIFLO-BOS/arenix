import { cn } from "@/lib/utils";
import { SCORE_BAND_LABEL, SOURCE_LABEL, VERIFICATION_LABEL, WEBSITE_STATUS_LABEL, type ScoreBand, type VerificationLevel, type WebsiteStatus } from "@/types/research";

/** Small labels for the lead research screens. No hooks, so server and client components share them. */

const SOURCE_TONE: Record<string, string> = {
  anthropic: "border-orange-200 bg-orange-50 text-orange-800",
  gemini: "border-sky-200 bg-sky-50 text-sky-800",
  openai: "border-emerald-200 bg-emerald-50 text-emerald-800",
  google_places: "border-red-200 bg-red-50 text-red-800",
  openstreetmap: "border-lime-200 bg-lime-50 text-lime-800",
  companies_house: "border-indigo-200 bg-indigo-50 text-indigo-800",
  manual: "border-slate-200 bg-slate-50 text-slate-700",
};

const chip = "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold";

export function SourceBadge({ source }: { source: string }) {
  return <span className={cn(chip, SOURCE_TONE[source] ?? SOURCE_TONE.manual)}>{SOURCE_LABEL[source] ?? source}</span>;
}

export function FoundBy({ sources, className }: { sources: string[]; className?: string }) {
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {sources.map((s) => (
        <SourceBadge key={s} source={s} />
      ))}
    </span>
  );
}

const WEBSITE_TONE: Record<WebsiteStatus, string> = {
  HAS_WEBSITE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  OUTDATED_WEBSITE: "border-amber-200 bg-amber-50 text-amber-900",
  BROKEN_WEBSITE: "border-red-200 bg-red-50 text-red-800",
  NO_WEBSITE_FOUND: "border-violet-200 bg-violet-50 text-violet-800",
  WEBSITE_STATUS_UNKNOWN: "border-slate-200 bg-slate-50 text-slate-600",
};

export function WebsiteStatusChip({ status }: { status: WebsiteStatus }) {
  return <span className={cn(chip, WEBSITE_TONE[status])}>{WEBSITE_STATUS_LABEL[status]}</span>;
}

const BAND_TONE: Record<ScoreBand, string> = {
  HIGH_PRIORITY: "border-emerald-300 bg-emerald-100 text-emerald-900",
  QUALIFIED: "border-sky-200 bg-sky-50 text-sky-900",
  POTENTIAL: "border-amber-200 bg-amber-50 text-amber-900",
  LOW_PRIORITY: "border-slate-200 bg-slate-50 text-slate-600",
};

export function ScoreChip({ value, band }: { value: number; band: ScoreBand }) {
  return (
    <span className={cn(chip, BAND_TONE[band])} title={SCORE_BAND_LABEL[band]}>
      <span className="font-mono">{value}</span>
      <span className="ml-1 font-normal">{SCORE_BAND_LABEL[band]}</span>
    </span>
  );
}

const VERIFY_TONE: Record<VerificationLevel, string> = {
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PARTLY_VERIFIED: "border-sky-200 bg-sky-50 text-sky-800",
  UNVERIFIED: "border-slate-200 bg-slate-50 text-slate-600",
};

export function VerificationChip({ level }: { level: VerificationLevel }) {
  return <span className={cn(chip, VERIFY_TONE[level])}>{VERIFICATION_LABEL[level]}</span>;
}

const STATE_TEXT: Record<string, string> = { QUEUED: "Queued", RUNNING: "Researching", DONE: "Researched", FAILED: "Research failed" };
const STATE_TONE: Record<string, string> = {
  QUEUED: "border-slate-200 bg-white text-slate-600",
  RUNNING: "border-sky-200 bg-sky-50 text-sky-800",
  DONE: "border-emerald-200 bg-white text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
};

export function ResearchStateChip({ state, step }: { state: string; step?: string }) {
  if (!STATE_TEXT[state]) return null;
  return (
    <span className={cn(chip, "font-medium", STATE_TONE[state])} title={step}>
      {state === "RUNNING" && <span aria-hidden="true" className="mr-1 size-1.5 animate-pulse rounded-full bg-current" />}
      {STATE_TEXT[state]}
    </span>
  );
}

/** Hover text that says where a value came from and when it was seen. */
export function sourceTitle(source?: string, seenAt?: string): string | undefined {
  if (!source && !seenAt) return undefined;
  const when = seenAt ? new Date(seenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined;
  return [source ? `Source ${source}` : undefined, when ? `seen ${when}` : undefined].filter(Boolean).join(", ");
}
