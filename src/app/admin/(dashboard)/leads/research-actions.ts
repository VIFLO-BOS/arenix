"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as V from "@/lib/validation/admin";
import type { FormState } from "@/lib/validation/form-state";
import { requirePermission, userCan, AuthorizationError } from "@/server/auth/session";
import { rateLimitDb } from "@/server/auth/rate-limit-db";
import { updateResearchSettings } from "@/server/ai/settings";
import { AiError } from "@/server/ai";
import { askAssistant, draftOutreach } from "@/server/research/ai-research";
import { runResearchWorker } from "@/server/research/pipeline";
import * as research from "@/server/research/service";
import { ASSISTANT_PRESETS } from "@/types/research";
import { fdToObject, run, safeErrorMessage } from "../run-action";

/** Actions for Find leads: searches, the results table, the research profile and follow ups. */

const FIND = "/admin/leads/discover";
const PROSPECTS = "/admin/leads/prospects";
const OUTREACH = "/admin/leads/outreach";

/** Starts background research after the response, so the page does not wait for it. */
function kickWorker() {
  after(async () => {
    try {
      await runResearchWorker(200_000);
    } catch (err) {
      console.error("[lead research] background run failed", err);
    }
  });
}

const aiMessage = (err: unknown) => (err instanceof AiError ? err.message : safeErrorMessage(err));

/* --------------------------------- Searches -------------------------------- */

export async function prospectSearchAction(_p: FormState, fd: FormData): Promise<FormState> {
  let target = "";
  const res = await run(
    "prospecting:run",
    V.prospectSearchSchema,
    fd,
    async (u, d) => {
      const limit = await rateLimitDb(`prospect-search:${u.id}`, 12, 60 * 60_000);
      if (!limit.ok) throw new Error("Too many searches in an hour. Wait a little and try again.");
      const r = await research.createSearch(u, { ...d, industry: d.industry || undefined, keywords: d.keywords || undefined, country: d.country || undefined, region: d.region || undefined, city: d.city || undefined });
      target = `${FIND}/${r.searchId}${r.reused ? "?reused=1" : ""}`;
      if (!r.reused) kickWorker();
      return r.reused ? "The same search ran in the last day, so it was reopened." : "Search started.";
    },
    [FIND],
  );
  if (res.ok && target) redirect(target);
  return res;
}

export async function cancelSearchAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("prospecting:run", V.idOnlySchema, fd, async (u, d) => {
    await research.cancelSearch(u, d.id);
    return "Search cancelled.";
  }, [FIND]);
}

/* -------------------------------- Bulk actions ------------------------------- */

export async function prospectBulkAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:read", V.prospectBulkSchema, fd, async (u, d) => {
    const needs = d.op === "research" || d.op === "analyse" ? "prospecting:run" : "leads:write";
    if (!userCan(u, needs)) throw new AuthorizationError();
    if (d.op === "research" || d.op === "analyse") {
      const n = await research.queueResearchFor(u, d.ids, d.op === "analyse");
      if (n) kickWorker();
      return n ? `Research queued for ${n} ${n === 1 ? "business" : "businesses"}.` : "Nothing new to research. Recently researched businesses are skipped.";
    }
    if (d.op === "dismiss" || d.op === "restore") {
      const n = await research.setDismissed(u, d.ids, d.op === "dismiss");
      return `${n} ${n === 1 ? "business" : "businesses"} ${d.op === "dismiss" ? "dismissed" : "restored"}.`;
    }
    let created = 0;
    const duplicates: string[] = [];
    for (const id of d.ids.slice(0, 50)) {
      const r = await research.addToLeads(u, id, "create");
      if (r.status === "created") created += 1;
      else if (r.status === "duplicate") duplicates.push(r.title);
    }
    return `${created} added to Leads.${duplicates.length ? ` ${duplicates.length} already in Leads and left unchanged (${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? " and more" : ""}).` : ""}`;
  }, [FIND, PROSPECTS, "/admin/leads"]);
}

/* -------------------------------- Add to Leads ------------------------------- */

export type AddToLeadsState = FormState & { duplicate?: { leadId: string; title: string; reason: string }; leadId?: string };

export async function addToLeadsAction(_p: AddToLeadsState, fd: FormData): Promise<AddToLeadsState> {
  let user;
  try {
    user = await requirePermission("leads:write");
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: err.message };
    throw err;
  }
  const parsed = V.addToLeadsSchema.safeParse(fdToObject(fd));
  if (!parsed.success) return { ok: false, message: "Something was missing. Reload the page and try again." };
  try {
    const r = await research.addToLeads(user, parsed.data.id, parsed.data.mode);
    revalidatePath("/admin/leads", "layout");
    if (r.status === "duplicate") return { ok: false, message: `Already in Leads as ${r.title}. ${r.reason}`, duplicate: { leadId: r.leadId, title: r.title, reason: r.reason } };
    return { ok: true, message: r.status === "created" ? "Added to Leads." : "The existing lead now links to this research.", leadId: r.leadId };
  } catch (err) {
    return { ok: false, message: safeErrorMessage(err) };
  }
}

/* --------------------------------- Profile --------------------------------- */

export async function prospectResearchAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("prospecting:run", V.prospectBulkSchema, fd, async (u, d) => {
    const n = await research.queueResearchFor(u, d.ids, d.op === "analyse");
    if (n) kickWorker();
    return n ? (d.op === "analyse" ? "Research and AI summary queued. This page updates as it runs." : "Website research queued. This page updates as it runs.") : "Already queued or researched in the last 30 days.";
  }, [PROSPECTS, FIND]);
}

