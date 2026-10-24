import { requirePermission } from "@/server/auth/session";
import { listTeam } from "@/server/services/team";
import { ROLES } from "@/server/db/models/user";
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/server/auth/permissions";
import { integrations } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, Card, Table, Td, FieldLabel, FormRow, inputClass, selectClass, Notice } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm, Submit } from "@/components/admin/action-form";
import { activeToggleAction, inviteAction, revokeInviteAction, roleChangeAction } from "../actions";

export default async function TeamPage() {
  const me = await requirePermission("team:manage");
  const { users, invitations } = await listTeam();
  const assignable = ROLES.filter((r) => r !== "SUPER_ADMIN" || me.role === "SUPER_ADMIN");
  return (
    <>
      <PageHeader title="Team" description="Invitation only accounts with server enforced roles. There is no public sign up." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title={`Members (${users.length})`}>
            <Table head={["Name", "Role", "Status", "Last login", ""]} caption="Team members">
              {users.map((u) => {
                const isMe = u._id.toString() === me.id;
                return (
                  <tr key={u._id.toString()}>
                    <Td>
                      <p className="font-medium">
                        {u.name} {isMe && <span className="text-xs text-muted">(you)</span>}
                      </p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </Td>
                    <Td>
                      {isMe || (u.role === "SUPER_ADMIN" && me.role !== "SUPER_ADMIN") ? (
                        <Badge tone="outline">{ROLE_LABEL[u.role]}</Badge>
                      ) : (
                        <ActionForm action={roleChangeAction} className="flex-row items-center gap-1">
                          <input type="hidden" name="id" value={u._id.toString()} />
                          <select name="role" defaultValue={u.role} className={`${selectClass} min-h-8 w-44 text-xs`} aria-label={`Role for ${u.name}`}>
                            {assignable.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          <Submit variant="secondary" className="min-h-8 px-2 text-xs">
                            Set
                          </Submit>
                        </ActionForm>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                    </Td>
                    <Td muted>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</Td>
                    <Td>
                      {!isMe && !(u.role === "SUPER_ADMIN" && me.role !== "SUPER_ADMIN") && (
                        <ActionButton action={activeToggleAction} fields={{ id: u._id.toString(), active: u.isActive ? "false" : "true" }} variant={u.isActive ? "danger" : "secondary"} className="min-h-8 px-2 text-xs" confirm={u.isActive ? `Deactivate ${u.name}? Their sessions will be signed out.` : undefined}>
                          {u.isActive ? "Deactivate" : "Reactivate"}
                        </ActionButton>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
          <Card title={`Pending invitations (${invitations.length})`}>
            {invitations.length ? (
              <Table head={["Email", "Role", "Expires", ""]} caption="Pending invitations">
                {invitations.map((i) => (
                  <tr key={i._id.toString()}>
                    <Td>
                      <p>{i.email}</p>
                      <p className="text-xs text-muted">{i.name}</p>
                    </Td>
                    <Td muted>{i.role ? ROLE_LABEL[i.role] : "Not set"}</Td>
                    <Td muted>{formatDateTime(i.expiresAt)}</Td>
                    <Td>
                      <ActionButton action={revokeInviteAction} fields={{ id: i._id.toString() }} variant="danger" className="min-h-8 px-2 text-xs">
                        Revoke
                      </ActionButton>
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="text-sm text-muted">No pending invitations.</p>
            )}
          </Card>
          <Card title="Role matrix" description="What each role can do (enforced server side on every action).">
            <Table head={["Role", "Permissions"]} caption="Role permissions">
              {ROLES.map((r) => (
                <tr key={r}>
                  <Td>
                    <span className="font-medium">{ROLE_LABEL[r]}</span>
                  </Td>
                  <Td>
                    <p className="text-xs text-muted">{[...ROLE_PERMISSIONS[r]].join(", ")}</p>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div>
          <Card title="Invite a team member" description="The invitation link expires in 72 hours and can be used once.">
            {!integrations.email.configured && (
              <div className="mb-3">
                <Notice tone="warning">Email is in demo mode, the invitation link will be shown here after you submit so you can share it manually.</Notice>
              </div>
            )}
            <ActionForm action={inviteAction} resetOnSuccess>
              <FormRow>
                <FieldLabel htmlFor="inv-name">Name</FieldLabel>
                <input id="inv-name" name="name" className={inputClass} required />
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="inv-email">Email</FieldLabel>
                <input id="inv-email" name="email" type="email" className={inputClass} required />
              </FormRow>
              <FormRow>
                <FieldLabel htmlFor="inv-role">Role</FieldLabel>
                <select id="inv-role" name="role" defaultValue="CONTENT_MANAGER" className={selectClass}>
                  {assignable.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </FormRow>
              <div>
                <Submit>Send invitation</Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
