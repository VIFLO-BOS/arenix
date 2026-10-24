"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/validation/form-state";
import { initialFormState } from "@/lib/validation/form-state";
import { cn } from "@/lib/utils";
import { btnAccent, btnDanger, btnPrimary, btnSecondary } from "./ui";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
/**
 * Generic admin form bound to a server action, shows field errors, a status message and
 * optionally resets/refreshes on success.
 */
export function ActionForm({ action, children, className, resetOnSuccess, onSuccessMessage = "Saved.", refresh = true }: { action: Action; children: ReactNode | ((state: FormState) => ReactNode); className?: string; resetOnSuccess?: boolean; onSuccessMessage?: string; refresh?: boolean }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      if (refresh) router.refresh();
    }
  }, [state, resetOnSuccess, refresh, router]);
  return (
    <form ref={ref} action={formAction} className={cn("flex flex-col gap-3", className)} noValidate>
      {state.message && (
        <div role={state.ok ? "status" : "alert"} className={cn("rounded-lg border px-3 py-2 text-xs", state.ok ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10")}>
          <p className="break-words">{state.ok ? (state.message === "Saved." ? onSuccessMessage : state.message) : state.message}</p>
          {!state.ok && state.errors && (
            <ul className="mt-1 list-disc pl-4">
              {Object.entries(state.errors).map(([k, v]) => (
                <li key={k}>
                  <span className="font-mono">{k}</span>. {v}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state.errors?.[name];
  if (!msg) return null;
  return (
    <p role="alert" className="text-xs text-danger">
      {msg}
    </p>
  );
}

export function Submit({ children, variant = "primary", className, pendingLabel = "Saving" }: { children: ReactNode; variant?: "primary" | "accent" | "secondary" | "danger"; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const cls = { primary: btnPrimary, accent: btnAccent, secondary: btnSecondary, danger: btnDanger }[variant];
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn(cls, className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * One click action with hidden fields and an optional native confirm() for risky changes.
 */
export function ActionButton({ action, fields, children, confirm, variant = "secondary", className }: { action: Action; fields: Record<string, string>; children: ReactNode; confirm?: string; variant?: "primary" | "accent" | "secondary" | "danger"; className?: string }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col gap-1"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Submit variant={variant} className={className} pendingLabel="Working">
        {children}
      </Submit>
      {state.message && !state.ok && (
        <span role="alert" className="text-[0.7rem] text-danger">
          {state.message}
        </span>
      )}
    </form>
  );
}
