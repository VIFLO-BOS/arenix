"use client";

import { useState } from "react";
import { isSafeExternalUrl } from "@/lib/links";

/**
 * Hosted scheduler embed (Cal.com link). Rendered only when the provider is configured and a
 * public event link exists. The provider is the source of truth for availability. Confirmed
 * bookings reach the dashboard through the verified webhook.
 */
export function CalcomEmbed({ link, typeKey }: { link: string; typeKey?: string }) {
  const [loaded, setLoaded] = useState(false);
  if (!isSafeExternalUrl(link)) return null;
  const url = new URL(link);
  url.searchParams.set("embed", "true");
  if (typeKey) url.searchParams.set("notes", `Consultation type ${typeKey}`);
  return (
    <div className="relative min-h-[640px] overflow-hidden card bg-surface-raised">
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      <iframe title="Book a consultation" src={url.toString()} className="relative h-[720px] w-full" onLoad={() => setLoaded(true)} loading="lazy" allow="payment" />
      <p className="p-3 text-xs text-[var(--fg-muted)]">
        Scheduling is provided by an external calendar service. If the embed does not load,{" "}
        <a href={link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          open it in a new tab
        </a>
        .
      </p>
    </div>
  );
}
