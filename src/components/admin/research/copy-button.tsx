"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copies text to the clipboard, for messages that are sent by hand (LinkedIn, for example). */
export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className={cn("inline-flex min-h-8 items-center rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 hover:bg-slate-50", className)}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
