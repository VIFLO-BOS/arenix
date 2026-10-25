import Link from "next/link";
import { validateInviteToken } from "@/server/services/team";
import { InviteAcceptForm } from "@/components/admin/auth-forms";
import { ROLE_LABEL } from "@/server/auth/permissions";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await validateInviteToken(token).catch(() => null);
  if (!invite) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">Invitation not valid</h1>
        <p className="mt-2 text-sm text-slate-500">This invitation link has expired, was already used, or was revoked. Ask an administrator to send a new one.</p>
        <Link href="/admin/login" className="mt-6 inline-block text-sm underline underline-offset-4">
          Go to sign in
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Accept invitation</h1>
      <p className="mt-1 text-sm text-slate-500">
        You are joining as <strong className="text-slate-900">{ROLE_LABEL[invite.role]}</strong>. Choose a password to create your account.
      </p>
      <div className="mt-6">
        <InviteAcceptForm token={token} email={invite.email} name={invite.name} />
      </div>
    </>
  );
}
