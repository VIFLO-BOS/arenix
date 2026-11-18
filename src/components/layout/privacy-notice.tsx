"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { LEGAL_VERSION } from "@/content/legal-version";

/**
 * The privacy notice. Shown on a visitor's first visit, and again when the Privacy policy or
 * Terms of use change significantly (LEGAL_VERSION) or a year after it was last accepted.
 * The site sets no tracking cookies, so there is nothing to switch off. The notice tells
 * visitors so and links to both documents. The choice is kept in this browser only.
 *
 * Public copy, so no dashes, colons, semicolons or hyphenated words.
 */

const KEY = "arenix:privacy-notice";
const EVENT = "arenix:privacy-notice";
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** "show" or "hide". Storage that cannot be read (private windows) shows the notice. */
function snapshot(): string {
  try {
    const [version, at] = (window.localStorage.getItem(KEY) ?? "").split("|");
    return version === LEGAL_VERSION && Date.now() - Number(at) < YEAR_MS ? "hide" : "show";
  } catch {
    return "show";
  }
}

export function PrivacyNotice() {
  // The server never renders the notice, so pages are the same for everyone and nothing flashes.
  const state = useSyncExternalStore(subscribe, snapshot, () => "hide");
  if (state !== "show") return null;

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, `${LEGAL_VERSION}|${Date.now()}`);
    } catch {
      // Without storage the notice simply closes for this page.
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <section
      role="region"
      aria-labelledby="privacy-notice-title"
      data-surface="deep"
      className="privacy-notice fixed inset-x-3 bottom-3 z-50 max-w-md rounded-2xl border border-white/10 bg-ink/95 p-4 text-[0.82rem] leading-relaxed text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur sm:inset-x-auto sm:left-5 sm:bottom-5 sm:p-5"
    >
      <h2 id="privacy-notice-title" className="font-display text-sm font-semibold tracking-tight text-white">
        Your privacy
      </h2>
      <p className="mt-2 text-white/75">
        We do not use advertising or tracking cookies. When you contact us we use your details only to reply and to work with you. Please read our{" "}
        <Link href="/privacy" className="text-accent underline underline-offset-4 hover:text-white">
          Privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-accent underline underline-offset-4 hover:text-white">
          Terms of use
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="accent" size="sm" onClick={accept}>
          Accept and continue
        </Button>
      </div>
    </section>
  );
}
