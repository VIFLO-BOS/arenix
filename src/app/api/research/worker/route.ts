import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/session";
import { roleHas } from "@/server/auth/permissions";
import { hasOpenTasks } from "@/server/research/queue";
import { purgeExpired, runResearchWorker } from "@/server/research/pipeline";

/**
 * Runs queued lead research. Two callers:
 *   POST from the admin while a search or profile page is open (signed in staff only).
 *   GET from the daily Vercel cron, with CRON_SECRET as a bearer token, to finish anything
 *   left over and to delete expired prospects.
 * Each run claims tasks for a limited time so it stays inside the function time limit.
 */
export const maxDuration = 300;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in first." }, 401);
  if (!roleHas(user.role, "leads:read")) return json({ error: "Not allowed." }, 403);
  // Only this site's own pages may start a run.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return json({ error: "Not allowed." }, 403);

  let scope: { searchId?: string; prospectId?: string } = {};
  try {
    const body = (await request.json()) as { searchId?: unknown; prospectId?: unknown };
    scope = { searchId: typeof body.searchId === "string" ? body.searchId : undefined, prospectId: typeof body.prospectId === "string" ? body.prospectId : undefined };
  } catch {
    // An empty body runs everything that is due.
  }
  const report = await runResearchWorker(20_000);
  return json({ processed: report.processed, open: await hasOpenTasks(scope) });
}

function cronAuthorised(request: NextRequest): boolean {
  const secret = env.cronSecret;
  if (secret.length < 16) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: NextRequest) {
  if (!cronAuthorised(request)) return json({ error: "Not allowed." }, 401);
  const report = await runResearchWorker(240_000);
  const purged = await purgeExpired();
  return json({ processed: report.processed, done: report.done, failed: report.failed, deferred: report.deferred, purged });
}
