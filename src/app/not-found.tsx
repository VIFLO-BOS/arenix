import Link from "next/link";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";

export default function NotFound() {
  return (
    <main id="main" data-surface="dark" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[var(--gutter)] py-24 text-center">
      <div className="flare left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
      <Link href="/" className="relative mb-10" aria-label="areniX home">
        <Wordmark className="h-9" />
      </Link>
      <p className="text-micro relative text-muted">Error 404</p>
      <h1 className="text-display-lg relative mt-4 max-w-[16ch]">This page is not here.</h1>
      <p className="text-lead relative mt-5 text-muted">The address may have changed, or the content was unpublished. Try one of these instead.</p>
      <div className="relative mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:justify-center">
        <Button href="/" variant="primary" size="lg">
          Back to home
        </Button>
        <Button href="/work" variant="secondary" size="lg">
          View work <ArrowIcon />
        </Button>
        <Button href="/contact" variant="ghost" size="lg">
          Contact us
        </Button>
      </div>
    </main>
  );
}
