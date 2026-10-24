import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { countUnreadFor } from "@/server/services/notifications";
import { getPublicSettings } from "@/server/repositories/content";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s, areniX Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread, settings] = await Promise.all([countUnreadFor(user).catch(() => 0), getPublicSettings()]);
  return (
    <AdminShell user={user} unread={unread} contentSource={settings.source}>
      {children}
    </AdminShell>
  );
}
