"use client";

import { useFormStatus } from "react-dom";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Checkbox as RadixCheckbox, Select as RadixSelect } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "./button";

const control =
  "w-full rounded-xl border border-[var(--line-strong)] bg-transparent px-3.5 py-2.5 text-[0.95rem] text-[var(--fg)] placeholder:text-[var(--fg-muted)] transition-colors duration-500 focus:border-[var(--color-accent)] focus:outline-none aria-[invalid=true]:border-danger min-h-11";

export function Field({ label, htmlFor, hint, error, required, children, className }: { label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--fg)]">
        {label}
        {required ? <span aria-hidden="true" className="text-accent"> *</span> : <span className="ml-1 text-xs font-normal text-[var(--fg-muted)]">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs text-[var(--fg-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, error, ...props }: ComponentPropsWithoutRef<"input"> & { error?: string }) {
  return <input className={cn(control, className)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${props.id}-error` : undefined} {...props} />;
}

export function Textarea({ className, error, ...props }: ComponentPropsWithoutRef<"textarea"> & { error?: string }) {
  return <textarea className={cn(control, "min-h-32 resize-y", className)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${props.id}-error` : undefined} {...props} />;
}

export type SelectOption = { value: string; label: string };

/**
 * Radix Select. Renders a hidden native select for form submission (via `name`), so server
 * actions read it exactly like a plain select. The empty value is represented by the
 * placeholder, because Radix reserves "" for "no selection".
 */
export function Select({ id, name, options, defaultValue, placeholder = "Choose", error, required, className, onValueChange }: { id: string; name: string; options: SelectOption[]; defaultValue?: string; placeholder?: string; error?: string; required?: boolean; className?: string; onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState(defaultValue && options.some((o) => o.value === defaultValue) ? defaultValue : "");
  return (
    <RadixSelect.Root
      name={name}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValueChange?.(v);
      }}
      required={required}
    >
      <RadixSelect.Trigger id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={cn(control, "flex items-center justify-between gap-3 text-left data-[placeholder]:text-[var(--fg-muted)]", className)}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-4 text-[var(--fg-muted)]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content position="popper" sideOffset={6} className="radix-pop z-[90] max-h-[min(60vh,20rem)] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[var(--line-strong)] bg-surface-deep text-on-dark shadow-[0_24px_60px_-20px_rgba(2,10,30,0.8)]" data-surface="dark">
          <RadixSelect.Viewport className="p-1.5">
            {options.map((o) => (
              <RadixSelect.Item key={o.value || "__empty"} value={o.value} disabled={o.value === ""} className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm outline-none transition-colors duration-300 data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[highlighted]:bg-[rgba(246,243,234,0.08)] data-[state=checked]:text-accent">
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-3 text-accent" aria-hidden="true">
                  ✓
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

/** Radix Checkbox. `name` makes it submit as "on" like a native checkbox. */
export function Checkbox({ id, name, label, error, className, defaultChecked, value = "on", required }: { id: string; name: string; label: ReactNode; error?: string; className?: string; defaultChecked?: boolean; value?: string; required?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-start gap-3 text-sm text-[var(--fg)]">
        <RadixCheckbox.Root
          id={id}
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-[var(--line-strong)] bg-transparent transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] data-[state=checked]:border-accent data-[state=checked]:bg-accent aria-[invalid=true]:border-danger"
        >
          <RadixCheckbox.Indicator className="text-ink">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5L20 7" />
            </svg>
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label htmlFor={id} className="cursor-pointer">
          {label}
        </label>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, pendingLabel = "Sending", className, variant = "primary", size = "lg", pending: pendingProp }: { children: ReactNode; pendingLabel?: string; className?: string; variant?: "primary" | "accent" | "secondary" | "danger"; size?: "sm" | "md" | "lg"; pending?: boolean }) {
  const status = useFormStatus();
  const pending = status.pending || !!pendingProp;
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const cls = tone === "error" ? "border-danger/40 bg-danger/10 text-[var(--fg)]" : tone === "success" ? "border-success/40 bg-success/10" : "border-[var(--line-strong)] bg-[var(--line)]";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

export function Honeypot() {
  return (
    <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
