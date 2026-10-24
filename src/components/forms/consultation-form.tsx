"use client";

import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { submitConsultationRequest } from "@/app/(site)/book-consultation/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { CONSULTATION_TYPES } from "@/types/content";
import { Checkbox, Field, FormMessage, Honeypot, Input, SubmitButton, Textarea } from "@/components/ui/fields";
import { Button, ArrowIcon } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox as RadixCheckbox, RadioGroup } from "radix-ui";
import { useIdempotencyKey } from "./use-idempotency-key";
import { useManualAction } from "./use-manual-action";

const WINDOWS = ["Weekday mornings (9am to 12pm)", "Weekday afternoons (12pm to 5pm)", "Early evening (5pm to 7pm)", "Flexible"];

const noopSubscribe = () => () => {};
function readTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

export function ConsultationForm({ defaults, operatingHoursNote }: { defaults: { type?: string; service?: string }; operatingHoursNote: string }) {
  const [state, action, pending] = useActionState(submitConsultationRequest, initialFormState);
  const onSubmit = useManualAction(action);
  const id = useId();
  const keyRef = useIdempotencyKey();
  const [type, setType] = useState(defaults.type && CONSULTATION_TYPES.some((c) => c.key === defaults.type) ? defaults.type : "discovery");
  const tz = useSyncExternalStore(noopSubscribe, readTimezone, () => "");
  const [teamTime, setTeamTime] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  // Remount the form on each server response (see contact-form.tsx for the rationale).
  const [seen, setSeen] = useState(state);
  const [serial, setSerial] = useState(0);
  if (seen !== state) {
    setSeen(state);
    setSerial((s) => s + 1);
  }

  useEffect(() => {
    const tick = () => setTeamTime(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos", weekday: "short" }).format(new Date()));
    const first = setTimeout(tick, 0);
    const i = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(i);
    };
  }, []);

  useEffect(() => {
    if (state.ok) successRef.current?.focus();
  }, [state.ok]);

  const selected = CONSULTATION_TYPES.find((c) => c.key === type);

  if (state.ok) {
    return (
      <div ref={successRef} tabIndex={-1} className="rounded-2xl border border-info/40 bg-info/10 p-6 outline-none sm:p-8" role="status" aria-live="polite">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="info">Requested</Badge>
          <p className="text-micro text-[var(--fg-muted)]">Not yet confirmed</p>
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold">Your consultation request is saved.</h3>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Reference <span className="font-mono text-[var(--fg)]">{state.reference}</span>. This is a request, not a confirmed appointment. The team will propose a time by email. Once you accept, you will receive a confirmation with the meeting details.
        </p>
        <div className="mt-6 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
          <Button href="/work" variant="secondary">
            Browse our work while you wait <ArrowIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form key={serial} action={action} onSubmit={onSubmit} className="relative flex flex-col gap-6" noValidate>
      <fieldset disabled={pending} className="contents">
      <Honeypot />
      <input ref={keyRef} type="hidden" name="idempotencyKey" defaultValue="" />
      <input type="hidden" name="visitorTimezone" value={tz} />
      <input type="hidden" name="serviceContext" value={v.serviceContext ?? defaults.service ?? ""} />
      {state.message && !state.ok && <FormMessage tone="error">{state.message}</FormMessage>}

      <fieldset>
        <legend className="text-sm font-medium">Consultation type</legend>
        <RadioGroup.Root name="consultationType" value={type} onValueChange={setType} aria-label="Consultation type" className="mt-3 grid gap-2 sm:grid-cols-2">
          {CONSULTATION_TYPES.map((c) => {
            const checked = type === c.key;
            return (
              <label key={c.key} htmlFor={`${id}-type-${c.key}`} className={cn("flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors duration-500", checked ? "border-accent bg-accent/10" : "border-[var(--line-strong)] hover:border-[var(--fg)]")}>
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <RadioGroup.Item id={`${id}-type-${c.key}`} value={c.key} className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] data-[state=checked]:border-accent">
                      <RadioGroup.Indicator className="size-2 rounded-full bg-accent" />
                    </RadioGroup.Item>
                    {c.label}
                  </span>
                  <span className="font-mono text-xs text-[var(--fg-muted)]">{c.durationMinutes} min</span>
                </span>
                <span className="pl-6 text-xs leading-relaxed text-[var(--fg-muted)]">{c.description}</span>
              </label>
            );
          })}
        </RadioGroup.Root>
        {e.consultationType && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {e.consultationType}
          </p>
        )}
      </fieldset>

      <div className="rounded-xl bg-[var(--line)] p-4 text-sm">
        <p className="font-medium">What to expect</p>
        <p className="mt-1 text-[var(--fg-muted)]">A {selected?.durationMinutes} minute video or phone call. We ask about goals, constraints and context, and tell you honestly whether we are the right fit. No obligation. Pricing is only ever quoted in a written proposal.</p>
        <p className="mt-3 text-xs text-[var(--fg-muted)]">
          Team hours {operatingHoursNote}. Team time now <span className="font-mono text-[var(--fg)]">{teamTime || "loading"}</span>
          {tz ? (
            <>
              {" "}
              and your timezone is <span className="font-mono text-[var(--fg)]">{tz}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`} required error={e.name}>
          <Input id={`${id}-name`} name="name" autoComplete="name" defaultValue={v.name} error={e.name} required />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} required error={e.email}>
          <Input id={`${id}-email`} name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} required />
        </Field>
        <Field label="Company" htmlFor={`${id}-company`} error={e.company}>
          <Input id={`${id}-company`} name="company" defaultValue={v.company} error={e.company} />
        </Field>
        <Field label="Phone or WhatsApp" htmlFor={`${id}-phone`} error={e.phone}>
          <Input id={`${id}-phone`} name="phone" type="tel" defaultValue={v.phone} error={e.phone} />
        </Field>
      </div>

      <Field label="What would you like to discuss?" htmlFor={`${id}-summary`} required error={e.summary}>
        <Textarea id={`${id}-summary`} name="summary" className="min-h-28" defaultValue={v.summary} error={e.summary} required />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">
          Preferred time windows <span className="text-xs font-normal text-[var(--fg-muted)]">(optional, in your timezone)</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {WINDOWS.map((w, i) => (
            <label key={w} htmlFor={`${id}-window-${i}`} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-xs transition-colors duration-500 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/10">
              <RadixCheckbox.Root id={`${id}-window-${i}`} name="preferredWindows" value={w} className="flex size-4 shrink-0 items-center justify-center rounded border border-[var(--line-strong)] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] data-[state=checked]:border-accent data-[state=checked]:bg-accent">
                <RadixCheckbox.Indicator className="text-ink">
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </RadixCheckbox.Indicator>
              </RadixCheckbox.Root>
              {w}
            </label>
          ))}
        </div>
      </fieldset>

      <Checkbox
        id={`${id}-consent`}
        name="consent"
        error={e.consent}
        label={
          <span>
            I agree that areniX may store this request and contact me to schedule. See the{" "}
            <a href="/privacy" className="underline underline-offset-4">
              privacy policy
            </a>
            .
          </span>
        }
      />

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
        <SubmitButton pending={pending} pendingLabel="Saving request" variant="accent">
          Request this consultation <ArrowIcon />
        </SubmitButton>
        <p className="text-xs text-[var(--fg-muted)]">Live calendar booking is not enabled yet, so this creates a request. We will never show you a fake available slot or a fake confirmation.</p>
      </div>
      </fieldset>
    </form>
  );
}
