import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, userCan } from "@/server/auth/session";
import { getInternalProject } from "@/server/services/projects";
import { listPickerOptions } from "@/server/services/pickers";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader, Card, KeyValue, FieldLabel, FormRow, inputClass } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, ActionButton, Submit } from "@/components/admin/action-form";
import { ProjectForm } from "@/components/admin/project-form";
import { milestoneAddAction, milestoneStatusAction, projectNoteAction } from "../../actions";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("projects:read");
  const { id } = await params;
  const [project, opts] = await Promise.all([getInternalProject(user, id), listPickerOptions()]);
  if (!project) notFound();
  const canWrite = userCan(user, "projects:write");
  const client = project.clientId as unknown as { _id: { toString(): string }; name: string } | null;
  const owner = project.ownerId as unknown as { name: string } | null;
  const proposal = project.proposalId as unknown as { _id: { toString(): string }; reference: string; status: string } | null;

  return (
    <>
      <PageHeader
        eyebrow="Internal project"
        title={project.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} /> {project.progressPercent ?? 0}%, owner {owner?.name ?? "Not set"}
            {project.deadline ? `, deadline ${formatDate(project.deadline)}` : ""}
          </span>
        }
        actions={<Link href="/admin/projects" className="text-xs text-muted hover:text-on-dark">All projects</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Milestones">
            {project.milestones.length ? (
              <ul className="mb-4 flex flex-col gap-2">
                {project.milestones.map((m) => (
                  <li key={m._id?.toString()} className="flex flex-col gap-2 rounded-lg border border-[rgba(245,245,243,0.08)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted">
                        {m.dueAt ? `Due ${formatDate(m.dueAt)}` : "No due date"}
                        {m.completedAt ? `, done ${formatDate(m.completedAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={m.status} />
                      {canWrite &&
                        (["IN_PROGRESS", "DONE", "BLOCKED", "PENDING"] as const)
                          .filter((s) => s !== m.status)
                          .slice(0, 2)
                          .map((s) => (
                            <ActionButton key={s} action={milestoneStatusAction} fields={{ id, milestoneId: m._id!.toString(), status: s }} variant="secondary" className="min-h-8 px-2 text-xs">
                              {s === "DONE" ? "Mark done" : s === "IN_PROGRESS" ? "Start" : s === "BLOCKED" ? "Block" : "Reset"}
                            </ActionButton>
                          ))}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">No milestones yet.</p>
            )}
            {canWrite && (
              <ActionForm action={milestoneAddAction} resetOnSuccess className="rounded-lg border border-dashed border-[rgba(245,245,243,0.15)] p-3">
                <input type="hidden" name="id" value={id} />
                <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-end">
                  <FormRow>
                    <FieldLabel htmlFor="ms-title">New milestone</FieldLabel>
                    <input id="ms-title" name="title" className={inputClass} required />
                  </FormRow>
                  <FormRow>
                    <FieldLabel htmlFor="ms-due">Due</FieldLabel>
                    <input id="ms-due" name="dueAt" type="date" className={inputClass} />
                  </FormRow>
                  <Submit variant="secondary">Add</Submit>
                </div>
              </ActionForm>
            )}
          </Card>
          <Card title="Progress notes">
            {canWrite && (
              <ActionForm action={projectNoteAction} resetOnSuccess className="mb-4">
                <input type="hidden" name="id" value={id} />
                <FormRow>
                  <FieldLabel htmlFor="pn-body">Add a note</FieldLabel>
                  <textarea id="pn-body" name="body" rows={2} className={inputClass} required />
                </FormRow>
                <div>
                  <Submit variant="secondary">Add note</Submit>
                </div>
              </ActionForm>
            )}
            {project.notes.length ? (
              <ul className="flex flex-col gap-2">
                {[...project.notes].reverse().map((n, i) => (
                  <li key={i} className="rounded-lg bg-[rgba(245,245,243,0.04)] p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {n.authorLabel}, {formatDateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No notes yet.</p>
            )}
          </Card>
          {canWrite && (
            <Card title="Edit project">
              <ProjectForm project={project as never} clients={opts.clients} staff={opts.staff} leads={opts.leads} proposals={opts.proposals} />
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card title="Links">
            <KeyValue
              className="sm:grid-cols-1"
              items={[
                ["Client", client ? <Link key="c" href={`/admin/clients/${client._id.toString()}`} className="underline underline-offset-4">{client.name}</Link> : ", "],
                ["Proposal", proposal ? <Link key="p" href={`/admin/proposals/${proposal._id.toString()}`} className="underline underline-offset-4">{proposal.reference} ({proposal.status})</Link> : ", "],
                ["Start", project.startDate ? formatDate(project.startDate) : ", "],
                ["Deadline", project.deadline ? formatDate(project.deadline) : ", "],
                ["Members", (project.memberIds as unknown as { name: string }[]).map((m) => m.name).join(", ") || ", "],
                ["Confidential", project.confidential ? "Yes" : "No"],
              ]}
            />
            {project.summary && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{project.summary}</p>}
          </Card>
          <div className="h-1.5 rounded-full bg-[rgba(245,245,243,0.08)]" aria-hidden="true">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${project.progressPercent ?? 0}%` }} />
          </div>
        </div>
      </div>
    </>
  );
}
