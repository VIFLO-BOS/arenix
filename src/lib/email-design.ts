/**
 * Email design system. Pure functions with no secrets and no server only imports, so the app
 * (src/server/services/email.ts) and the template export script (scripts/export-email-templates.ts)
 * build every email from the same markup.
 *
 * Built for email clients, not browsers. Layout is tables, every style is inline, widths are
 * fixed at 600px with a mobile rule, and nothing depends on web fonts or background images.
 * Copy follows the site rules. No colons, semicolons, dashes or hyphenated words.
 */

export type EmailBrand = { siteUrl: string; legalName: string };

const NAVY = "#06132a";
const INK = "#0f172a";
const MUTED = "#5b6578";
const LINE = "#e3e8f0";
const ORANGE = "#fc8f2d";
const ORANGE_TEXT = "#c2410c"; // orange dark enough to read as small text on white
const PAGE = "#eef1f6";
const SANS = "'Montserrat','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BODY = "'Roboto','Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono','Courier New',monospace";

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/* --------------------------------------------------------------------------- pieces */

export function paragraph(html: string, opts: { muted?: boolean; size?: number; last?: boolean } = {}) {
  return `<p style="margin:0 0 ${opts.last ? 0 : 16}px;font-family:${BODY};font-size:${opts.size ?? 15}px;line-height:1.65;color:${opts.muted ? MUTED : INK}">${html}</p>`;
}

/** A button that survives Outlook: the clickable area is the padded link inside a table cell. */
export function button(href: string, label: string, tone: "primary" | "dark" = "primary") {
  const bg = tone === "primary" ? ORANGE : NAVY;
  const fg = tone === "primary" ? NAVY : "#ffffff";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td style="border-radius:999px;background:${bg}"><a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 28px;border-radius:999px;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:0.2px;color:${fg};text-decoration:none">${esc(label)}</a></td></tr></table>`;
}

/** The six digit code, large and easy to copy. Letter spacing is visual only, so it copies as digits. */
export function codeBlock(code: string, minutes: number | string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px"><tr><td align="center" style="background:#fff7ef;border:1px solid #fbd5b0;border-radius:14px;padding:22px 12px 20px">
    <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#9a3412">Your sign in code</p>
    <p class="code" style="margin:0;padding-left:12px;font-family:${MONO};font-size:38px;line-height:1.15;font-weight:700;letter-spacing:12px;color:${NAVY}">${esc(code)}</p>
    <p style="margin:10px 0 0;font-family:${BODY};font-size:13px;line-height:1.5;color:#9a3412">Expires in ${esc(String(minutes))} minutes and works once</p>
  </td></tr></table>`;
}

/** Label and value rows, for request details and summaries. */
export function details(rows: [label: string, value: string | null | undefined][]) {
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([label, value], i, all) =>
        `<tr><td style="padding:11px 14px 11px 0;${i < all.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}font-family:${BODY};font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:11px 0;${i < all.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}font-family:${BODY};font-size:14px;color:${INK};vertical-align:top">${esc(value ?? "")}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">${body}</table>`;
}

