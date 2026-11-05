import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/types/content";
import { TopicImage } from "@/components/media/topic-image";

/**
 * Editorial "preview being prepared" state. Clearly not a product screenshot. A labelled
 * software illustration is used when no approved authentic media exists.
 */
export function MediaPlaceholder({ title, status, className, compact = false }: { title: string; status: ProjectStatus; className?: string; compact?: boolean }) {
  const label = status === "IN_DEVELOPMENT" ? "In development. No public preview yet" : status === "PRIVATE" ? "Private system. Screenshots pending approval" : "Preview being prepared";
  return (
    // Laid out like an image, so its text stays left aligned on phones. The top left corner is left
    // free because project cards place their own status badge there.
    <div role="img" aria-label={`${title}. ${label}`} data-align="start" className={cn("relative flex h-full w-full flex-col justify-between overflow-hidden bg-surface-deep p-4 text-on-dark sm:p-5", className)}>
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <TopicImage image="office" className="absolute inset-0 opacity-60" overlay="strong" sizes="50vw" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" aria-hidden="true" />
      <div className="relative flex justify-end">
        <span className="rounded-full border border-[rgba(246,243,234,0.18)] bg-ink/60 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-muted">{PROJECT_STATUS_LABEL[status]}</span>
      </div>
      <div className="relative">
        <p className="text-micro mb-2 text-muted">Stock photograph, not the product</p>
        {!compact && <p className="font-display text-[clamp(1rem,1.8vw,1.35rem)] font-semibold leading-tight">{title}</p>}
        <p className={cn("mt-2 max-w-[28ch] text-xs text-muted", compact && "mt-0")}>{label}</p>
      </div>
    </div>
  );
}
