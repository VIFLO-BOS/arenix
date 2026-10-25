import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Light application primitives for the dashboard. White panels on a soft grey workspace. */

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{eyebrow}</p>}
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions, description, id }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; description?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-20px_rgba(15,23,42,0.25)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "accent" | "success" | "danger" | "muted"; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className={cn("mt-2 font-display text-2xl font-bold tracking-tight text-slate-900", tone === "accent" && "text-accent-deep", tone === "success" && "text-success", tone === "danger" && "text-danger", tone === "muted" && "text-slate-400")}>{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>}
    </div>
  );
}

export function Table({ head, children, caption, className }: { head: (string | ReactNode)[]; children: ReactNode; caption?: string; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 text-[0.68rem] uppercase tracking-[0.1em] text-slate-500">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-2 py-2.5 font-semibold first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className, muted, colSpan }: { children: ReactNode; className?: string; muted?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-2 py-2.5 align-top text-slate-800 first:pl-0 last:pr-0", muted && "text-slate-500", className)}>
      {children}
    </td>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="font-display text-base font-semibold text-slate-900">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{body}</p>}
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
            <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">{k}</dt>
            <dd className="mt-0.5 break-words text-slate-800">{v}</dd>
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
      <Link href={href(Math.max(1, page - 1))} aria-disabled={page === 1} className={cn("rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50", page === 1 && "pointer-events-none opacity-40")}>
        Previous
      </Link>
      <span className="text-slate-500">
        Page {page} of {pages}
      </span>
      <Link href={href(Math.min(pages, page + 1))} aria-disabled={page === pages} className={cn("rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50", page === pages && "pointer-events-none opacity-40")}>
        Next
      </Link>
    </nav>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "danger"; children: ReactNode }) {
  const cls = { info: "border-sky-200 bg-sky-50 text-sky-900", warning: "border-amber-200 bg-amber-50 text-amber-900", success: "border-emerald-200 bg-emerald-50 text-emerald-900", danger: "border-red-200 bg-red-50 text-red-900" }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", cls)}>{children}</div>;
}

export const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 min-h-10 disabled:bg-slate-50 disabled:opacity-60";
export const selectClass = inputClass + " appearance-none pr-8 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:1rem] bg-[right_0.6rem_center] bg-no-repeat";
export const buttonClass = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary = buttonClass + " bg-slate-900 text-white shadow-sm hover:bg-slate-800";
export const btnAccent = buttonClass + " bg-accent text-white shadow-sm hover:bg-accent-deep";
export const btnSecondary = buttonClass + " border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50";
export const btnDanger = buttonClass + " border border-red-200 bg-white text-red-700 hover:bg-red-50";

export function FieldLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700">
      {children}
      {hint && <span className="ml-1 font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}
