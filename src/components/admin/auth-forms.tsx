"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  acceptInviteAction,
  cancelSignInAction,
  forgotPasswordAction,
  loginAction,
  resendCodeAction,
  resetPasswordAction,
  verifyCodeAction,
} from "@/app/admin/(auth)/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/fields";
import { cn } from "@/lib/utils";

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

/** Counts down once a second from `seconds`. Remount with a new key to start again. */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return left;
}

function ResendButton({ seconds, canResend, pending }: { seconds: number; canResend: boolean; pending: boolean }) {
  const left = useCountdown(seconds);
  const label = !canResend ? "No more codes for this sign in" : pending ? "Sending a new code" : left > 0 ? `Send a new code in ${left}s` : "Send a new code";
  return (
    <button
      type="submit"
      disabled={!canResend || pending || left > 0}
      className="text-xs font-medium text-slate-600 underline-offset-4 transition-colors hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
    >
      {label}
    </button>
  );
}

/** The code field. It starts empty after every failed attempt because the parent remounts it. */
function CodeInput({ id, onComplete }: { id: string; onComplete: () => void }) {
  const [code, setCode] = useState("");
  return (
    <Input
      id={id}
      name="code"
      value={code}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(digits);
        if (digits.length === 6) onComplete();
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={12}
      autoFocus
      required
      aria-describedby={`${id}-hint`}
      className="text-center font-mono text-2xl font-semibold tracking-[0.5em] placeholder:text-slate-300"
      placeholder="000000"
    />
  );
}

/** Step two of sign in. One field for the six digit code, which submits itself when complete. */
export function VerifyCodeForm({ resendWait, canResend }: { resendWait: number; canResend: boolean }) {
  const [state, action] = useActionState(verifyCodeAction, initialFormState);
  const [resendState, resendAction, resendPending] = useActionState(resendCodeAction, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  return (
    <div className="flex flex-col gap-5">
      <form ref={formRef} action={action} className="flex flex-col gap-4" noValidate>
        {state.message && <FormMessage tone="error">{state.message}</FormMessage>}
        {resendState.message && <FormMessage tone={resendState.ok ? "success" : "error"}>{resendState.message}</FormMessage>}
        <Field label="Six digit code" htmlFor={`${id}-code`} required>
          {/* Microtask delay lets React commit the sixth digit before the form reads it. */}
          <CodeInput key={state.message ?? "first"} id={`${id}-code`} onComplete={() => queueMicrotask(() => formRef.current?.requestSubmit())} />
        </Field>
        <p id={`${id}-code-hint`} className="-mt-2 text-xs text-slate-500" aria-live="off">
          Paste or type the code. It signs you in as soon as all six digits are in.
        </p>
        <SubmitButton pendingLabel="Checking" size="md">
          Verify and sign in
        </SubmitButton>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <form action={resendAction}>
          <ResendButton key={resendState.ok ? (resendState.message ?? "sent") : "initial"} seconds={resendState.ok ? 60 : resendWait} canResend={canResend} pending={resendPending} />
        </form>
        <form action={cancelSignInAction}>
          <button type="submit" className={cn("text-xs text-slate-500 underline-offset-4 transition-colors hover:text-slate-900 hover:underline")}>
            Use a different account
          </button>
        </form>
      </div>
    </div>
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
