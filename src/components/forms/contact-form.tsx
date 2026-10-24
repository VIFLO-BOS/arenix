"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitContact } from "@/app/(site)/contact/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { Checkbox, Field, FormMessage, Honeypot, Input, Select, SubmitButton, Textarea } from "@/components/ui/fields";
import { Button, ArrowIcon } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/layout/whatsapp-button";
import { Reveal } from "@/components/motion/reveal";
import { useIdempotencyKey } from "./use-idempotency-key";
import { useManualAction } from "./use-manual-action";

const CONTACT_OPTIONS = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone call" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

export function ContactForm({ defaultSubject = "", whatsappDigits }: { defaultSubject?: string; whatsappDigits: string }) {
  const [state, action, pending] = useActionState(submitContact, initialFormState);
  const onSubmit = useManualAction(action);
  const pathname = usePathname();
  const id = useId();
  const keyRef = useIdempotencyKey();
  const successRef = useRef<HTMLDivElement>(null);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  // Remount the form on every server response so fields show the returned values in the same
  // commit (avoids React's asynchronous post action form reset racing with user input).
  const [seen, setSeen] = useState(state);
  const [serial, setSerial] = useState(0);
  if (seen !== state) {
    setSeen(state);
    setSerial((s) => s + 1);
  }

  useEffect(() => {
    if (state.ok) successRef.current?.focus();
  }, [state.ok]);

  if (state.ok) {
    return (
      <div ref={successRef} tabIndex={-1} className="rounded-2xl border border-success/40 bg-success/10 p-6 outline-none sm:p-8" role="status" aria-live="polite">
        <p className="text-micro text-success">Saved</p>
        <h3 className="mt-3 font-display text-xl font-semibold">Thanks, we have your message.</h3>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Your reference is <span className="font-mono text-[var(--fg)]">{state.reference}</span>. A confirmation email has been queued and the team will reply using your preferred channel.
        </p>
        <div className="mt-6 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
          <Button href="/book-consultation" variant="accent">
            Book a consultation <ArrowIcon />
          </Button>
          <WhatsAppLink digits={whatsappDigits} message={`Hello areniX, I just sent message ${state.reference ?? ""}.`} variant="secondary" context="contact-success" />
        </div>
      </div>
    );
  }

  return (
    <form key={serial} action={action} onSubmit={onSubmit} className="relative flex flex-col gap-5" noValidate>
      <fieldset disabled={pending} className="contents">
      <Honeypot />
      <input type="hidden" name="sourcePath" value={pathname} />
      <input ref={keyRef} type="hidden" name="idempotencyKey" defaultValue="" />
      {state.message && !state.ok && <FormMessage tone="error">{state.message}</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`} required error={e.name}>
          <Input id={`${id}-name`} name="name" autoComplete="name" required defaultValue={v.name} error={e.name} />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} required error={e.email}>
          <Input id={`${id}-email`} name="email" type="email" autoComplete="email" required defaultValue={v.email} error={e.email} />
        </Field>
      </div>
      <Field label="Subject" htmlFor={`${id}-subject`} required error={e.subject}>
        <Input id={`${id}-subject`} name="subject" required defaultValue={v.subject ?? defaultSubject} error={e.subject} />
      </Field>
      <Field label="Message" htmlFor={`${id}-message`} required error={e.message} hint="At least 20 characters.">
        <Textarea id={`${id}-message`} name="message" required defaultValue={v.message} error={e.message} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone or WhatsApp" htmlFor={`${id}-phone`} error={e.phone}>
          <Input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={e.phone} />
        </Field>
        <Field label="Preferred reply method" htmlFor={`${id}-pref`} required>
          <Select id={`${id}-pref`} name="preferredContact" defaultValue={v.preferredContact ?? "EMAIL"} options={CONTACT_OPTIONS} />
        </Field>
      </div>
      <Checkbox
        id={`${id}-consent`}
        name="consent"
        error={e.consent}
        label={
          <span>
            I agree that areniX may store this message and contact me about it. See the{" "}
            <a href="/privacy" className="underline underline-offset-4">
              privacy policy
            </a>
            .
          </span>
        }
      />
      <Reveal>
        <SubmitButton pending={pending} pendingLabel="Saving">
          Send message <ArrowIcon />
        </SubmitButton>
      </Reveal>
      </fieldset>
    </form>
  );
}
