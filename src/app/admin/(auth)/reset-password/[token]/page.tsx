import Link from "next/link";
import { validateResetToken } from "@/server/services/team";
import { ResetPasswordForm } from "@/components/admin/auth-forms";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await validateResetToken(token).catch(() => false);
  if (!valid) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">Link not valid</h1>
        <p className="mt-2 text-sm text-slate-500">This reset link has expired or was already used.</p>
        <Link href="/admin/forgot-password" className="mt-6 inline-block text-sm underline underline-offset-4">
          Request a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-500">All other sessions for this account will be signed out.</p>
      <div className="mt-6">
        <ResetPasswordForm token={token} />
      </div>
    </>
  );
}
