import "server-only";
import { Resend } from "resend";
import { connectDb } from "@/server/db/connect";
import { EmailDispatch, type EmailDispatchDoc } from "@/server/db/models/system";
import { env, integrations } from "@/lib/env";
import { siteConfig } from "@/config/site";
import { button, details, emailLayout, esc, paragraph, type EmailBrand } from "@/lib/email-design";

export const emailBrand: EmailBrand = { siteUrl: siteConfig.url, legalName: siteConfig.legalName };

/**
 * Outbox-style email dispatch. Every email is first persisted (PENDING) and then an
 * attempt is made. If Resend is not configured, the dispatch is stored as DEMO_LOGGED and
 * printed to the server log, never reported as "sent".
 */

type EmailInput = {
  to: string | string[];
  subject: string;
  template: string;
  html: string;
  text?: string;
  entityType?: string;
  entityId?: string;
};

const MAX_ATTEMPTS = 4;

export async function enqueueEmail(input: EmailInput): Promise<{ id: string; status: EmailDispatchDoc["status"] }> {
  await connectDb();
  const to = Array.isArray(input.to) ? input.to : [input.to];
  const cleaned = to.map((t) => t.trim()).filter(Boolean);
  const doc = await EmailDispatch.create({
    to: cleaned,
    subject: input.subject,
    template: input.template,
    html: input.html,
    text: input.text,
    status: "PENDING",
    provider: integrations.email.mode,
    entityType: input.entityType,
    entityId: input.entityId,
  });
  await attemptSend(doc._id.toString());
  const fresh = await EmailDispatch.findById(doc._id).lean();
  return { id: doc._id.toString(), status: fresh?.status ?? "PENDING" };
}

export async function attemptSend(id: string) {
  await connectDb();
  const doc = await EmailDispatch.findById(id);
  if (!doc || doc.status === "SENT" || doc.status === "DEMO_LOGGED") return;
  if (doc.to.length === 0) {
    doc.status = "FAILED";
    doc.lastError = "No recipient configured";
    await doc.save();
    return;
  }

  doc.attempts += 1;

  if (!integrations.email.configured) {
    doc.status = "DEMO_LOGGED";
    doc.provider = "demo-log";
    doc.sentAt = new Date();
    await doc.save();
    console.info(`[email:demo] (not sent) to=${doc.to.join(",")} subject="${doc.subject}" template=${doc.template}`);
    return;
  }

  try {
    const resend = new Resend(env.resendApiKey);
    const res = await resend.emails.send({
      from: env.emailFrom,
      to: doc.to,
      subject: doc.subject,
      html: doc.html,
      text: doc.text ?? undefined,
    });
    if (res.error) throw new Error(res.error.message);
    doc.status = "SENT";
    doc.provider = "resend";
    doc.providerMessageId = res.data?.id;
    doc.sentAt = new Date();
    doc.lastError = undefined;
  } catch (err) {
    doc.lastError = err instanceof Error ? err.message : String(err);
    if (doc.attempts >= MAX_ATTEMPTS) {
      doc.status = "FAILED";
    } else {
      doc.status = "PENDING";
      doc.nextAttemptAt = new Date(Date.now() + Math.min(60, 2 ** doc.attempts) * 60 * 1000);
    }
  }
  await doc.save();
}

/**
 * For emails that carry a secret, such as a sign in code. It is sent once, straight away, and
 * never retried because the secret expires quickly. The copy kept in the email log is the
 * redacted version, so nobody reading the log can see a live code.
 */
export async function sendSensitiveEmail(input: EmailInput & { storedHtml: string; storedText?: string }): Promise<{ ok: boolean; status: EmailDispatchDoc["status"] }> {
  await connectDb();
  const to = (Array.isArray(input.to) ? input.to : [input.to]).map((t) => t.trim()).filter(Boolean);
  const doc = await EmailDispatch.create({
    to,
    subject: input.subject,
    template: input.template,
    html: input.storedHtml,
    text: input.storedText,
    status: "PENDING",
    provider: integrations.email.mode,
    entityType: input.entityType,
    entityId: input.entityId,
    attempts: 1,
  });

  if (!integrations.email.configured) {
    doc.status = "DEMO_LOGGED";
    doc.provider = "demo-log";
    doc.sentAt = new Date();
    await doc.save();
    return { ok: true, status: doc.status };
  }

  try {
    const res = await new Resend(env.resendApiKey).emails.send({ from: env.emailFrom, to, subject: input.subject, html: input.html, text: input.text });
    if (res.error) throw new Error(res.error.message);
    doc.status = "SENT";
    doc.provider = "resend";
    doc.providerMessageId = res.data?.id;
    doc.sentAt = new Date();
  } catch (err) {
    doc.status = "FAILED";
    doc.lastError = err instanceof Error ? err.message : String(err);
    console.error("[email] sensitive send failed", doc.lastError);
  }
  await doc.save();
  return { ok: doc.status === "SENT", status: doc.status };
}

