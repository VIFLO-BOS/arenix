import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { listPickerOptions } from "@/server/services/pickers";
import { PageHeader, Card } from "@/components/admin/ui";
import { ProjectForm } from "@/components/admin/project-form";

export default async function NewProjectPage() {
  await requirePermission("projects:write");
  const opts = await listPickerOptions();
  return (
    <>
      <PageHeader title="New internal project" description="Delivery record with owner, milestones and notes. Not published anywhere." actions={<Link href="/admin/projects" className="text-xs text-slate-500 hover:text-slate-900">All projects</Link>} />
      <Card className="max-w-3xl">
        <ProjectForm clients={opts.clients} staff={opts.staff} leads={opts.leads} proposals={opts.proposals} />
      </Card>
    </>
  );
}
