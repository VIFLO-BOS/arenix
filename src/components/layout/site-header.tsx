"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import {
  ctaNav,
  legalNav,
  primaryNav,
  secondaryNav,
} from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "./whatsapp-button";

/**
 * Floating glass header. The mobile menu is a Radix Dialog, which supplies focus trapping,
 * Escape handling, scroll locking and focus return.
 */
export function SiteHeader({ whatsappDigits }: { whatsappDigits: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // The header tucks away while scrolling down and glides back when scrolling up.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setHidden(y > 160 && y > lastY.current + 4);
        lastY.current = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Close on route change (state adjusted during render, not in an effect)
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const isActive = useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
    [pathname],
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-transform duration-700 ease-out-expo",
          hidden && !open ? "translate-y-[-120%]" : "translate-y-0",
        )}
        data-surface="dark"
      >
        <div className="container-x pt-3 sm:pt-4">
          <div
            className={cn(
              "flex h-14 items-center justify-between gap-3 rounded-full border px-3 pl-4 transition-[background-color,border-color,box-shadow] duration-700 ease-out-expo sm:h-16 sm:px-4 sm:pl-5",
              scrolled || open
                ? "border-[rgba(246,243,234,0.12)] bg-ink/70 shadow-[0_20px_60px_-30px_rgba(2,10,30,0.9)] backdrop-blur-xl"
                : "border-transparent bg-transparent",
            )}
          >
            <Link
              href="/"
              className="shrink-0 rounded-sm"
              aria-label="areniX home"
            >
              <Wordmark className="h-8 sm:h-9" priority />
            </Link>

            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {primaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cn(
                        "relative rounded-full px-3.5 py-2 text-[0.88rem] font-medium text-on-dark/70 transition-[color,background-color] duration-500 hover:bg-[rgba(246,243,234,0.06)] hover:text-on-dark",
                        isActive(item.href) &&
                          "bg-[rgba(246,243,234,0.08)] text-on-dark",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <WhatsAppLink
                  digits={whatsappDigits}
                  message="Hello areniX, I would like to discuss a project."
                  variant="ghost"
                  size="sm"
                  compact
                />
              </div>
              <Button
                href={ctaNav.primary.href}
                variant="accent"
                size="sm"
                className="hidden xs:inline-flex"
              >
                {ctaNav.primary.label}
              </Button>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="glass inline-flex size-10 items-center justify-center rounded-full text-on-dark lg:hidden"
                  aria-controls="mobile-nav"
                  aria-label={open ? "Close menu" : "Open menu"}
                >
                  <span className="relative block h-3 w-5" aria-hidden="true">
                    <span
                      className={cn(
                        "absolute left-0 top-0 h-[1.5px] w-5 bg-current transition-transform duration-500",
                        open && "translate-y-[5.5px] rotate-45",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-[1.5px] w-5 bg-current transition-transform duration-500",
                        open && "-translate-y-[5.5px] -rotate-45",
                      )}
                    />
                  </span>
                </button>
              </Dialog.Trigger>
            </div>
          </div>
        </div>
      </header>

      {/* Portalled so the header's backdrop filter never becomes the containing block for the panel. */}
      <Dialog.Portal>
        <Dialog.Overlay className="radix-fade fixed inset-0 z-40 bg-ink/40 lg:hidden" />
        <Dialog.Content
          id="mobile-nav"
          aria-label="Site menu"
          aria-describedby={undefined}
          className="radix-slide-down fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto bg-ink/95 outline-none backdrop-blur-xl sm:top-20 lg:hidden"
          data-surface="dark"
        >
          <Dialog.Title className="sr-only">Site menu</Dialog.Title>
          <div className="container-x flex min-h-full flex-col gap-8 py-8">
            <nav aria-label="Mobile primary">
              <ul className="flex flex-col">
                {primaryNav.map((item, i) => (
                  <li
                    key={item.href}
                    className="border-b border-[rgba(246,243,234,0.1)]"
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className="flex items-center justify-between py-3.5 font-display text-[clamp(1.2rem,5vw,1.7rem)] font-semibold text-on-dark"
                      onClick={() => setOpen(false)}
                    >
                      <span>{item.label}</span>
                      <span className="num-chip">0{i + 1}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Mobile secondary">
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {[...secondaryNav, ...legalNav].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted hover:text-on-dark"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Button
                href={ctaNav.primary.href}
                variant="accent"
                size="lg"
                className="w-full"
              >
                {ctaNav.primary.label}
              </Button>
              <Button
                href={ctaNav.secondary.href}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                {ctaNav.secondary.label}
              </Button>
              <WhatsAppLink
                digits={whatsappDigits}
                message="Hello areniX, I would like to discuss a project."
                variant="ghost"
                size="lg"
                className="w-full"
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