/** Retry anything PENDING whose backoff has elapsed. Called from the admin "retry" action. */
export async function retryPendingEmails(limit = 20) {
  await connectDb();
  const due = await EmailDispatch.find({ status: "PENDING", $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: new Date() } }] })
    .limit(limit)
    .select("_id")
    .lean();
  for (const d of due) await attemptSend(d._id.toString());
  return due.length;
}

/* ------------------------------------------------------------------------ */
/* Templates. All share the design in src/lib/email-design.ts               */
/* ------------------------------------------------------------------------ */

/** Wraps a template body in the shared branded layout. The title also serves as preview text. */
function layout(title: string, bodyHtml: string, eyebrow?: string) {
  return emailLayout(emailBrand, { preheader: title, eyebrow, title, body: bodyHtml });
}

/** One summary table, built from label and value pairs. Empty values are skipped. */
function rows(...pairs: [string, string | null | undefined][]) {
  return details(pairs);
}

export const emailTemplates = {
  inquiryAcknowledgement(p: { name: string; reference: string; type: "CONTACT" | "PROJECT" }) {
    const what = p.type === "PROJECT" ? "project request" : "message";
    return {
      subject: `We received your ${what}, reference ${p.reference}`,
      html: layout(
        `Thanks, ${p.name}.`,
        paragraph(`Your ${what} has been saved with reference <strong>${esc(p.reference)}</strong>. A member of the areniX team will review it and reply using the contact method you chose.`) +
          paragraph("If you would like to talk sooner, you can request a consultation.") +
          button(`${siteConfig.url}/book-consultation`, "Request a consultation"),
        "Message received",
      ),
      text: `Thanks ${p.name}. Your ${what} was saved with reference ${p.reference}. We will reply using your preferred contact method.`,
    };
  },
  inquiryStaffAlert(p: { reference: string; type: string; name: string; email: string; company?: string; service?: string; message: string; adminUrl: string }) {
    return {
      subject: `New ${p.type === "PROJECT" ? "project request" : "inquiry"} ${p.reference} from ${p.name}`,
      html: layout(
        `New ${p.type === "PROJECT" ? "project request" : "inquiry"}`,
        rows(["Reference", p.reference], ["Name", p.name], ["Email", p.email], ["Company", p.company], ["Service", p.service]) +
          `<p style="margin:0 0 18px;font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;white-space:pre-wrap;background:#f3f5f9;padding:14px 16px;border-radius:10px;color:#0f172a">${esc(p.message)}</p>` +
          button(p.adminUrl, "Open in dashboard", "dark"),
        "New enquiry",
      ),
      text: `New ${p.type} ${p.reference} from ${p.name} <${p.email}>: ${p.message}\n${p.adminUrl}`,
    };
  },
  bookingRequested(p: { name: string; reference: string; consultationType: string }) {
    return {
      subject: `Consultation request received, reference ${p.reference}`,
      html: layout(
        `We have your consultation request, ${p.name}.`,
        rows(["Reference", p.reference], ["Consultation", p.consultationType]) +
          paragraph("This is a <strong>request</strong>, not a confirmed appointment yet. The team will propose a time by email and the booking will be confirmed once you accept it.", { last: true }),
        "Consultation request",
      ),
      text: `Consultation request ${p.reference} (${p.consultationType}) received. This is a request, not a confirmed appointment yet; we will propose a time by email.`,
    };
  },
  bookingConfirmed(p: { name: string; reference: string; consultationType: string; when: string; meetingUrl?: string; rescheduleUrl?: string; cancelUrl?: string }) {
    return {
      subject: `Consultation confirmed, reference ${p.reference}`,
      html: layout(
        `Your consultation is confirmed, ${p.name}.`,
        rows(["Reference", p.reference], ["Consultation", p.consultationType], ["When", p.when]) +
          (p.meetingUrl ? button(p.meetingUrl, "Join the meeting") : "") +
          (p.rescheduleUrl
            ? paragraph(`Need another time? <a href="${esc(p.rescheduleUrl)}" style="color:#c2410c">Reschedule</a>${p.cancelUrl ? ` or <a href="${esc(p.cancelUrl)}" style="color:#c2410c">cancel</a>` : ""}.`, { muted: true, size: 14, last: true })
            : ""),
        "Consultation confirmed",
      ),
      text: `Consultation ${p.reference} confirmed: ${p.consultationType}, ${p.when}. ${p.meetingUrl ?? ""}`,
    };
  },
  bookingStaffAlert(p: { reference: string; name: string; email: string; consultationType: string; status: string; adminUrl: string }) {
    return {
      subject: `Booking ${p.status.toLowerCase()}, ${p.reference} (${p.name})`,
      html: layout(
        `Booking ${p.status.toLowerCase()}`,
        rows(["Reference", p.reference], ["Name", p.name], ["Email", p.email], ["Consultation", p.consultationType], ["Status", p.status]) + button(p.adminUrl, "Open in dashboard", "dark"),
        "Booking update",
      ),
      text: `Booking ${p.reference} ${p.status}. ${p.name} <${p.email}> (${p.consultationType}). ${p.adminUrl}`,
    };
  },
  invitation(p: { name: string; inviterName: string; role: string; acceptUrl: string; expiresHours: number }) {
    return {
      subject: `You have been invited to the areniX dashboard`,
      html: layout(
        `Hello ${p.name}`,
        paragraph(`${esc(p.inviterName)} invited you to join the areniX business dashboard as <strong>${esc(p.role)}</strong>.`) +
          button(p.acceptUrl, "Accept invitation") +
          paragraph(`This link expires in ${p.expiresHours} hours and can be used once.`, { muted: true, size: 13, last: true }),
        "Team invitation",
      ),
      text: `${p.inviterName} invited you to the areniX dashboard as ${p.role}. Accept: ${p.acceptUrl} (expires in ${p.expiresHours}h)`,
    };
  },
  passwordReset(p: { name: string; resetUrl: string }) {
    return {
      subject: `Reset your areniX dashboard password`,
      html: layout(
        `Reset your password`,
        paragraph(`Hello ${esc(p.name)}, a password reset was requested for your areniX dashboard account. If this was not you, you can ignore this email and your password stays the same.`) +
          button(p.resetUrl, "Choose a new password") +
          paragraph("This link expires in 1 hour and can be used once.", { muted: true, size: 13, last: true }),
        "Account security",
      ),
      text: `Reset your areniX password: ${p.resetUrl} (expires in 1 hour)`,
    };
  },
  proposalSent(p: { clientName: string; title: string; reference: string; version: number; summary?: string; validUntil?: string }) {
    return {
      subject: `Proposal ${p.reference}, ${p.title}`,
      html: layout(
        p.title,
        paragraph(`Hello ${esc(p.clientName)}, please find the details of proposal <strong>${esc(p.reference)}</strong> (version ${p.version}).`) +
          (p.summary ? `<p style="margin:0 0 16px;font-family:'Roboto','Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;white-space:pre-wrap;color:#0f172a">${esc(p.summary)}</p>` : "") +
          (p.validUntil ? paragraph(`Valid until ${esc(p.validUntil)}.`, { muted: true, size: 13 }) : "") +
          paragraph("Reply to this email to accept, decline or ask questions.", { last: true }),
        "Proposal",
      ),
      text: `Proposal ${p.reference} v${p.version}: ${p.title}. ${p.summary ?? ""}`,
    };
  },
  followUpDue(p: { assigneeName: string; leadTitle: string; adminUrl: string }) {
    return {
      subject: `Follow up due for ${p.leadTitle}`,
      html: layout(`Follow up due`, paragraph(`${esc(p.assigneeName)}, a follow up is due for <strong>${esc(p.leadTitle)}</strong>.`) + button(p.adminUrl, "Open lead", "dark"), "Reminder"),
      text: `Follow-up due for ${p.leadTitle}: ${p.adminUrl}`,
    };
  },
};

export function staffRecipients(extra: string[] = []) {
  const set = new Set<string>();
  if (env.adminNotificationEmail) set.add(env.adminNotificationEmail);
  for (const e of extra) if (e) set.add(e);
  return [...set];
}
