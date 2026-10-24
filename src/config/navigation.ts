export type NavLink = { label: string; href: string; description?: string };

export const primaryNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Work", href: "/work" },
  { label: "Solutions", href: "/solutions" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
];

export const secondaryNav: NavLink[] = [
  { label: "Technologies", href: "/technologies" },
  { label: "Process", href: "/process" },
  { label: "Innovation Lab", href: "/lab" },
  { label: "Careers", href: "/careers" },
];

export const legalNav: NavLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export const ctaNav = {
  primary: { label: "Start a Project", href: "/start-project" },
  secondary: { label: "Book a Call", href: "/book-consultation" },
};

export const adminNav: { group: string; links: { label: string; href: string; permission: string }[] }[] = [
  {
    group: "Overview",
    links: [
      { label: "Dashboard", href: "/admin", permission: "dashboard:read" },
      { label: "Notifications", href: "/admin/notifications", permission: "dashboard:read" },
      { label: "Analytics", href: "/admin/analytics", permission: "analytics:read" },
    ],
  },
  {
    group: "Pipeline",
    links: [
      { label: "Inquiries", href: "/admin/inquiries", permission: "inquiries:read" },
      { label: "Leads", href: "/admin/leads", permission: "leads:read" },
      { label: "Clients", href: "/admin/clients", permission: "clients:read" },
      { label: "Bookings", href: "/admin/bookings", permission: "bookings:read" },
      { label: "Proposals", href: "/admin/proposals", permission: "proposals:read" },
      { label: "Projects", href: "/admin/projects", permission: "projects:read" },
    ],
  },
  {
    group: "Website",
    links: [
      { label: "Portfolio", href: "/admin/portfolio", permission: "cms:read" },
      { label: "Content", href: "/admin/content", permission: "cms:read" },
      { label: "Media", href: "/admin/media", permission: "cms:read" },
    ],
  },
  {
    group: "Organisation",
    links: [
      { label: "Team", href: "/admin/team", permission: "team:manage" },
      { label: "Settings", href: "/admin/settings", permission: "settings:write" },
      { label: "Audit log", href: "/admin/audit", permission: "audit:read" },
    ],
  },
];
