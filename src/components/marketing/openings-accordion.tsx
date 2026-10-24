"use client";

import { Accordion } from "radix-ui";
import type { CareerOpening } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { Button, ArrowIcon } from "@/components/ui/button";

/** Radix Accordion of open roles. Several can be open at once. */
export function OpeningsAccordion({ openings }: { openings: CareerOpening[] }) {
  return (
    <Accordion.Root type="multiple" className="flex flex-col gap-4">
      {openings.map((o) => (
        <Accordion.Item key={o.slug} value={o.slug} className="card p-6 transition-colors duration-500 data-[state=open]:border-accent/50">
          <Accordion.Header asChild>
            <h3 className="m-0">
              <Accordion.Trigger className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 text-left outline-none focus-visible:text-accent">
                <span>
                  <span className="block font-display text-[1.1rem] font-semibold">{o.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {o.location}. {o.type}
                  </span>
                </span>
                <Badge tone="accent">Open</Badge>
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="radix-collapse overflow-hidden">
            <div className="prose-editorial mt-6">
              <p>{o.summary}</p>
              <p>{o.description}</p>
              <h3>Requirements</h3>
              <ul>
                {o.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Button href={`/contact?subject=${encodeURIComponent(`Application. ${o.title}`)}`} variant="accent">
                Apply via contact form <ArrowIcon />
              </Button>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
