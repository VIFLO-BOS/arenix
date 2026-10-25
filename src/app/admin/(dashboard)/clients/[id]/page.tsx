import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getClient } from "@/server/services/crm";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, KeyValue } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ClientForm } from "@/components/admin/client-form";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("clients:read");
  const { id } = await params;
  const data = await getClient(id);
  if (!data) notFound();
  const { client, leads, bookings, inquiries } = data;
  const org = client.organizationId as unknown as { name?: string; website?: string } | null;
  const canWrite = userCan(user, "clients:write");
  const canCrm = userCan(user, "leads:read");

  return (
    <>
      <PageHeader eyebrow="Client" title={client.name} description={org?.name ? `${org.name}${client.jobTitle ? `, ${client.jobTitle}` : ""}` : client.jobTitle} actions={<Link href="/admin/clients" className="text-xs text-slate-500 hover:text-slate-900">All clients</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {canWrite ? (
            <Card title="Profile">
              <ClientForm client={client as never} />
            </Card>
          ) : (
            <Card title="Profile">
              <KeyValue items={[["Email", client.email], ["Phone", client.phone], ["WhatsApp", client.whatsapp], ["Preferred contact", client.preferredContact], ["Tags", client.tags?.join(", ")], ["Notes", client.notes]]} />
            </Card>
          )}
          {canCrm && (
            <Card title="Leads">
              {leads.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {leads.map((l) => (
                    <li key={l._id.toString()} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/leads/${l._id.toString()}`} className="hover:text-accent">
                        {l.title}
                      </Link>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No leads.</p>
              )}
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Bookings">
            {bookings.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {bookings.map((b) => (
                  <li key={b._id.toString()} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/bookings/${b._id.toString()}`} className="font-mono text-xs text-accent hover:underline">
                      {b.reference}
                    </Link>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">None.</p>
            )}
          </Card>
          {canCrm && (
            <Card title="Inquiries">
              {inquiries.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {inquiries.map((i) => (
                    <li key={i._id.toString()}>
                      <Link href={`/admin/inquiries/${i._id.toString()}`} className="font-mono text-xs text-accent hover:underline">
                        {i.reference}
                      </Link>
                      <p className="text-xs text-slate-500">{formatDateTime(i.createdAt as Date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">None.</p>
              )}
            </Card>
          )}
          <Card title="Record">
            <KeyValue items={[["Source", client.source], ["Marketing consent", client.marketingConsent ? "Yes" : "No"], ["Created", formatDateTime(client.createdAt as Date)]]} className="sm:grid-cols-1" />
          </Card>
        </div>
      </div>
    </>
  );
}
