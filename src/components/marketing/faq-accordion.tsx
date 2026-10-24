"use client";

import { Accordion } from "radix-ui";
import type { FaqItem } from "@/types/content";
import { cn } from "@/lib/utils";

/**
 * Radix Accordion. One item open at a time, collapsible, keyboard navigable, with a slow
 * height animation driven by the Radix content height variable.
 */
export function FaqAccordion({ items, className }: { items: FaqItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <Accordion.Root type="single" collapsible className={cn("divide-y divide-[var(--line)] border-y border-[var(--line)]", className)}>
      {items.map((item, i) => (
        <Accordion.Item key={i} value={`faq-${i}`} className="group">
          <Accordion.Header asChild>
            <h3 className="m-0">
              <Accordion.Trigger className="flex w-full cursor-pointer items-start justify-between gap-4 py-5 text-left font-display text-[1.05rem] font-semibold outline-none focus-visible:text-accent">
                <span className="flex items-baseline gap-3">
                  <span className="num-chip">{String(i + 1).padStart(2, "0")}</span>
                  <span>{item.question}</span>
                </span>
                <span aria-hidden="true" className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] text-sm transition-transform duration-500 ease-[var(--ease-out-expo)] group-data-[state=open]:rotate-45">
                  +
                </span>
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="radix-collapse overflow-hidden">
            <div className="pb-6 pl-8 pr-2 text-[0.95rem] leading-relaxed text-[var(--fg-muted)]">{item.answer}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
