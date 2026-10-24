import { cn } from "@/lib/utils";

/**
 * Two rows of large outlined words sliding in opposite directions. Decorative energy strip
 * between sections. Pauses on hover and wraps statically under reduced motion.
 */
export function KineticMarquee({ items, className }: { items: string[]; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={cn("marquee relative select-none overflow-hidden py-6 sm:py-8", className)} aria-label={`Services. ${items.join(", ")}`} role="img">
      <div className="marquee-track items-center gap-6 px-3" style={{ animationDuration: "90s" }}>
        {row.map((t, i) => (
          <span key={`a-${i}`} className="flex shrink-0 items-center gap-6" aria-hidden="true">
            <span className="outline-text font-display text-[clamp(1.6rem,3.6vw,3rem)] font-bold leading-none tracking-tight">{t}</span>
            <span className="size-2 rounded-full bg-accent shadow-[0_0_18px_rgba(252,143,45,0.8)]" />
          </span>
        ))}
      </div>
      <div className="marquee-track marquee-reverse mt-3 items-center gap-6 px-3" style={{ animationDuration: "110s" }}>
        {row.map((t, i) => (
          <span key={`b-${i}`} className="flex shrink-0 items-center gap-6" aria-hidden="true">
            <span className="text-gradient-gold font-display text-[clamp(1.6rem,3.6vw,3rem)] font-bold leading-none tracking-tight opacity-90">{t}</span>
            <span className="size-2 rounded-full bg-on-dark/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
