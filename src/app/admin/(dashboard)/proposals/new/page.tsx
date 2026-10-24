import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { getLead, listClients } from "@/server/services/crm";
import { PageHeader, Card, FieldLabel, FormRow, inputClass, selectClass } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/action-form";
import { ProposalVersionFields } from "@/components/admin/proposal-version-fields";
import { proposalCreateAction } from "../../actions";

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ leadId?: string }> }) {
  await requirePermission("proposals:write");
  const sp = await searchParams;
  const [leadData, clients] = await Promise.all([sp.leadId ? getLead(sp.leadId) : null, listClients({ page: 1 })]);
  const lead = leadData?.lead;
  const leadClient = lead?.clientId as unknown as { _id: { toString(): string }; name: string } | null;

  return (
    <>
      <PageHeader title="New proposal" description={lead ? `For lead ${lead.title}` : "Create a draft. Pricing is only ever stated here, in a versioned document."} actions={<Link href="/admin/proposals" className="text-xs text-muted hover:text-on-dark">All proposals</Link>} />
      <Card className="max-w-3xl">
        <ActionForm action={proposalCreateAction} refresh={false}>
          {lead && <input type="hidden" name="leadId" value={lead._id.toString()} />}
          <FormRow>
            <FieldLabel htmlFor="p-title">Title</FieldLabel>
            <input id="p-title" name="title" defaultValue={lead ? `Proposal, ${lead.title}` : ""} className={inputClass} required />
          </FormRow>
          <FormRow>
            <FieldLabel htmlFor="p-client">Client</FieldLabel>
            <select id="p-client" name="clientId" defaultValue={leadClient?._id.toString() ?? ""} className={selectClass}>
              <option value="">{lead ? "Use the lead's client" : "No client yet"}</option>
              {clients.items.map((c) => (
                <option key={c._id.toString()} value={c._id.toString()}>
                  {c.name}
                  {c.email ? `, ${c.email}` : ""}
                </option>
              ))}
            </select>
          </FormRow>
          <ProposalVersionFields />
          <div>
            <Submit>Create draft (v1)</Submit>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
