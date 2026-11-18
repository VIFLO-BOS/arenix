import { env } from "@/lib/env";

/**
 * security.txt (RFC 9116) tells security researchers how to report a vulnerability. The
 * contact is the Contact page until a dedicated security email address exists.
 */
export function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: ${env.siteUrl}/contact`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${env.siteUrl}/.well-known/security.txt`,
    `Policy: ${env.siteUrl}/privacy`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
