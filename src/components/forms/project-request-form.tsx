"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitProjectRequest } from "@/app/(site)/start-project/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { BUDGET_RANGES, MAX_UPLOAD_FILES, TIMELINES } from "@/lib/validation/forms";
import { Checkbox, Field, FormMessage, Honeypot, Input, Select, SubmitButton, Textarea } from "@/components/ui/fields";
import { Button, ArrowIcon } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/layout/whatsapp-button";
import { bookConsultationHref } from "@/lib/links";
import { cn } from "@/lib/utils";
import { useIdempotencyKey } from "./use-idempotency-key";
import { useManualAction } from "./use-manual-action";

type Defaults = { service?: string; project?: string; solution?: string };

/**
 * Three step wizard with preserved progress (all steps stay mounted, hidden steps are not
 * removed from the DOM so values persist and server validation can target any field).
 */
export function ProjectRequestForm({ services, defaults, whatsappDigits }: { services: string[]; defaults: Defaults; whatsappDigits: string }) {
  const [state, action, pending] = useActionState(submitProjectRequest, initialFormState);
  const onSubmit = useManualAction(action);
  const pathname = usePathname();
  const id = useId();
  const keyRef = useIdempotencyKey();
  const [step, setStep] = useState(0);
  const successRef = useRef<HTMLDivElement>(null);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  const stepFields: string[][] = [
    ["serviceCategory", "goal", "message", "features"],
    ["name", "email", "company", "phone"],
    ["budgetRange", "timeline", "attachments", "preferredContact", "consent"],
  ];

  // When the server returns field errors, jump to the first step that has one and remount the
  // form so returned values render in the same commit.
  const [handled, setHandled] = useState(state);
  const [serial, setSerial] = useState(0);
  if (handled !== state) {
    setHandled(state);
    setSerial((s) => s + 1);
    if (!state.ok && state.errors) {
      const firstErrStep = stepFields.findIndex((fields) => fields.some((f) => state.errors?.[f]));
      if (firstErrStep >= 0) setStep(firstErrStep);
    }
  }

  useEffect(() => {
    if (state.ok) successRef.current?.focus();
  }, [state.ok]);

  if (state.ok) {
    return (
      <div ref={successRef} tabIndex={-1} className="rounded-2xl border border-success/40 bg-success/10 p-6 outline-none sm:p-8" role="status" aria-live="polite">
        <p className="text-micro text-success">Request saved</p>
        <h3 className="mt-3 font-display text-xl font-semibold">Thank you. Your project request is in.</h3>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Reference <span className="font-mono text-[var(--fg)]">{state.reference}</span>. A confirmation email has been queued and the team has been notified. We review every request and reply with questions or a proposed next step.
        </p>
        <div className="mt-6 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
          <Button href={bookConsultationHref({ service: defaults.service })} variant="accent">
            Book a consultation now <ArrowIcon />
          </Button>
          <WhatsAppLink digits={whatsappDigits} message={`Hello areniX, I just submitted project request ${state.reference ?? ""}.`} variant="secondary" context="project-success" />
        </div>
      </div>
    );
  }

  const steps = ["Project", "About you", "Details"];

  return (
    <form key={serial} action={action} onSubmit={onSubmit} className="relative flex flex-col gap-6" noValidate>
      <fieldset disabled={pending} className="contents">
      <Honeypot />
      <input type="hidden" name="sourcePath" value={pathname} />
      <input ref={keyRef} type="hidden" name="idempotencyKey" defaultValue="" />
      <input type="hidden" name="solutionContext" value={v.solutionContext ?? defaults.solution ?? ""} />
      <input type="hidden" name="projectContext" value={v.projectContext ?? defaults.project ?? ""} />

      <ol className="grid grid-cols-3 gap-2" aria-label="Form progress">
        {steps.map((label, i) => (
          <li key={label}>
            <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={cn("flex w-full flex-col gap-1 border-t-2 pt-2 text-left text-xs transition-colors duration-500", i === step ? "border-accent text-[var(--fg)]" : i < step ? "border-[var(--fg)] text-[var(--fg-muted)]" : "border-[var(--line)] text-[var(--fg-muted)]")}>
              <span className="font-mono">0{i + 1}</span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {state.message && !state.ok && <FormMessage tone="error">{state.message}</FormMessage>}

      <fieldset className={cn("flex flex-col gap-5", step !== 0 && "hidden")} aria-hidden={step !== 0}>
        <legend className="sr-only">Project</legend>
        <Field label="Service category" htmlFor={`${id}-service`} required error={e.serviceCategory} hint={defaults.service ? `Pre selected from the ${defaults.service} page.` : undefined}>
          <Select id={`${id}-service`} name="serviceCategory" defaultValue={v.serviceCategory ?? defaults.service ?? ""} error={e.serviceCategory} required placeholder="Choose the closest fit" options={[...services.map((s) => ({ value: s, label: s })), { value: "Not sure yet", label: "Not sure yet" }]} />
        </Field>
        {(defaults.project || defaults.solution) && (
          <p className="rounded-xl bg-[var(--line)] px-4 py-3 text-sm text-[var(--fg-muted)]">
            Context {defaults.project ? `similar to the ${defaults.project} case study` : ""}
            {defaults.project && defaults.solution ? " and " : ""}
            {defaults.solution ? `the ${defaults.solution} sector` : ""}
          </p>
        )}
        <Field label="Business goal" htmlFor={`${id}-goal`} required error={e.goal} hint="One or two sentences. What should be different when this is done?">
          <Textarea id={`${id}-goal`} name="goal" className="min-h-24" defaultValue={v.goal} error={e.goal} required />
        </Field>
        <Field label="Project description" htmlFor={`${id}-message`} required error={e.message} hint="Who uses it, what it must do, what exists today.">
          <Textarea id={`${id}-message`} name="message" defaultValue={v.message} error={e.message} required />
        </Field>
        <Field label="Features or deliverables" htmlFor={`${id}-features`} error={e.features}>
          <Textarea id={`${id}-features`} name="features" className="min-h-24" defaultValue={v.features} error={e.features} />
        </Field>
      </fieldset>

      <fieldset className={cn("flex flex-col gap-5", step !== 1 && "hidden")} aria-hidden={step !== 1}>
        <legend className="sr-only">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor={`${id}-name`} required error={e.name}>
            <Input id={`${id}-name`} name="name" autoComplete="name" defaultValue={v.name} error={e.name} required />
          </Field>
          <Field label="Email" htmlFor={`${id}-email`} required error={e.email}>
            <Input id={`${id}-email`} name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} required />
          </Field>
          <Field label="Company" htmlFor={`${id}-company`} error={e.company}>
            <Input id={`${id}-company`} name="company" autoComplete="organization" defaultValue={v.company} error={e.company} />
          </Field>
          <Field label="Phone or WhatsApp" htmlFor={`${id}-phone`} error={e.phone}>
            <Input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={e.phone} />
          </Field>
        </div>
      </fieldset>

      <fieldset className={cn("flex flex-col gap-5", step !== 2 && "hidden")} aria-hidden={step !== 2}>
        <legend className="sr-only">Details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Budget range" htmlFor={`${id}-budget`} error={e.budgetRange} hint="Optional. It helps us propose the right scope.">
            <Select id={`${id}-budget`} name="budgetRange" defaultValue={v.budgetRange ?? ""} error={e.budgetRange} placeholder="Skip" options={BUDGET_RANGES.map((b) => ({ value: b, label: b }))} />
          </Field>
          <Field label="Desired timeline" htmlFor={`${id}-timeline`} error={e.timeline}>
            <Select id={`${id}-timeline`} name="timeline" defaultValue={v.timeline ?? ""} error={e.timeline} placeholder="Skip" options={TIMELINES.map((t) => ({ value: t, label: t }))} />
          </Field>
        </div>
        <Field label="Supporting documents" htmlFor={`${id}-files`} error={e.attachments} hint={`Up to ${MAX_UPLOAD_FILES} files, 8 MB each. PDF, images, Word or text.`}>
          <input id={`${id}-files`} name="attachments" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx" className="block w-full text-sm file:mr-3 file:rounded-full file:border file:border-[var(--line-strong)] file:bg-transparent file:px-4 file:py-2 file:text-sm file:text-[var(--fg)]" aria-invalid={e.attachments ? true : undefined} />
        </Field>
        <Field label="Preferred reply method" htmlFor={`${id}-pref`} required>
          <Select id={`${id}-pref`} name="preferredContact" defaultValue={v.preferredContact ?? "EMAIL"} options={[{ value: "EMAIL", label: "Email" }, { value: "PHONE", label: "Phone call" }, { value: "WHATSAPP", label: "WhatsApp" }]} />
        </Field>
        <Checkbox
          id={`${id}-consent`}
          name="consent"
          error={e.consent}
          label={
            <span>
              I agree that areniX may store this request and contact me about it. See the{" "}
              <a href="/privacy" className="underline underline-offset-4">
                privacy policy
              </a>
              .
            </span>
          }
        />
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 xs:flex-row xs:items-center xs:justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < 2 ? (
          <Button type="button" variant="primary" size="lg" onClick={() => setStep((s) => Math.min(2, s + 1))}>
            Continue <ArrowIcon />
          </Button>
        ) : (
          <SubmitButton pending={pending} pendingLabel="Saving request" variant="accent">
            Submit request <ArrowIcon />
          </SubmitButton>
        )}
      </div>
      </fieldset>
    </form>
  );
}
