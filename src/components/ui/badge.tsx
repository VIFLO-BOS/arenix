import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types/content";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--line)] text-[var(--fg)]",
  accent: "bg-accent text-ink",
  success: "bg-success/15 text-success",
  warning: "bg-accent/15 text-accent-deep",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  outline: "border border-[var(--line-strong)] text-[var(--fg)]",
};

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.08em] uppercase whitespace-nowrap", tones[tone], className)}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const projectTone: Record<ProjectStatus, Tone> = {
  LIVE: "success",
  COMPLETED: "info",
  IN_DEVELOPMENT: "warning",
  CONCEPT: "outline",
  PRIVATE: "neutral",
};

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge tone={projectTone[status]} dot className={className}>
      {PROJECT_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Generic status badge for admin entities such as leads, inquiries, bookings and proposals. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status.toUpperCase();
  let tone: Tone = "neutral";
  if (["WON", "CONFIRMED", "ACCEPTED", "SENT", "COMPLETED", "DONE", "ACTIVE", "QUALIFIED"].includes(s)) tone = "success";
  else if (["NEW", "REQUESTED", "DRAFT", "PENDING", "PLANNED", "IN_REVIEW"].includes(s)) tone = "info";
  else if (["CONTACTED", "PROPOSAL_SENT", "RESCHEDULED", "ON_HOLD", "IN_PROGRESS", "APPROVED", "REVIEWED", "DEMO_LOGGED"].includes(s)) tone = "warning";
  else if (["LOST", "CANCELLED", "REJECTED", "FAILED", "SPAM", "NO_SHOW", "BLOCKED", "EXPIRED"].includes(s)) tone = "danger";
  return (
    <Badge tone={tone} className={className}>
      {s.replace(/_/g, " ")}
    </Badge>
  );
}
