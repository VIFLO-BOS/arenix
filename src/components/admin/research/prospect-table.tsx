"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ProspectRow } from "@/server/research/service";
import { prospectBulkAction } from "@/app/admin/(dashboard)/leads/research-actions";
import { initialFormState } from "@/lib/validation/form-state";
import { cn } from "@/lib/utils";
import { btnSecondary } from "@/components/admin/ui";
import { AddToLeadsButton } from "./add-to-leads";
import { FoundBy, ResearchStateChip, ScoreChip, VerificationChip, WebsiteStatusChip, sourceTitle } from "./labels";

/**
 * The unified results table. One row per business, whichever AI or source found it, with a
 * Found by column naming every one that did. Column choices are remembered in this browser
 * for the signed in user.
 */

type ColumnId = "industry" | "location" | "registration" | "website" | "websiteStatus" | "decisionMaker" | "jobTitle" | "email" | "phone" | "whatsapp" | "linkedin" | "score" | "opportunity" | "verification" | "source";

const COLUMNS: { id: ColumnId; label: string; on: boolean }[] = [
  { id: "industry", label: "Industry", on: true },
  { id: "location", label: "Location", on: true },
  { id: "registration", label: "Registration", on: false },
  { id: "website", label: "Website", on: true },
  { id: "websiteStatus", label: "Website status", on: true },
  { id: "decisionMaker", label: "Decision maker", on: true },
  { id: "jobTitle", label: "Job title", on: false },
  { id: "email", label: "Email", on: true },
  { id: "phone", label: "Phone", on: true },
  { id: "whatsapp", label: "WhatsApp", on: false },
  { id: "linkedin", label: "LinkedIn", on: false },
  { id: "score", label: "Lead score", on: true },
  { id: "opportunity", label: "Opportunity", on: true },
  { id: "verification", label: "Verification", on: true },
  { id: "source", label: "Source", on: false },
];
const DEFAULT = COLUMNS.filter((c) => c.on).map((c) => c.id).join(",");
const EVENT = "arenix:prospect-columns";

