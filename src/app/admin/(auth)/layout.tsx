import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = { title: { default: "Sign in", template: "%s, areniX Admin" }, robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" data-surface="dark" className="admin-scope relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[var(--gutter)] py-12">
      <div className="flare left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 opacity-60" aria-hidden="true" />
      <Link href="/" className="relative mb-8" aria-label="areniX home">
        <Wordmark className="h-10" priority />
      </Link>
      <div className="relative w-full max-w-md rounded-2xl border border-[rgba(245,245,243,0.12)] bg-surface-deep p-5 sm:p-8">{children}</div>
      <p className="relative mt-6 max-w-md text-center text-xs text-muted">Team access is invitation only. Public visitors use the contact and project forms on the main site.</p>
    </main>
  );
}
