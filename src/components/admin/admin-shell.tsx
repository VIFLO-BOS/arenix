"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Dialog, DropdownMenu, Tooltip } from "radix-ui";
import { BarChart3, Bell, CalendarCheck, ChevronLeft, ChevronRight, ExternalLink, FileText, FolderKanban, Image as ImageIcon, Images, Inbox, LayoutDashboard, LogOut, Menu, Newspaper, ScrollText, Search, Settings, Target, UserCog, Users, X } from "lucide-react";
import { adminNav } from "@/config/navigation";
import { roleHas, type Permission } from "@/server/auth/permissions";
import { ROLE_LABEL } from "@/server/auth/permissions";
import type { Role } from "@/server/db/models/user";
import { cn } from "@/lib/utils";
import { Mark, Wordmark } from "@/components/brand/wordmark";
import { logoutAction } from "@/app/admin/(auth)/actions";

type ShellUser = { id: string; name: string; email: string; role: Role };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin": LayoutDashboard,
  "/admin/notifications": Bell,
  "/admin/analytics": BarChart3,
  "/admin/inquiries": Inbox,
  "/admin/leads": Target,
  "/admin/clients": Users,
  "/admin/bookings": CalendarCheck,
  "/admin/proposals": FileText,
  "/admin/projects": FolderKanban,
  "/admin/portfolio": Images,
  "/admin/content": Newspaper,
  "/admin/media": ImageIcon,
  "/admin/team": UserCog,
  "/admin/settings": Settings,
  "/admin/audit": ScrollText,
};

