"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { adminNav } from "@/config/navigation";
import { roleHas, type Permission } from "@/server/auth/permissions";
import type { Role } from "@/server/db/models/user";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { logoutAction } from "@/app/admin/(auth)/actions";

type ShellUser = { id: string; name: string; email: string; role: Role };

export function AdminShell({ user, unread, children, contentSource }: { user: ShellUser; unread: number; children: ReactNode; contentSource: "database" | "fixture" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the drawer when the route changes (state adjusted during render, not in an effect).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const groups = adminNav
    .map((g) => ({ ...g, links: g.links.filter((l) => roleHas(user.role, l.permission as Permission)) }))
    .filter((g) => g.links.length > 0);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const nav = (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">{g.group}</p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {g.links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn("flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-on-dark/80 transition-colors hover:bg-[rgba(245,245,243,0.06)] hover:text-on-dark", isActive(l.href) && "bg-[rgba(245,245,243,0.08)] text-on-dark")}
                >
                  <span>{l.label}</span>
                  {l.href === "/admin/notifications" && unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold text-ink">{unread > 99 ? "99+" : unread}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
    <div data-surface="dark" className="admin-scope flex min-h-dvh bg-ink text-on-dark">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-[rgba(245,245,243,0.08)] bg-surface-deep lg:flex">
        <div className="flex h-14 items-center border-b border-[rgba(245,245,243,0.08)] px-4">
          <Link href="/admin" aria-label="Dashboard home">
            <Wordmark className="h-7" />
          </Link>
          <span className="ml-2 rounded bg-[rgba(245,245,243,0.08)] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-muted">Admin</span>
        </div>
        {nav}
        <div className="border-t border-[rgba(245,245,243,0.08)] p-3 text-xs">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-muted">{user.email}</p>
          <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">{user.role.replace(/_/g, " ")}</p>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="w-full rounded-lg border border-[rgba(245,245,243,0.15)] px-2 py-1.5 text-xs hover:bg-[rgba(245,245,243,0.06)]">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[rgba(245,245,243,0.08)] bg-ink/90 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Dialog.Trigger asChild>
            <button type="button" className="inline-flex size-10 items-center justify-center rounded-lg border border-[rgba(245,245,243,0.15)] lg:hidden" aria-controls="admin-drawer" aria-label={open ? "Close navigation" : "Open navigation"}>
              <span className="relative block h-3 w-4" aria-hidden="true">
                <span className={cn("absolute left-0 top-0 h-px w-4 bg-current transition-transform duration-500", open && "translate-y-1.5 rotate-45")} />
                <span className={cn("absolute left-0 top-1.5 h-px w-4 bg-current transition-opacity duration-500", open && "opacity-0")} />
                <span className={cn("absolute left-0 bottom-0 h-px w-4 bg-current transition-transform duration-500", open && "-translate-y-1.5 -rotate-45")} />
              </span>
            </button>
            </Dialog.Trigger>
            <Link href="/admin" className="lg:hidden" aria-label="Dashboard home">
              <Wordmark className="h-7" />
            </Link>
            <span className={cn("hidden rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-wider sm:inline", contentSource === "database" ? "border-success/40 text-success" : "border-warning/40 text-warning")} title="Where public content is currently served from">
              Content {contentSource}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden text-xs text-muted hover:text-on-dark sm:inline">
              View site
            </Link>
            <Link href="/admin/notifications" className="relative inline-flex size-10 items-center justify-center rounded-lg border border-[rgba(245,245,243,0.15)]" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[0.6rem] font-semibold text-ink">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          </div>
        </header>

        <Dialog.Portal>
          <Dialog.Overlay className="radix-fade fixed inset-0 z-40 bg-ink/50 lg:hidden" />
          <Dialog.Content id="admin-drawer" aria-label="Dashboard navigation" aria-describedby={undefined} className="radix-slide-down fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-surface-deep outline-none lg:hidden" data-surface="dark">
            <Dialog.Title className="sr-only">Dashboard navigation</Dialog.Title>
            {nav}
            <div className="border-t border-[rgba(245,245,243,0.08)] p-3 text-xs">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-muted">{user.email}</p>
              <form action={logoutAction} className="mt-3">
                <button type="submit" className="w-full rounded-lg border border-[rgba(245,245,243,0.15)] px-2 py-1.5 text-xs">
                  Sign out
                </button>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>

        <main id="main" className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
    </Dialog.Root>
  );
}