export async function prospectDismissAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.prospectBulkSchema, fd, async (u, d) => {
    await research.setDismissed(u, d.ids, d.op === "dismiss");
    return d.op === "dismiss" ? "Dismissed." : "Restored.";
  }, [PROSPECTS, FIND]);
}

export async function prospectDeleteAction(_p: FormState, fd: FormData): Promise<FormState> {
  const res = await run("leads:write", V.idOnlySchema, fd, async (u, d) => {
    await research.deleteProspect(u, d.id);
    return "Deleted.";
  }, [PROSPECTS, FIND]);
  if (res.ok) redirect(PROSPECTS);
  return res;
}

export async function registrationCheckAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.registrationCheckSchema, fd, async (u, d) => {
    await research.recordRegistration(u, d.id, { status: d.status, registry: d.registry, number: d.number, note: d.note });
    return "Registration check recorded.";
  }, [PROSPECTS]);
}

export async function optOutAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.optOutSchema, fd, async (u, d) => {
    await research.optOutProspect(u, d.id, d.reason || undefined);
    return "Opt out recorded. The contact details were removed and the business will not be researched or contacted again.";
  }, [PROSPECTS, FIND, OUTREACH]);
}

export async function assistantAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("prospecting:run", V.assistantSchema, fd, async (u, d) => {
    if (!d.preset && !d.question) throw new Error("Choose a question or type one.");
    if (d.preset && !ASSISTANT_PRESETS.some((p) => p.id === d.preset)) throw new Error("Unknown question.");
    const limit = await rateLimitDb(`assistant:${u.id}`, 30, 10 * 60_000);
    if (!limit.ok) throw new Error("Too many questions in a short time. Wait a few minutes.");
    try {
      const r = await askAssistant(d.id, { preset: d.preset || undefined, question: d.question || undefined }, { userId: u.id });
      return r.answer;
    } catch (err) {
      throw new Error(aiMessage(err));
    }
  }, [PROSPECTS]);
}

export async function draftCreateAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("prospecting:run", V.draftCreateSchema, fd, async (u, d) => {
    const limit = await rateLimitDb(`drafts:${u.id}`, 20, 10 * 60_000);
    if (!limit.ok) throw new Error("Too many drafts in a short time. Wait a few minutes.");
    try {
      const r = await draftOutreach(d.id, d.kind, { userId: u.id });
      return r.count === 1 ? "Draft written. Review it below before sending." : `First message and ${r.count - 1} follow ups drafted. Review them below. Nothing is sent until you send it yourself.`;
    } catch (err) {
      throw new Error(aiMessage(err));
    }
  }, [PROSPECTS, OUTREACH]);
}

export async function draftEditAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.draftEditSchema, fd, async (u, d) => {
    await research.updateDraft(u, d.id, { subject: d.subject || undefined, body: d.body, to: d.to || undefined });
    return "Draft saved.";
  }, [PROSPECTS, OUTREACH]);
}

export async function draftSentAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.idOnlySchema, fd, async (u, d) => {
    await research.markSent(u, d.id);
    return "Marked as sent.";
  }, [PROSPECTS, OUTREACH, "/admin/leads"]);
}

export async function sequenceAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.sequenceSchema, fd, async (u, d) => {
    if (d.op === "schedule") {
      await research.scheduleSequence(u, d.sequenceId);
      return "Scheduled. The first message is due today under Follow ups.";
    }
    if (d.op === "reply") {
      await research.replyReceived(u, d.sequenceId);
      return "Reply noted. The follow ups were stopped.";
    }
    await research.stopSequence(u, d.sequenceId, "Stopped by a person");
    return "Sequence stopped.";
  }, [PROSPECTS, OUTREACH, "/admin/leads"]);
}

/* --------------------------------- Opt outs -------------------------------- */

export async function suppressionAddAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("leads:write", V.suppressionSchema, fd, async (u, d) => {
    const r = await research.addSuppression(u, d.kind, d.value, d.reason || undefined);
    return `${r.added ? "Added to the opt out list." : "It was already on the list."}${r.affected ? ` Stored research for ${r.affected} ${r.affected === 1 ? "business" : "businesses"} was cleaned.` : ""}`;
  }, ["/admin/leads/opt-outs", PROSPECTS]);
}

export async function suppressionRemoveAction(_p: FormState, fd: FormData): Promise<FormState> {
  return run("settings:write", V.idOnlySchema, fd, async (u, d) => {
    await research.removeSuppression(u, d.id);
    return "Removed from the opt out list.";
  }, ["/admin/leads/opt-outs"]);
}

/* ------------------------------ Tuning settings ------------------------------ */

export async function leadResearchTuningAction(_p: FormState, fd: FormData): Promise<FormState> {
  const path = ["/admin/settings/lead-research"];
  if (fd.get("section") === "crawl") {
    return run("settings:write", V.leadResearchCrawlSchema, fd, async (u, d) => {
      const { section, placesMonthlyLimit, ...crawl } = d;
      void section;
      await updateResearchSettings(u, { section: "crawl", crawl, placesMonthlyLimit });
      return "Crawl limits saved.";
    }, path);
  }
  return run("settings:write", V.leadResearchScoringSchema, fd, async (u, d) => {
    const list = (s: string) => [...new Set(s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean))].slice(0, 60);
    const scoring = { websiteNeed: d.websiteNeed, industryFit: d.industryFit, size: d.size, reachability: d.reachability, decisionMaker: d.decisionMaker, hiring: d.hiring };
    if (Object.values(scoring).every((v) => v === 0)) throw new Error("At least one weight must be above zero.");
    await updateResearchSettings(u, { section: "scoring", scoring, targeting: { industries: list(d.industries), countries: list(d.countries) }, retentionMonths: d.retentionMonths });
    return "Scoring and targeting saved. New scores use them. Rescore a business to update an older score.";
  }, path);
}
