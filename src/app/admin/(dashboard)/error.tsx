"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin:error]", error);
  }, [error]);
  const denied = error.name === "AuthorizationError" || /permission/i.test(error.message);
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-[rgba(245,245,243,0.12)] bg-surface-deep p-6 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">{denied ? "Access denied" : "Something went wrong"}</p>
      <h1 className="mt-2 font-display text-xl font-semibold">{denied ? "You do not have permission for this area." : "The dashboard hit an unexpected error."}</h1>
      <p className="mt-2 text-sm text-muted">{denied ? "The attempt has been recorded. Ask an administrator if you need access." : error.message}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">Reference {error.digest}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {!denied && (
          <button type="button" onClick={reset} className="rounded-lg bg-on-dark px-3.5 py-2 text-sm font-medium text-ink">
            Try again
          </button>
        )}
        <Link href="/admin" className="rounded-lg border border-[rgba(245,245,243,0.2)] px-3.5 py-2 text-sm">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
