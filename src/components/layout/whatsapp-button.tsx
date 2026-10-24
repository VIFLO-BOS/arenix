"use client";

import { usePathname } from "next/navigation";
import { buildWhatsAppUrl } from "@/lib/links";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} fill="currentColor">
      <path d="M12.04 2C6.56 2 2.1 6.44 2.1 11.9c0 1.9.53 3.74 1.54 5.34L2 22l4.9-1.58a9.95 9.95 0 0 0 5.14 1.42h.01c5.47 0 9.93-4.44 9.93-9.9A9.86 9.86 0 0 0 12.04 2Zm0 18.16h-.01a8.3 8.3 0 0 1-4.22-1.15l-.3-.18-2.9.94.96-2.8-.2-.3a8.18 8.18 0 0 1-1.27-4.37c0-4.54 3.72-8.24 8.3-8.24a8.27 8.27 0 0 1 8.28 8.25c0 4.54-3.72 8.25-8.28 8.25h-.36Zm4.55-6.18c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.65.8-.8.97-.14.17-.3.19-.54.06-.25-.12-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.15-.25-.02-.38.1-.5.12-.11.26-.3.38-.45.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.6c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.11-.23-.17-.48-.3Z" />
    </svg>
  );
}

/**
 * Click to chat link. Renders nothing when no official number is configured (never a broken
 * link). It opens WhatsApp only. It does not sync messages to the CRM.
 */
export function WhatsAppLink({
  digits,
  message,
  variant = "secondary",
  size = "md",
  className,
  compact,
  context,
}: {
  digits: string;
  message: string;
  variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  compact?: boolean;
  context?: string;
}) {
  const pathname = usePathname();
  const href = buildWhatsAppUrl(digits, message);
  if (!href) return null;
  const track = () => {
    try {
      const body = JSON.stringify({ kind: "whatsapp_click", context: context ?? "", path: pathname });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      else void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    } catch {
      /* ignore */
    }
  };
  return (
    <Button href={href} external variant={variant} size={size} className={className} onClick={track} aria-label="Chat with areniX on WhatsApp (opens WhatsApp)">
      <WhatsAppIcon />
      {compact ? <span className="sr-only xl:not-sr-only">WhatsApp</span> : "Chat on WhatsApp"}
    </Button>
  );
}

/** Sticky mobile action shown on marketing pages when WhatsApp is configured. */
export function WhatsAppSticky({ digits }: { digits: string }) {
  const href = buildWhatsAppUrl(digits, "Hello areniX, I would like to discuss a project.");
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with areniX on WhatsApp (opens WhatsApp)"
      className="fixed bottom-4 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-[#25D366] text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-transform duration-500 hover:scale-105 md:hidden"
    >
      <WhatsAppIcon className="size-6" />
    </a>
  );
}
