import { NextResponse } from "next/server";
import { getGithubSnapshot } from "@/server/integrations/github";

/**
 * Polled by the homepage activity section while it is on screen. The snapshot is aggregated
 * and masked on the server. The CDN holds each response for a minute so every visitor shares
 * one origin request, and the data cache behind it limits calls to GitHub.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getGithubSnapshot();
  if (!snapshot) {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { ok: true, snapshot },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=240" } },
  );
}
