import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,color,border-color,transform,box-shadow,opacity] duration-[550ms] ease-[var(--ease-out-expo)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-accent)] disabled:opacity-50 disabled:pointer-events-none select-none text-center max-w-full";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--fg)] text-[var(--bg)] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)] active:translate-y-0 active:scale-[0.98]",
  secondary: "glass text-[var(--fg)] hover:border-accent/60 hover:bg-[var(--card-bg-hover)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  ghost: "text-[var(--fg)] hover:bg-[var(--glass-bg)] active:scale-[0.98]",
  accent: "btn-shine bg-gold-gradient glow-gold text-ink hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]",
  danger: "bg-danger text-white hover:opacity-90",
  link: "rounded-none px-0 py-0 font-medium underline underline-offset-4 decoration-[var(--line-strong)] hover:decoration-current",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-4 text-[0.82rem]",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-[0.95rem]",
};

type CommonProps = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & { href?: undefined };
type LinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, "className" | "children" | "href"> & { href: string; external?: boolean; prefetch?: boolean };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);

  if ("href" in props && typeof props.href === "string") {
    const { href, external, variant: _v, size: _s, className: _c, children: _ch, prefetch, ...rest } = props;
    void _v;
    void _s;
    void _c;
    void _ch;
    if (external || /^https?:\/\//.test(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} prefetch={prefetch} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, type, ...rest } = props as ButtonProps;
  void _v;
  void _s;
  void _c;
  void _ch;
  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}
