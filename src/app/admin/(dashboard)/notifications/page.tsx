import Link from "next/link";
import { requirePermission, userCan } from "@/server/auth/session";
import { listNotificationsFor } from "@/server/services/notifications";
import { listEmailDispatches } from "@/server/services/ops-queries";
import { integrations } from "@/lib/env";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Table, Td, EmptyState, Notice } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionButton } from "@/components/admin/action-form";
import { notificationsMarkReadAction, retryEmailsAction } from "../actions";

export default async function NotificationsPage() {
  const user = await requirePermission("dashboard:read");
  const [notifications, emails] = await Promise.all([listNotificationsFor(user, 60), userCan(user, "settings:write") ? listEmailDispatches(30) : Promise.resolve([])]);
  const unread = notifications.filter((n) => !n.readBy.some((r) => r.toString() === user.id)).length;

  return (
    <>
      <PageHeader title="Notifications" description={`${unread} unread of ${notifications.length} shown.`} actions={unread > 0 ? <ActionButton action={notificationsMarkReadAction} fields={{}} variant="secondary">Mark all read</ActionButton> : undefined} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Alert center">
          {notifications.length ? (
            <ul className="divide-y divide-[rgba(245,245,243,0.06)]">
              {notifications.map((n) => {
                const isUnread = !n.readBy.some((r) => r.toString() === user.id);
                return (
                  <li key={n._id.toString()} className={cn("flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between", isUnread && "bg-[rgba(252,143,45,0.04)]")}>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm">
                        {isUnread && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />}
                        {n.link ? (
                          <Link href={n.link} className="font-medium hover:text-accent">
                            {n.title}
                          </Link>
                        ) : (
                          <span className="font-medium">{n.title}</span>
                        )}
                      </p>
                      {n.body && <p className="text-xs text-muted">{n.body}</p>}
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {n.type}, {timeAgo(n.createdAt as Date)}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No notifications" body="New inquiries, bookings, assignments and follow ups appear here." />
          )}
        </Card>
        <div className="flex flex-col gap-4">
          {userCan(user, "settings:write") && (
            <Card id="email" title="Email delivery log" description={integrations.email.configured ? "Resend" : "Demo log mode, nothing is actually sent"} actions={<ActionButton action={retryEmailsAction} fields={{}} variant="secondary" className="min-h-8 px-2 text-xs">Retry pending</ActionButton>}>
              {!integrations.email.configured && (
                <div className="mb-3">
                  <Notice tone="warning">Set RESEND_API_KEY and a verified EMAIL_FROM to deliver email.</Notice>
                </div>
              )}
              {emails.length ? (
                <Table head={["To", "Subject", "Status", "When"]} caption="Email dispatches" className="text-xs">
                  {emails.map((e) => (
                    <tr key={e._id.toString()}>
                      <Td muted>
                        <span className="break-all">{e.to.join(", ")}</span>
                      </Td>
                      <Td>
                        <p className="line-clamp-2">{e.subject}</p>
                        {e.lastError && <p className="text-[0.65rem] text-danger">{e.lastError}</p>}
                      </Td>
                      <Td>
                        <StatusBadge status={e.status} />
                      </Td>
                      <Td muted>{formatDateTime(e.createdAt as Date)}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-sm text-muted">No emails yet.</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