function useColumns(userId: string): [Set<ColumnId>, (next: Set<ColumnId>) => void] {
  const key = `arenix:prospect-columns:${userId}`;
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(EVENT, cb);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(key) ?? DEFAULT;
      } catch {
        return DEFAULT;
      }
    },
    () => DEFAULT,
  );
  const set = useMemo(() => new Set(raw.split(",").filter(Boolean) as ColumnId[]), [raw]);
  const save = (next: Set<ColumnId>) => {
    try {
      window.localStorage.setItem(key, [...next].join(","));
    } catch {
      // Private windows may refuse storage. The choice then lasts until the page reloads.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [set, save];
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function Field({ value, title, href }: { value?: string; title?: string; href?: string }) {
  if (!value) return <span className="text-slate-400">Not found</span>;
  return href ? (
    <a href={href} title={title} className="break-all text-accent-deep hover:underline" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {value}
    </a>
  ) : (
    <span title={title} className="break-all">
      {value}
    </span>
  );
}

function cell(row: ProspectRow, id: ColumnId): ReactNode {
  switch (id) {
    case "industry":
      return row.industry ?? <span className="text-slate-400">Unknown</span>;
    case "location":
      return row.location ?? <span className="text-slate-400">Unknown</span>;
    case "registration":
      return (
        <span title={[row.registration.registry, row.registration.number].filter(Boolean).join(" ")}>
          {row.registration.label}
          {row.registration.number && <span className="block font-mono text-[0.7rem] text-slate-500">{row.registration.number}</span>}
        </span>
      );
    case "website":
      return row.website ? <Field value={host(row.website)} href={row.website} /> : <span className="text-slate-400">None known</span>;
    case "websiteStatus":
      return <WebsiteStatusChip status={row.websiteStatus} />;
    case "decisionMaker":
      return <Field value={row.decisionMaker?.value} title={sourceTitle(row.decisionMaker?.source, row.decisionMaker?.seenAt)} />;
    case "jobTitle":
      return row.decisionMaker?.title ?? <span className="text-slate-400">Not found</span>;
    case "email":
      return <Field value={row.email?.value} href={row.email ? `mailto:${row.email.value}` : undefined} title={sourceTitle(row.email?.source, row.email?.seenAt)} />;
    case "phone":
      return <Field value={row.phone?.value} href={row.phone ? `tel:${row.phone.value}` : undefined} title={sourceTitle(row.phone?.source, row.phone?.seenAt)} />;
    case "whatsapp":
      return <Field value={row.whatsapp?.value} href={row.whatsapp ? `https://wa.me/${row.whatsapp.value.replace(/\D/g, "")}` : undefined} title={sourceTitle(row.whatsapp?.source, row.whatsapp?.seenAt)} />;
    case "linkedin":
      return row.linkedin ? <Field value="Profile" href={row.linkedin} /> : <span className="text-slate-400">Not found</span>;
    case "score":
      return row.score ? <ScoreChip value={row.score.value} band={row.score.band} /> : <span className="text-slate-400">Not scored</span>;
    case "opportunity":
      return row.opportunity ? <span className="line-clamp-2 max-w-[16rem]">{row.opportunity}</span> : <span className="text-slate-400">Research pending</span>;
    case "verification":
      return <VerificationChip level={row.verification} />;
    case "source":
      return row.sources.length ? (
        <span className="flex flex-col gap-0.5">
          {row.sources.slice(0, 2).map((s) => (
            <a key={s} href={s} target="_blank" rel="noreferrer" className="max-w-[12rem] truncate text-accent-deep hover:underline" title={s}>
              {host(s)}
            </a>
          ))}
        </span>
      ) : (
        <span className="text-slate-400">None</span>
      );
  }
}

function Preview({ row, onClose, canWrite }: { row: ProspectRow | null; onClose: () => void; canWrite: boolean }) {
  const items: [string, ReactNode][] = row
    ? [
        ["Found by", <FoundBy key="f" sources={row.foundBy} />],
        ...COLUMNS.map((c): [string, ReactNode] => [c.label, cell(row, c.id)]),
        ["All sources", row.sources.length ? row.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" className="block break-all text-accent-deep hover:underline">{s}</a>) : "None"],
      ]
    : [];
  return (
    <Dialog.Root open={!!row} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-fade fixed inset-0 z-40 bg-slate-900/30" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-[92vw] max-w-md flex-col bg-white shadow-2xl outline-none" data-surface="light">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-base font-semibold text-slate-900">{row?.name}</Dialog.Title>
              {row && row.aiAgreement > 1 && <p className="mt-1 text-xs text-slate-500">{row.aiAgreement} AIs found this business independently.</p>}
            </div>
            <Dialog.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700" aria-label="Close preview">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <dl className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {items.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">{k}</dt>
                <dd className="mt-0.5 break-words text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          {row && (
            <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4">
              <Link href={`/admin/leads/prospects/${row.id}`} className={btnSecondary}>
                Open research profile
              </Link>
              {canWrite && <AddToLeadsButton prospectId={row.id} leadId={row.leadId} />}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ProspectTable({ rows, userId, canWrite, canRun, exportBase }: { rows: ProspectRow[]; userId: string; canWrite: boolean; canRun: boolean; exportBase?: string }) {
  const [visible, setVisible] = useColumns(userId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ProspectRow | null>(null);
  const [state, bulk] = useActionState(prospectBulkAction, initialFormState);
  const router = useRouter();
  const ids = rows.map((r) => r.id);
  const shown = COLUMNS.filter((c) => visible.has(c.id));
  const allSelected = ids.length > 0 && ids.every((i) => selected.has(i));

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <details className="relative">
          <summary className={cn(btnSecondary, "min-h-8 cursor-pointer list-none px-2.5 text-xs")}>Columns</summary>
          <div className="absolute left-0 z-20 mt-1 grid w-56 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {COLUMNS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={visible.has(c.id)}
                  onChange={() => {
                    const next = new Set(visible);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    setVisible(next);
                  }}
                  className="accent-[var(--color-accent)]"
                />
                {c.label}
              </label>
            ))}
          </div>
        </details>
        {exportBase && canWrite && (
          <a href={exportBase} className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")}>
            Export CSV
          </a>
        )}
        <span className="text-xs text-slate-500">Hover over a contact or name to see where it came from.</span>
      </div>

      {selected.size > 0 && (
        <form action={bulk} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids[]" value={id} />
          ))}
          <span className="font-medium text-slate-700">{selected.size} selected</span>
          {canRun && (
            <>
              <button type="submit" name="op" value="research" className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")}>
                Research websites
              </button>
              <button type="submit" name="op" value="analyse" className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")} title="Uses AI, which costs a few cents per business">
                Research with AI summary
              </button>
            </>
          )}
          {canWrite && (
            <>
              <button type="submit" name="op" value="add" className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")}>
                Add to Leads
              </button>
              <a href={`/api/research/export?ids=${[...selected].join(",")}`} className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")}>
                Export selected
              </a>
              <button type="submit" name="op" value="dismiss" className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")}>
                Dismiss
              </button>
              <button type="submit" name="op" value="restore" className={cn(btnSecondary, "min-h-8 px-2.5 text-xs")}>
                Restore
              </button>
            </>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 underline">
            Clear
          </button>
        </form>
      )}
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={cn("rounded-lg border px-3 py-2 text-xs", state.ok ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10")}>
          {state.message}
        </p>
      )}

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <caption className="sr-only">Businesses found, one row per business</caption>
          <thead>
            <tr className="border-b border-slate-200 text-[0.66rem] uppercase tracking-[0.1em] text-slate-500">
              <th scope="col" className="w-8 py-2.5 pr-2">
                <input type="checkbox" aria-label="Select all on this page" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(ids))} className="accent-[var(--color-accent)]" />
              </th>
              <th scope="col" className="px-2 py-2.5 font-semibold">Business name</th>
              <th scope="col" className="px-2 py-2.5 font-semibold">Found by</th>
              {shown.map((c) => (
                <th key={c.id} scope="col" className="px-2 py-2.5 font-semibold">
                  {c.label}
                </th>
              ))}
              <th scope="col" className="px-2 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className={cn("align-top hover:bg-slate-50", r.dismissed && "opacity-60")}>
                <td className="py-2.5 pr-2">
                  <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--color-accent)]" />
                </td>
                <td className="min-w-[10rem] px-2 py-2.5">
                  <Link href={`/admin/leads/prospects/${r.id}`} className="font-medium text-slate-900 hover:text-accent-deep">
                    {r.name}
                  </Link>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.leadId && <span className="rounded-full bg-navy px-2 py-0.5 text-[0.65rem] font-semibold text-white">Already in Leads</span>}
                    <ResearchStateChip state={r.research.state} step={r.research.step} />
                    {r.stale && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.65rem] text-amber-900">Older than 90 days</span>}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <FoundBy sources={r.foundBy} className="max-w-[10rem]" />
                </td>
                {shown.map((c) => (
                  <td key={c.id} className="px-2 py-2.5 text-slate-800">
                    {cell(r, c.id)}
                  </td>
                ))}
                <td className="px-2 py-2.5">
                  <div className="flex flex-col items-start gap-1.5">
                    <button type="button" onClick={() => setPreview(r)} className="text-xs font-medium text-accent-deep hover:underline">
                      Preview
                    </button>
                    <Link href={`/admin/leads/prospects/${r.id}`} className="text-xs font-medium text-accent-deep hover:underline">
                      View
                    </Link>
                    {canWrite && <AddToLeadsButton prospectId={r.id} leadId={r.leadId} compact />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Preview row={preview} onClose={() => setPreview(null)} canWrite={canWrite} />
    </div>
  );
}
