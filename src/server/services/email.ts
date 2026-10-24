import "server-only";
import { Resend } from "resend";
import { connectDb } from "@/server/db/connect";
import { EmailDispatch, type EmailDispatchDoc } from "@/server/db/models/system";
import { env, integrations } from "@/lib/env";
import { siteConfig } from "@/config/site";

/**
 * Outbox-style email dispatch. Every email is first persisted (PENDING) and then an
 * attempt is made. If Resend is not configured, the dispatch is stored as DEMO_LOGGED and
 * printed to the server log — never reported as "sent".
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
/* Templates — plain, brand-consistent, no external assets                   */
/* ------------------------------------------------------------------------ */

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif;color:#141821">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-bottom:24px">areni<span style="color:#c98f1e">X</span></div>
    <div style="background:#ffffff;border:1px solid #e3e1d9;border-radius:14px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#5f6977;margin-top:20px">${esc(siteConfig.legalName)} · <a href="${siteConfig.url}" style="color:#5f6977">${esc(siteConfig.url)}</a></p>
  </div></body></html>`;
}

function row(label: string, value?: string | null) {
  if (!value) return "";
  return `<tr><td style="padding:6px 10px 6px 0;color:#5f6977;font-size:13px;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:6px 0;font-size:14px">${esc(value)}</td></tr>`;
}

export const emailTemplates = {
  inquiryAcknowledgement(p: { name: string; reference: string; type: "CONTACT" | "PROJECT" }) {
    const what = p.type === "PROJECT" ? "project request" : "message";
    return {
      subject: `We received your ${what} — ${p.reference}`,
      html: layout(
        `Thanks, ${p.name}.`,
        `<p style="font-size:15px;line-height:1.6">Your ${what} has been saved with reference <strong>${esc(p.reference)}</strong>. A member of the areniX team will review it and reply using the contact method you chose.</p>
         <p style="font-size:15px;line-height:1.6">If you would like to talk sooner, you can request a consultation at <a href="${siteConfig.url}/book-consultation">${siteConfig.url}/book-consultation</a>.</p>`,
      ),
      text: `Thanks ${p.name}. Your ${what} was saved with reference ${p.reference}. We will reply using your preferred contact method.`,
    };
  },
  inquiryStaffAlert(p: { reference: string; type: string; name: string; email: string; company?: string; service?: string; message: string; adminUrl: string }) {
    return {
      subject: `New ${p.type === "PROJECT" ? "project request" : "inquiry"} ${p.reference} from ${p.name}`,
      html: layout(
        `New ${p.type === "PROJECT" ? "project request" : "inquiry"}`,
        `<table style="border-collapse:collapse">${row("Reference", p.reference)}${row("Name", p.name)}${row("Email", p.email)}${row("Company", p.company)}${row("Service", p.service)}</table>
         <p style="font-size:14px;line-height:1.6;white-space:pre-wrap;background:#f5f4f0;padding:12px;border-radius:8px">${esc(p.message)}</p>
         <p><a href="${p.adminUrl}" style="display:inline-block;background:#141821;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open in dashboard</a></p>`,
      ),
      text: `New ${p.type} ${p.reference} from ${p.name} <${p.email}>: ${p.message}\n${p.adminUrl}`,
    };
  },
  bookingRequested(p: { name: string; reference: string; consultationType: string }) {
    return {
      subject: `Consultation request received — ${p.reference}`,
      html: layout(
        `We have your consultation request, ${p.name}.`,
        `<p style="font-size:15px;line-height:1.6">Reference <strong>${esc(p.reference)}</strong> · ${esc(p.consultationType)}.</p>
         <p style="font-size:15px;line-height:1.6">This is a <strong>request</strong>, not a confirmed appointment yet. The team will propose a time by email and the booking will be confirmed once you accept it.</p>`,
      ),
      text: `Consultation request ${p.reference} (${p.consultationType}) received. This is a request, not a confirmed appointment yet; we will propose a time by email.`,
    };
  },
  bookingConfirmed(p: { name: string; reference: string; consultationType: string; when: string; meetingUrl?: string; rescheduleUrl?: string; cancelUrl?: string }) {
    return {
      subject: `Consultation confirmed — ${p.reference}`,
      html: layout(
        `Your consultation is confirmed, ${p.name}.`,
        `<table style="border-collapse:collapse">${row("Reference", p.reference)}${row("Type", p.consultationType)}${row("When", p.when)}${row("Meeting link", p.meetingUrl)}</table>
         ${p.rescheduleUrl ? `<p><a href="${p.rescheduleUrl}">Reschedule</a>${p.cancelUrl ? ` · <a href="${p.cancelUrl}">Cancel</a>` : ""}</p>` : ""}`,
      ),
      text: `Consultation ${p.reference} confirmed: ${p.consultationType}, ${p.when}. ${p.meetingUrl ?? ""}`,
    };
  },
  bookingStaffAlert(p: { reference: string; name: string; email: string; consultationType: string; status: string; adminUrl: string }) {
    return {
      subject: `Booking ${p.status.toLowerCase()} — ${p.reference} (${p.name})`,
      html: layout(
        `Booking ${p.status.toLowerCase()}`,
        `<table style="border-collapse:collapse">${row("Reference", p.reference)}${row("Name", p.name)}${row("Email", p.email)}${row("Type", p.consultationType)}${row("Status", p.status)}</table>
         <p><a href="${p.adminUrl}" style="display:inline-block;background:#141821;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open in dashboard</a></p>`,
      ),
      text: `Booking ${p.reference} ${p.status} — ${p.name} <${p.email}> (${p.consultationType}). ${p.adminUrl}`,
    };
  },
  invitation(p: { name: string; inviterName: string; role: string; acceptUrl: string; expiresHours: number }) {
    return {
      subject: `You have been invited to the areniX dashboard`,
      html: layout(
        `Hello ${p.name}`,
        `<p style="font-size:15px;line-height:1.6">${esc(p.inviterName)} invited you to join the areniX business dashboard as <strong>${esc(p.role)}</strong>.</p>
         <p><a href="${p.acceptUrl}" style="display:inline-block;background:#141821;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Accept invitation</a></p>
         <p style="font-size:13px;color:#5f6977">This link expires in ${p.expiresHours} hours and can be used once.</p>`,
      ),
      text: `${p.inviterName} invited you to the areniX dashboard as ${p.role}. Accept: ${p.acceptUrl} (expires in ${p.expiresHours}h)`,
    };
  },
  passwordReset(p: { name: string; resetUrl: string }) {
    return {
      subject: `Reset your areniX dashboard password`,
      html: layout(
        `Password reset`,
        `<p style="font-size:15px;line-height:1.6">Hello ${esc(p.name)}, a password reset was requested for your account. If this was not you, ignore this email.</p>
         <p><a href="${p.resetUrl}" style="display:inline-block;background:#141821;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Choose a new password</a></p>
         <p style="font-size:13px;color:#5f6977">This link expires in 1 hour.</p>`,
      ),
      text: `Reset your areniX password: ${p.resetUrl} (expires in 1 hour)`,
    };
  },
  proposalSent(p: { clientName: string; title: string; reference: string; version: number; summary?: string; validUntil?: string }) {
    return {
      subject: `Proposal ${p.reference} — ${p.title}`,
      html: layout(
        `Proposal: ${p.title}`,
        `<p style="font-size:15px;line-height:1.6">Hello ${esc(p.clientName)}, please find the details of proposal <strong>${esc(p.reference)}</strong> (version ${p.version}).</p>
         ${p.summary ? `<p style="font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(p.summary)}</p>` : ""}
         ${p.validUntil ? `<p style="font-size:13px;color:#5f6977">Valid until ${esc(p.validUntil)}.</p>` : ""}
         <p style="font-size:15px;line-height:1.6">Reply to this email to accept, decline or ask questions.</p>`,
      ),
      text: `Proposal ${p.reference} v${p.version}: ${p.title}. ${p.summary ?? ""}`,
    };
  },
  followUpDue(p: { assigneeName: string; leadTitle: string; adminUrl: string }) {
    return {
      subject: `Follow-up due: ${p.leadTitle}`,
      html: layout(`Follow-up due`, `<p style="font-size:15px">${esc(p.assigneeName)}, a follow-up is due for <strong>${esc(p.leadTitle)}</strong>.</p><p><a href="${p.adminUrl}">Open lead</a></p>`),
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
