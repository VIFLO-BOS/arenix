import { ForgotPasswordForm } from "@/components/admin/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">Enter the email on your account. We send a one hour reset link. In demo email mode the link is written to the server log.</p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
