import { ActionForm, Submit } from "./action-form";
import { FieldLabel, FormRow, inputClass, selectClass } from "./ui";
import { projectUpsertAction } from "@/app/admin/(dashboard)/actions";

type Opt = { _id: { toString(): string }; name: string };
type ProjectLike = {
  _id?: { toString(): string };
  name?: string;
  status?: string;
  clientId?: { _id: { toString(): string } } | { toString(): string } | null;
  leadId?: { _id: { toString(): string } } | { toString(): string } | null;
  proposalId?: { _id: { toString(): string } } | { toString(): string } | null;
  ownerId?: { _id: { toString(): string } } | { toString(): string } | null;
  memberIds?: ({ _id: { toString(): string } } | { toString(): string })[];
  summary?: string;
  startDate?: Date;
  deadline?: Date;
  progressPercent?: number;
  confidential?: boolean;
};

function idOf(v: unknown): string {
  if (!v) return "";
  if (typeof v === "object" && v !== null && "_id" in v) return String((v as { _id: { toString(): string } })._id.toString());
  return String((v as { toString(): string }).toString());
}
const d = (v?: Date) => (v ? new Date(v).toISOString().slice(0, 10) : "");
export function ProjectForm({ project, clients, staff, leads, proposals }: { project?: ProjectLike; clients: Opt[]; staff: Opt[]; leads: { _id: { toString(): string }; title: string }[]; proposals: { _id: { toString(): string }; reference: string; title: string }[] }) {
  return (
    <ActionForm action={projectUpsertAction} refresh={!!project?._id}>
      {project?._id && <input type="hidden" name="id" value={project._id.toString()} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow className="sm:col-span-2">
          <FieldLabel htmlFor="pr-name">Project name</FieldLabel>
          <input id="pr-name" name="name" defaultValue={project?.name ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-status">Status</FieldLabel>
          <select id="pr-status" name="status" defaultValue={project?.status ?? "PLANNED"} className={selectClass}>
            {["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-owner">Owner</FieldLabel>
          <select id="pr-owner" name="ownerId" defaultValue={idOf(project?.ownerId)} className={selectClass}>
            <option value="">Me</option>
            {staff.map((s) => (
              <option key={s._id.toString()} value={s._id.toString()}>
                {s.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-client">Client</FieldLabel>
          <select id="pr-client" name="clientId" defaultValue={idOf(project?.clientId)} className={selectClass}>
            <option value="">None</option>
            {clients.map((c) => (
              <option key={c._id.toString()} value={c._id.toString()}>
                {c.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-lead">Lead</FieldLabel>
          <select id="pr-lead" name="leadId" defaultValue={idOf(project?.leadId)} className={selectClass}>
            <option value="">None</option>
            {leads.map((l) => (
              <option key={l._id.toString()} value={l._id.toString()}>
                {l.title}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-proposal">Proposal</FieldLabel>
          <select id="pr-proposal" name="proposalId" defaultValue={idOf(project?.proposalId)} className={selectClass}>
            <option value="">None</option>
            {proposals.map((p) => (
              <option key={p._id.toString()} value={p._id.toString()}>
                {p.reference}, {p.title}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-members" hint="(ctrl/cmd-click for several)">
            Team members
          </FieldLabel>
          <select id="pr-members" name="memberIds[]" multiple defaultValue={(project?.memberIds ?? []).map(idOf)} className={`${selectClass} min-h-24`}>
            {staff.map((s) => (
              <option key={s._id.toString()} value={s._id.toString()}>
                {s.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-start">Start date</FieldLabel>
          <input id="pr-start" name="startDate" type="date" defaultValue={d(project?.startDate)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-deadline">Deadline</FieldLabel>
          <input id="pr-deadline" name="deadline" type="date" defaultValue={d(project?.deadline)} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="pr-progress">Progress %</FieldLabel>
          <input id="pr-progress" name="progressPercent" type="number" min={0} max={100} defaultValue={project?.progressPercent ?? 0} className={inputClass} />
        </FormRow>
      </div>
      <FormRow>
        <FieldLabel htmlFor="pr-summary">Summary</FieldLabel>
        <textarea id="pr-summary" name="summary" rows={3} defaultValue={project?.summary ?? ""} className={inputClass} />
      </FormRow>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="confidential" defaultChecked={project?.confidential ?? true} className="accent-[var(--color-accent)]" />
        Confidential (never shown publicly. Portfolio case studies are separate records)
      </label>
      <div>
        <Submit>{project?._id ? "Save project" : "Create project"}</Submit>
      </div>
    </ActionForm>
  );
}
