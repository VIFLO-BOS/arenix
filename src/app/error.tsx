"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app:error]", error);
  }, [error]);
  return (
    <main id="main" data-surface="dark" className="flex min-h-dvh flex-col items-center justify-center px-[var(--gutter)] py-24 text-center">
      <p className="text-micro text-muted">Something went wrong</p>
      <h1 className="text-display-md mt-4 max-w-[20ch]">We hit an unexpected error.</h1>
      <p className="text-lead mt-5 text-muted">Nothing you entered was lost on our side. You can try again, or go back to the homepage.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-muted">Reference {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 xs:flex-row">
        <Button onClick={reset} variant="accent" size="lg">
          Try again
        </Button>
        <Button href="/" variant="secondary" size="lg">
          Back to home
        </Button>
      </div>
    </main>
  );
}