const SEGMENT_LABELS: Record<string, string> = { new: "New", content: "Content", service: "Service", solution: "Solution", technology: "Technology", article: "Article", career: "Career", testimonial: "Testimonial", faq: "FAQ" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Application window layout. Collapsible icon sidebar, top bar with breadcrumbs, search,
 * notifications and a user menu, light grey workspace. Mobile uses a Radix Dialog drawer.
 */
export function AdminShell({ user, unread, children, contentSource }: { user: ShellUser; unread: number; children: ReactNode; contentSource: "database" | "fixture" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const logoutRef = useRef<HTMLFormElement>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const groups = adminNav
    .map((g) => ({ ...g, links: g.links.filter((l) => roleHas(user.role, l.permission as Permission)) }))
    .filter((g) => g.links.length > 0);
  const allLinks = groups.flatMap((g) => g.links);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  // Breadcrumb from the path. Known sections use their nav label, ids become "Detail".
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = "/admin/" + segments.slice(0, i + 1).join("/");
    const nav = allLinks.find((l) => l.href === href);
    const label = nav?.label ?? SEGMENT_LABELS[seg] ?? (/^[a-f\d]{24}$/i.test(seg) ? "Detail" : seg.replace(/-/g, " "));
    return { href, label };
  });
  const current = crumbs[crumbs.length - 1]?.label ?? "Dashboard";

  const navList = (dense: boolean) => (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
      {groups.map((g) => (
        <div key={g.group}>
          {!dense && <p className="px-2.5 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-400">{g.group}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.links.map((l) => {
              const Icon = ICONS[l.href] ?? LayoutDashboard;
              const active = isActive(l.href);
              const item = (
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900",
                    active && "bg-navy text-white hover:bg-navy hover:text-white",
                    dense && "justify-center px-0",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-slate-400 group-hover:text-slate-700")} />
                  {!dense && <span className="truncate">{l.label}</span>}
                  {l.href === "/admin/notifications" && unread > 0 && <span className={cn("rounded-full bg-accent px-1.5 text-[0.62rem] font-bold text-white", dense ? "absolute -right-0.5 -top-0.5" : "ml-auto")}>{unread > 99 ? "99+" : unread}</span>}
                </Link>
              );
              return (
                <li key={l.href}>
                  {dense ? (
                    <Tooltip.Root delayDuration={200}>
                      <Tooltip.Trigger asChild>{item}</Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content side="right" sideOffset={8} className="radix-pop z-[60] rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                          {l.label}
                          <Tooltip.Arrow className="fill-slate-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  ) : (
                    item
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <Tooltip.Provider>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <div data-surface="light" className="admin-scope flex min-h-dvh bg-[#f3f5f9] text-slate-900">
          {/* Desktop sidebar */}
          <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 lg:flex", collapsed ? "w-[68px]" : "w-64")}>
            <div className={cn("flex h-14 items-center border-b border-slate-200", collapsed ? "justify-center px-2" : "justify-between px-4")}>
              <Link href="/admin" aria-label="Dashboard home" className="flex items-center">
                {collapsed ? <Mark tone="dark" className="size-7" /> : <Wordmark tone="dark" className="h-7" />}
              </Link>
              {!collapsed && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">Admin</span>}
            </div>
            {navList(collapsed)}
            <div className="border-t border-slate-200 p-2">
              <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                {!collapsed && <span>Collapse</span>}
              </button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <Dialog.Trigger asChild>
                  <button type="button" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden" aria-controls="admin-drawer" aria-label={open ? "Close navigation" : "Open navigation"}>
                    {open ? <X className="size-4" /> : <Menu className="size-4" />}
                  </button>
                </Dialog.Trigger>
                <Link href="/admin" className="lg:hidden" aria-label="Dashboard home">
                  <Mark tone="dark" className="size-7" />
                </Link>
                <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
                  <Link href="/admin" className="text-slate-500 hover:text-slate-900">
                    Dashboard
                  </Link>
                  {crumbs.map((c, i) => (
                    <span key={c.href} className="flex items-center gap-1.5">
                      <ChevronRight className="size-3.5 text-slate-300" />
                      {i === crumbs.length - 1 ? (
                        <span className="truncate font-medium text-slate-900">{c.label}</span>
                      ) : (
                        <Link href={c.href} className="truncate text-slate-500 hover:text-slate-900">
                          {c.label}
                        </Link>
                      )}
                    </span>
                  ))}
                </nav>
                <span className="truncate text-sm font-medium text-slate-900 sm:hidden">{current}</span>
              </div>

              <div className="flex items-center gap-2">
                <form
                  role="search"
                  className="relative hidden md:block"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
                    router.push(q ? `/admin/inquiries?q=${encodeURIComponent(q)}` : "/admin/inquiries");
                  }}
                >
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input name="q" type="search" placeholder="Search inquiries" aria-label="Search inquiries" className="h-9 w-56 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 lg:w-72" />
                </form>
                <span className={cn("hidden rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider xl:inline", contentSource === "database" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")} title="Where public content is currently served from">
                  {contentSource}
                </span>
                <Link href="/" target="_blank" className="hidden size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:inline-flex" aria-label="View public site">
                  <ExternalLink className="size-4" />
                </Link>
                <Link href="/admin/notifications" className="relative inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
                  <Bell className="size-4" />
                  {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[0.6rem] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
                </Link>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button type="button" className="flex items-center gap-2 rounded-lg border border-slate-200 py-1 pl-1 pr-2 text-left hover:bg-slate-50" aria-label="Account menu">
                      <span className="flex size-7 items-center justify-center rounded-md bg-navy text-[0.7rem] font-bold text-white">{initials(user.name)}</span>
                      <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-800 md:inline">{user.name}</span>
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" sideOffset={8} className="radix-pop z-[60] w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]">
                      <div className="px-2.5 py-2">
                        <p className="truncate font-medium text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                        <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">{ROLE_LABEL[user.role]}</p>
                      </div>
                      <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                      <DropdownMenu.Item asChild>
                        <Link href="/admin/settings" className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 outline-none data-[highlighted]:bg-slate-100">
                          <Settings className="size-4 text-slate-400" /> Settings
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link href="/" target="_blank" className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 outline-none data-[highlighted]:bg-slate-100">
                          <ExternalLink className="size-4 text-slate-400" /> View public site
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                      <DropdownMenu.Item
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-red-700 outline-none data-[highlighted]:bg-red-50"
                        onSelect={(e) => {
                          e.preventDefault();
                          logoutRef.current?.requestSubmit();
                        }}
                      >
                        <LogOut className="size-4" /> Sign out
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </header>

            {/* Mobile drawer */}
            <Dialog.Portal>
              <Dialog.Overlay className="radix-fade fixed inset-0 z-40 bg-slate-900/40 lg:hidden" />
              <Dialog.Content id="admin-drawer" aria-label="Dashboard navigation" aria-describedby={undefined} className="radix-slide-down fixed inset-y-0 left-0 z-40 flex w-[82vw] max-w-xs flex-col bg-white shadow-2xl outline-none lg:hidden" data-surface="light">
                <Dialog.Title className="sr-only">Dashboard navigation</Dialog.Title>
                <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
                  <Wordmark tone="dark" className="h-7" />
                  <Dialog.Close className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700" aria-label="Close navigation">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                {navList(false)}
                <div className="border-t border-slate-200 p-3 text-xs">
                  <p className="truncate font-medium text-slate-900">{user.name}</p>
                  <p className="truncate text-slate-500">{user.email}</p>
                  <form action={logoutAction} className="mt-3">
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50">
                      <LogOut className="size-3.5" /> Sign out
                    </button>
                  </form>
                </div>
              </Dialog.Content>
            </Dialog.Portal>

            <form ref={logoutRef} action={logoutAction} className="hidden" aria-hidden="true" />
            <main id="main" className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
      </Dialog.Root>
    </Tooltip.Provider>
  );
}
