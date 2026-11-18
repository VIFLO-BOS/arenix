import { requirePermission, userCan } from "@/server/auth/session";
import { listSuppressions } from "@/server/research/service";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, EmptyState, Table, Td, FieldLabel, FormRow, inputClass, selectClass } from "@/components/admin/ui";
import { ActionButton, ActionForm, Submit } from "@/components/admin/action-form";
import { ResearchNav } from "@/components/admin/research/research-nav";
import { suppressionAddAction, suppressionRemoveAction } from "../research-actions";

const KIND_LABEL = { DOMAIN: "Website domain", EMAIL: "Email address", PHONE: "Phone number" } as const;

export default async function OptOutsPage() {
  const user = await requirePermission("leads:read");
  const canWrite = userCan(user, "leads:write");
  const canRemove = userCan(user, "settings:write");
  const entries = await listSuppressions(300);

  return (
    <>
      <PageHeader
        eyebrow="Find leads"
        title="Opt outs"
        description="Businesses and people who asked not to be contacted. Lead research checks this list before it stores any contact detail and before any draft is written. Email addresses and numbers are kept only as a one way hash."
      />
      <ResearchNav current="/admin/leads/opt-outs" showSettings={canRemove} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {canWrite && (
          <Card title="Add an opt out" description="Adding a domain also removes the stored details of every business on it.">
            <ActionForm action={suppressionAddAction} resetOnSuccess>
              <FormRow>
                <FieldLabel htmlFor="so-kind">What to block</FieldLabel>
                <select id="so-kind" name="kind" defaultValue="DOMAIN" className={selectClass}>
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="so-value" hint="(numbers in international format, for example +2348031234567)">
                  Value
                </FieldLabel>
                <input id="so-value" name="value" required maxLength={200} className={inputClass} />
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="so-reason">How they asked</FieldLabel>
                <input id="so-reason" name="reason" maxLength={200} className={inputClass} />
              </FormRow>
              <div>
                <Submit>Add to opt outs</Submit>
              </div>
            </ActionForm>
          </Card>
        )}
        <Card title={`On the list (${entries.length})`}>
          {entries.length ? (
            <Table head={["Kind", "Entry", "Reason", "Added", ""]} caption="Opt outs" className="text-xs">
              {entries.map((e) => {
                const by = e.addedBy as unknown as { name?: string } | null;
                return (
                  <tr key={e._id.toString()}>
                    <Td>{KIND_LABEL[e.kind]}</Td>
                    <Td className="break-all font-mono">{e.hint ?? "Hidden"}</Td>
                    <Td muted>{e.reason ?? "Not given"}</Td>
                    <Td muted>
                      {formatDateTime(e.createdAt)}
                      {by?.name ? ` by ${by.name}` : ""}
                    </Td>
                    <Td>
                      {canRemove && (
                        <ActionButton action={suppressionRemoveAction} fields={{ id: e._id.toString() }} confirm="Remove this opt out? Only do this if it was added by mistake." variant="danger">
                          Remove
                        </ActionButton>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <EmptyState title="No opt outs yet" body="When a business asks not to be contacted, record it here or from its research profile." />
          )}
        </Card>
      </div>
    </>
  );
}
