import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = { title: { default: "Sign in", template: "%s, areniX Admin" }, robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" data-surface="light" className="admin-scope relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#f3f5f9] px-[var(--gutter)] py-12 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(11,31,63,0.08),transparent)]" aria-hidden="true" />
      <Link href="/" className="relative mb-8" aria-label="areniX home">
        <Wordmark tone="dark" className="h-10" priority />
      </Link>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_-30px_rgba(15,23,42,0.35)] sm:p-8">{children}</div>
      <p className="relative mt-6 max-w-md text-center text-xs text-slate-500">Team access is invitation only. Public visitors use the contact and project forms on the main site.</p>
    </main>
  );
}
