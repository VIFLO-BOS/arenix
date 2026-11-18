import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every admin request.
 *   1. Bounces obviously signed out visitors to the sign in page. This is a convenience only.
 *      Real authentication and authorisation happen on the server in the admin layout, pages
 *      and every server action, so never rely on this file alone.
 *   2. Sets a strict Content Security Policy with a fresh random nonce for every request.
 *      Only scripts that carry the nonce (Next.js adds it to its own) may run, so a script
 *      injected into an admin page would not execute.
 *   3. Stops browsers and proxies keeping copies of admin pages.
 */
const PUBLIC_ADMIN = ["/admin/login", "/admin/invite", "/admin/forgot-password", "/admin/reset-password"];
// Production uses the __Host- prefixed name (see src/server/auth/session.ts). Both are accepted here.
const SESSION_COOKIES = ["__Host-arenix_session", "arenix_session"];

function adminCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React writes style attributes, which a nonce cannot cover. Styles cannot run code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const isPublic = PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = SESSION_COOKIES.some((c) => request.cookies.has(c));
  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Attachment downloads set their own stricter sandbox policy in the route.
  if (pathname.startsWith("/admin/files/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = adminCsp(nonce);
  // Next.js reads the nonce from the request's policy and adds it to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
