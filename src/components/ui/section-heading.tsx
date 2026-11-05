import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SplitLines } from "@/components/motion/split-lines";

/** Pill style eyebrow with a gold dot and an optional index. */
export function Eyebrow({ children, index, className }: { children: ReactNode; index?: string; className?: string }) {
  return (
    <p className={cn("pill", className)}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_3px_rgba(252,143,45,0.18)]" />
      {index && <span className="shrink-0 whitespace-nowrap text-accent">{index}</span>}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  index,
  title,
  accent,
  lead,
  align = "left",
  size = "md",
  className,
  children,
  as = "h2",
}: {
  eyebrow?: ReactNode;
  index?: string;
  title: string;
  accent?: string;
  lead?: ReactNode;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children?: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  const sizeClass = { sm: "text-display-sm", md: "text-display-md", lg: "text-display-lg", xl: "text-display-xl" }[size];
  return (
    <div className={cn("flex flex-col gap-4 sm:gap-5", align === "center" && "items-center text-center", className)}>
      {eyebrow && (
        <div className={cn("flex max-sm:justify-center", align === "center" && "justify-center")}>
          <Eyebrow index={index}>{eyebrow}</Eyebrow>
        </div>
      )}
      <SplitLines as={as} className={cn(sizeClass, "max-w-[22ch]")} text={title} accent={accent} />
      {lead && <div className={cn("text-lead text-[var(--fg-muted)]", align === "center" && "mx-auto")}>{lead}</div>}
      {children}
    </div>
  );
}

export type Surface = "dark" | "light" | "deep" | "gold";

/** Sections stack like sheets. Each one overlaps the previous by its rounded top edge. */
export function Section({ surface = "dark", className, children, id, padded = true, sheet = true }: { surface?: Surface; className?: string; children: ReactNode; id?: string; padded?: boolean; sheet?: boolean }) {
  return (
    <section id={id} data-surface={surface} className={cn("relative", sheet && "sheet", padded && "py-16 sm:py-22 lg:py-28", className)}>
      {children}
    </section>
  );
}
