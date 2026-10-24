import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level convenience only: bounce obviously unauthenticated visitors away from /admin
 * before rendering. Real authentication + authorization happen server-side in the admin
 * layout, pages and every server action (never rely on this file alone).
 */
const PUBLIC_ADMIN = ["/admin/login", "/admin/invite", "/admin/forgot-password", "/admin/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin")) {
    const isPublic = PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const hasSession = request.cookies.has("arenix_session");
    if (!isPublic && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
