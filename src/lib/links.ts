/**
 * URL and CTA helpers shared by server and client code. No secrets, no env access.
 */

/** Builds a WhatsApp click-to-chat URL. Returns null when no official number is configured. */
export function buildWhatsAppUrl(digits: string | undefined | null, message: string): string | null {
  const clean = (digits ?? "").replace(/\D/g, "");
  if (clean.length < 8 || clean.length > 15) return null;
  const text = encodeURIComponent(message.slice(0, 600));
  return `https://wa.me/${clean}?text=${text}`;
}

export function whatsappMessageFor(context?: { service?: string; project?: string; page?: string }) {
  if (context?.service) return `Hello areniX, I'd like to discuss ${context.service}.`;
  if (context?.project) return `Hello areniX, I saw the ${context.project} case study and I'd like to talk about a similar project.`;
  if (context?.page) return `Hello areniX, I'm on your ${context.page} page and would like to talk.`;
  return "Hello areniX, I'd like to discuss a project.";
}

/** True only for well-formed public https URLs. Used before rendering any external link. */
export function isSafeExternalUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return false;
    if (!u.hostname.includes(".")) return false;
    if (/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function startProjectHref(opts?: { service?: string; project?: string; solution?: string }) {
  const params = new URLSearchParams();
  if (opts?.service) params.set("service", opts.service);
  if (opts?.project) params.set("project", opts.project);
  if (opts?.solution) params.set("solution", opts.solution);
  const q = params.toString();
  return q ? `/start-project?${q}` : "/start-project";
}

export function bookConsultationHref(opts?: { type?: string; service?: string }) {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.service) params.set("service", opts.service);
  const q = params.toString();
  return q ? `/book-consultation?${q}` : "/book-consultation";
}
