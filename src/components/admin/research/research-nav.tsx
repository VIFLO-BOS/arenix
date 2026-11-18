import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/leads/discover", label: "Searches" },
  { href: "/admin/leads/prospects", label: "All businesses" },
  { href: "/admin/leads/outreach", label: "Follow ups" },
  { href: "/admin/leads/opt-outs", label: "Opt outs" },
];

/** Tabs shared by the Find leads pages. */
export function ResearchNav({ current, showSettings }: { current: string; showSettings?: boolean }) {
  return (
    <nav aria-label="Find leads" className="mb-4 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2 text-sm">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current === t.href ? "page" : undefined} className={cn("rounded-md px-3 py-1.5", current === t.href ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
          {t.label}
        </Link>
      ))}
      <Link href="/admin/leads" className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100">
        Back to Leads
      </Link>
      {showSettings && (
        <Link href="/admin/settings/lead-research" className="ml-auto rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100">
          Lead research settings
        </Link>
      )}
    </nav>
  );
}
