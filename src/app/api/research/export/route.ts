import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { roleHas } from "@/server/auth/permissions";
import { rateLimitDb } from "@/server/auth/rate-limit-db";
import { recordAudit } from "@/server/services/audit";
import { exportCsv, type ProspectFilter } from "@/server/research/service";

/**
 * CSV export of the lead research table. Only staff who can change leads may export, the
 * number of exports is limited, and every export is written to the audit log.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  if (!roleHas(user.role, "leads:write")) return new Response("Not allowed.", { status: 403 });
  const limit = await rateLimitDb(`prospect-export:${user.id}`, 10, 60 * 60_000);
  if (!limit.ok) return new Response("Too many exports in an hour. Try again later.", { status: 429 });

  const sp = request.nextUrl.searchParams;
  const pick = (k: string) => sp.get(k) || undefined;
  const filter: ProspectFilter = {
    searchId: pick("searchId"),
    q: pick("q"),
    foundBy: pick("foundBy"),
    websiteStatus: pick("websiteStatus"),
    band: pick("band"),
    verification: pick("verification"),
    location: pick("location"),
    industry: pick("industry"),
    inLeads: sp.get("inLeads") === "yes" ? "yes" : sp.get("inLeads") === "no" ? "no" : undefined,
    show: sp.get("show") === "dismissed" ? "dismissed" : "active",
  };
  const ids = (sp.get("ids") ?? "").split(",").filter((i) => /^[a-f\d]{24}$/i.test(i)).slice(0, 500);
  const { csv, count } = await exportCsv(filter, ids);
  await recordAudit({ actor: user, action: "lead_research.export", entityType: "Prospect", metadata: { count, selected: ids.length, filter } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="arenix-businesses-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
