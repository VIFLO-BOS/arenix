import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
        <h1 className="font-display text-xl font-semibold sm:text-2xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions, description, id }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; description?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("rounded-xl border border-[rgba(245,245,243,0.1)] bg-surface-deep", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(245,245,243,0.08)] px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "accent" | "success" | "danger" | "muted" }) {
  return (
    <div className="rounded-xl border border-[rgba(245,245,243,0.1)] bg-surface-deep p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={cn("mt-2 font-display text-2xl font-semibold", tone === "accent" && "text-accent", tone === "success" && "text-success", tone === "danger" && "text-danger", tone === "muted" && "text-muted")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, caption, className }: { head: (string | ReactNode)[]; children: ReactNode; caption?: string; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-[rgba(245,245,243,0.1)] text-[0.65rem] uppercase tracking-[0.12em] text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-2 py-2 font-semibold first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(245,245,243,0.06)]">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className, muted, colSpan }: { children: ReactNode; className?: string; muted?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-2 py-2.5 align-top first:pl-0 last:pr-0", muted && "text-muted", className)}>
      {children}
    </td>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(245,245,243,0.2)] p-8 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function KeyValue({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2", className)}>
      {items
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">{k}</dt>
            <dd className="mt-0.5 break-words">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-2">{children}</div>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-xs">
      <Link href={href(Math.max(1, page - 1))} aria-disabled={page === 1} className={cn("rounded-lg border border-[rgba(245,245,243,0.15)] px-3 py-1.5", page === 1 && "pointer-events-none opacity-40")}>
        Previous
      </Link>
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      <Link href={href(Math.min(pages, page + 1))} aria-disabled={page === pages} className={cn("rounded-lg border border-[rgba(245,245,243,0.15)] px-3 py-1.5", page === pages && "pointer-events-none opacity-40")}>
        Next
      </Link>
    </nav>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "danger"; children: ReactNode }) {
  const cls = { info: "border-info/40 bg-info/10", warning: "border-warning/40 bg-warning/10", success: "border-success/40 bg-success/10", danger: "border-danger/40 bg-danger/10" }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", cls)}>{children}</div>;
}

export const inputClass = "w-full rounded-lg border border-[rgba(245,245,243,0.18)] bg-transparent px-3 py-2 text-sm text-on-dark placeholder:text-muted focus:border-accent focus:outline-none min-h-10 disabled:opacity-50";
export const selectClass = inputClass + " appearance-none pr-8";
export const buttonClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors duration-500 disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = buttonClass + " bg-on-dark text-ink hover:bg-accent";
export const btnAccent = buttonClass + " bg-accent text-ink hover:bg-accent-deep";
export const btnSecondary = buttonClass + " border border-[rgba(245,245,243,0.2)] text-on-dark hover:border-accent hover:text-accent";
export const btnDanger = buttonClass + " border border-danger/50 text-danger hover:bg-danger/10";
export function FieldLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-on-dark/90">
      {children}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}