/** A tinted panel with an accent edge, for security advice or important notes. */
export function callout(title: string, html: string, tone: "warning" | "info" = "info") {
  const edge = tone === "warning" ? ORANGE : NAVY;
  const bg = tone === "warning" ? "#fff7ef" : "#f3f5f9";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 6px"><tr><td style="background:${bg};border-left:4px solid ${edge};border-radius:10px;padding:16px 18px">
    <p style="margin:0 0 6px;font-family:${SANS};font-size:14px;font-weight:700;color:${NAVY}">${esc(title)}</p>
    <div style="font-family:${BODY};font-size:14px;line-height:1.6;color:${INK}">${html}</div>
  </td></tr></table>`;
}

export function link(href: string, label: string) {
  return `<a href="${esc(href)}" target="_blank" style="color:${ORANGE_TEXT};font-weight:600;text-decoration:underline">${esc(label)}</a>`;
}

/* --------------------------------------------------------------------------- layout */

export function emailLayout(
  brand: EmailBrand,
  p: { preheader: string; eyebrow?: string; title: string; body: string; footerNote?: string; logoUrl?: string },
) {
  const site = brand.siteUrl.replace(/\/$/, "");
  const logo = p.logoUrl ?? `${site}/brand/email-logo.png`;
  // Hidden preview text, padded so clients do not pull body copy into the inbox preview.
  const pad = "&#847;&zwnj;&nbsp;".repeat(40);
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(p.title)}</title>
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; }
  @media (max-width:620px) {
    .px { padding-left:22px !important; padding-right:22px !important; }
    .code { font-size:30px !important; letter-spacing:8px !important; padding-left:8px !important; }
    .h1 { font-size:21px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all">${esc(p.preheader)}${pad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE}">
  <tr><td align="center" style="padding:32px 12px 40px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
      <tr><td class="px" style="background:${NAVY};border-radius:16px 16px 0 0;padding:26px 36px">
        <a href="${esc(site)}" target="_blank" style="text-decoration:none"><img src="${esc(logo)}" width="128" alt="areniX" style="display:block;width:128px;max-width:128px;height:auto;font-family:${SANS};font-size:22px;font-weight:700;color:#ffffff"></a>
      </td></tr>
      <tr><td style="background:${ORANGE};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
      <tr><td class="px" style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 36px 30px">
        ${p.eyebrow ? `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${ORANGE_TEXT}">${esc(p.eyebrow)}</p>` : ""}
        <h1 class="h1" style="margin:0 0 16px;font-family:${SANS};font-size:24px;line-height:1.3;font-weight:700;color:${NAVY}">${esc(p.title)}</h1>
        ${p.body}
      </td></tr>
      <tr><td class="px" align="center" style="padding:22px 36px 0">
        ${p.footerNote ? `<p style="margin:0 0 8px;font-family:${BODY};font-size:12px;line-height:1.6;color:${MUTED}">${esc(p.footerNote)}</p>` : ""}
        <p style="margin:0;font-family:${BODY};font-size:12px;line-height:1.6;color:${MUTED}">${esc(brand.legalName)} &middot; <a href="${esc(site)}" target="_blank" style="color:${MUTED};text-decoration:underline">${esc(hostOf(site))}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ security emails */

export type SignInContext = { name: string; when: string; device: string; resetUrl: string };

export function loginCodeEmail(brand: EmailBrand, p: SignInContext & { code: string; minutes: number | string }) {
  const first = p.name.split(" ")[0] || p.name;
  return {
    subject: "Your areniX sign in code",
    html: emailLayout(brand, {
      preheader: `Use this code to finish signing in. It expires in ${p.minutes} minutes.`,
      eyebrow: "Sign in verification",
      title: "Confirm it is you",
      body:
        paragraph(`Hello ${esc(first)}, your password was entered correctly. Enter the code below on the sign in page to finish signing in to the areniX dashboard.`) +
        codeBlock(p.code, p.minutes) +
        details([
          ["Requested", p.when],
          ["Device", p.device],
        ]) +
        callout(
          "Did not try to sign in?",
          `Someone may know your password. Do not share this code with anyone, then ${link(p.resetUrl, "reset your password")} straight away. The areniX team will never ask you for this code.`,
          "warning",
        ),
      footerNote: "You received this because someone signed in to your areniX dashboard account with your password.",
    }),
    text: `Your areniX sign in code is ${p.code}\n\nIt expires in ${p.minutes} minutes and works once.\nRequested ${p.when} from ${p.device}.\n\nDid not try to sign in? Someone may know your password. Reset it now at ${p.resetUrl}\nThe areniX team will never ask you for this code.`,
  };
}

export function newSignInEmail(brand: EmailBrand, p: SignInContext & { dashboardUrl: string }) {
  const first = p.name.split(" ")[0] || p.name;
  return {
    subject: "New sign in to your areniX dashboard",
    html: emailLayout(brand, {
      preheader: `Your account was signed in from ${p.device}.`,
      eyebrow: "Security alert",
      title: "New sign in to your account",
      body:
        paragraph(`Hello ${esc(first)}, your areniX dashboard account was just signed in with your password and a code sent to this address.`) +
        details([
          ["When", p.when],
          ["Device", p.device],
        ]) +
        paragraph("If this was you, there is nothing to do.", { muted: true }) +
        callout("Was this not you?", `Reset your password now, which signs everyone else out of your account.<br>${link(p.resetUrl, "Reset your password")}`, "warning"),
      footerNote: "We send this every time your account is signed in, so you always know about access.",
    }),
    text: `New sign in to your areniX dashboard\n\nWhen ${p.when}\nDevice ${p.device}\n\nIf this was you, there is nothing to do.\nWas this not you? Reset your password now at ${p.resetUrl}`,
  };
}

export function codeLockoutEmail(brand: EmailBrand, p: SignInContext) {
  const first = p.name.split(" ")[0] || p.name;
  return {
    subject: "Someone entered your areniX password",
    html: emailLayout(brand, {
      preheader: "Your password was entered correctly but the sign in code was not.",
      eyebrow: "Security alert",
      title: "We stopped a sign in attempt",
      body:
        paragraph(`Hello ${esc(first)}, someone entered your correct password but then entered the wrong sign in code too many times, so we blocked the attempt.`) +
        details([
          ["When", p.when],
          ["Device", p.device],
        ]) +
        callout("Change your password now", `If this was not you, your password is known to someone else. Choose a new one to keep your account safe.<br>${link(p.resetUrl, "Reset your password")}`, "warning"),
      footerNote: "This alert is sent whenever a sign in is blocked at the code step.",
    }),
    text: `We stopped a sign in attempt on your areniX account.\n\nSomeone entered your correct password but the wrong code too many times.\nWhen ${p.when}\nDevice ${p.device}\n\nIf this was not you, reset your password now at ${p.resetUrl}`,
  };
}

/* ------------------------------------------------------------------------ helpers */

/** "Thursday 5 November 2026 at 2.03pm, Lagos time". Written without a colon to match the copy rules. */
export function formatWhen(date: Date, timeZone = "Africa/Lagos") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  const period = String(parts.dayPeriod ?? "").toLowerCase().replace(/\s|\./g, "");
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year} at ${parts.hour}.${parts.minute}${period}, Lagos time`;
}

/** A readable device name from a user agent, such as "Chrome on Windows". */
export function describeDevice(userAgent: string | null | undefined) {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "A browser";
  const os = /iPhone|iPad/.test(ua) ? "iPhone or iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "an unknown device";
  return `${browser} on ${os}`;
}
