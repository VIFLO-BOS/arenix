"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { acceptInviteAction, forgotPasswordAction, loginAction, resetPasswordAction } from "@/app/admin/(auth)/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/fields";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? "/admin"} />
      {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field label="Email" htmlFor={`${id}-email`} required>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" htmlFor={`${id}-password`} required>
        <Input id={`${id}-password`} name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>
      <SubmitButton pendingLabel="Signing in" size="md">
        Sign in
      </SubmitButton>
      <Link href="/admin/forgot-password" className="text-center text-xs text-[var(--fg-muted)] underline-offset-4 hover:underline">
        Forgot your password?
      </Link>
    </form>
  );
}

export function InviteAcceptForm({ token, email, name }: { token: string; email: string; name: string }) {
  const [state, action] = useActionState(acceptInviteAction, initialFormState);
  const id = useId();
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.message && !state.ok && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field label="Email" htmlFor={`${id}-email`} required>
        <Input id={`${id}-email`} value={email} readOnly disabled />
      </Field>
      <Field label="Your name" htmlFor={`${id}-name`} required error={e.name}>
        <Input id={`${id}-name`} name="name" defaultValue={name} autoComplete="name" required error={e.name} />
      </Field>
      <Field label="Password" htmlFor={`${id}-password`} required error={e.password} hint="At least 12 characters with upper case, lower case and a number.">
        <Input id={`${id}-password`} name="password" type="password" autoComplete="new-password" required error={e.password} />
      </Field>
      <Field label="Confirm password" htmlFor={`${id}-confirm`} required error={e.confirm}>
        <Input id={`${id}-confirm`} name="confirm" type="password" autoComplete="new-password" required error={e.confirm} />
      </Field>
      <SubmitButton pendingLabel="Creating account" size="md">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialFormState);
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>}
      <Field label="Email" htmlFor={`${id}-email`} required>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="username" required />
      </Field>
      <SubmitButton pendingLabel="Sending" size="md">
        Send reset link
      </SubmitButton>
      <Link href="/admin/login" className="text-center text-xs text-[var(--fg-muted)] underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  const id = useId();
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.message && !state.ok && <FormMessage tone="error">{state.message}</FormMessage>}
      <Field label="New password" htmlFor={`${id}-password`} required error={e.password} hint="At least 12 characters with upper case, lower case and a number.">
        <Input id={`${id}-password`} name="password" type="password" autoComplete="new-password" required error={e.password} />
      </Field>
      <Field label="Confirm password" htmlFor={`${id}-confirm`} required error={e.confirm}>
        <Input id={`${id}-confirm`} name="confirm" type="password" autoComplete="new-password" required error={e.confirm} />
      </Field>
      <SubmitButton pendingLabel="Saving…" size="md">
        Set new password
      </SubmitButton>
    </form>
  );
}
