import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { PageHeader, Card } from "@/components/admin/ui";
import { ClientForm } from "@/components/admin/client-form";

export default async function NewClientPage() {
  await requirePermission("clients:write");
  return (
    <>
      <PageHeader title="New client" description="Create a person record manually (website submissions create clients automatically)." actions={<Link href="/admin/clients" className="text-xs text-slate-500 hover:text-slate-900">All clients</Link>} />
      <Card className="max-w-3xl">
        <ClientForm />
      </Card>
    </>
  );
}
