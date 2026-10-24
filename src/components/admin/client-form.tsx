import { ActionForm, Submit } from "./action-form";
import { FieldLabel, FormRow, inputClass, selectClass } from "./ui";
import { clientUpsertAction } from "@/app/admin/(dashboard)/actions";

type ClientLike = {
  _id?: { toString(): string };
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  jobTitle?: string;
  organizationId?: { name?: string } | null;
  preferredContact?: string;
  tags?: string[];
  notes?: string;
  marketingConsent?: boolean;
};

export function ClientForm({ client }: { client?: ClientLike }) {
  const org = client?.organizationId as { name?: string } | null | undefined;
  return (
    <ActionForm action={clientUpsertAction}>
      {client?._id && <input type="hidden" name="id" value={client._id.toString()} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow>
          <FieldLabel htmlFor="c-name">Name</FieldLabel>
          <input id="c-name" name="name" defaultValue={client?.name ?? ""} className={inputClass} required />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-email">Email</FieldLabel>
          <input id="c-email" name="email" type="email" defaultValue={client?.email ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-phone">Phone</FieldLabel>
          <input id="c-phone" name="phone" defaultValue={client?.phone ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-wa">WhatsApp</FieldLabel>
          <input id="c-wa" name="whatsapp" defaultValue={client?.whatsapp ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-job">Job title</FieldLabel>
          <input id="c-job" name="jobTitle" defaultValue={client?.jobTitle ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-org">Organisation</FieldLabel>
          <input id="c-org" name="organizationName" defaultValue={org?.name ?? ""} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-pref">Preferred contact</FieldLabel>
          <select id="c-pref" name="preferredContact" defaultValue={client?.preferredContact ?? "EMAIL"} className={selectClass}>
            <option value="EMAIL">Email</option>
            <option value="PHONE">Phone</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="c-tags" hint="(comma separated)">
            Tags
          </FieldLabel>
          <input id="c-tags" name="tags" defaultValue={(client?.tags ?? []).join(", ")} className={inputClass} />
        </FormRow>
      </div>
      <FormRow>
        <FieldLabel htmlFor="c-notes">Notes</FieldLabel>
        <textarea id="c-notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className={inputClass} />
      </FormRow>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="marketingConsent" defaultChecked={!!client?.marketingConsent} className="accent-[var(--color-accent)]" />
        Marketing consent given (separate from transactional contact)
      </label>
      <div>
        <Submit>{client?._id ? "Save client" : "Create client"}</Submit>
      </div>
    </ActionForm>
  );
}
