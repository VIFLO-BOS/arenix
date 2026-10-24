"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodType } from "zod";
import type { FormState } from "@/lib/validation/form-state";
import { fieldErrors } from "@/lib/validation/forms";
import * as V from "@/lib/validation/admin";
import { IMAGE_MIME, MAX_IMAGE_BYTES } from "@/lib/validation/forms";
import { requirePermission, AuthorizationError, type CurrentUser } from "@/server/auth/session";
import type { Permission } from "@/server/auth/permissions";
import * as crm from "@/server/services/crm";
import * as proposals from "@/server/services/proposals";
import * as projects from "@/server/services/projects";
import * as cms from "@/server/services/cms";
import * as team from "@/server/services/team";
import { transitionBooking } from "@/server/services/bookings";
import { markAllRead } from "@/server/services/notifications";
import { retryPendingEmails } from "@/server/services/email";
import { saveUploadedFile, sniffMime } from "@/server/services/storage";
import type { Role } from "@/server/db/models/user";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function fdToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (v instanceof File) continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      const existing = out[key] as string[] | undefined;
      if (existing) existing.push(v);
      else out[key] = [v];
    } else out[k] = v;
  }
  return out;
}

async function run<T>(permission: Permission, schema: ZodType<T>, fd: FormData, fn: (user: CurrentUser, data: T) => Promise<string | void>, revalidate: string[] = ["/admin"]): Promise<FormState> {
  let user: CurrentUser;
  try {
    user = await requirePermission(permission);
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: err.message };
    throw err;
  }
  const parsed = schema.safeParse(fdToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." };
  try {
    const msg = await fn(user, parsed.data);
    for (const p of revalidate) revalidatePath(p, "layout");
    return { ok: true, message: msg || "Saved." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

const PUBLIC_PATHS = ["/", "/work", "/services", "/solutions", "/technologies", "/insights", "/careers", "/contact", "/about", "/privacy", "/terms", "/lab", "/process", "/book-consultation", "/start-project"];

/* ------------------------------------------------------------------ */
/* Inquiries                                                          */
/* ------------------------------------------------------------------ */

export async function inquiryStatusAction(_p: FormState, fd: FormData) {
  return run("inquiries:write", V.inquiryStatusSchema, fd, async (u, d) => {
    await crm.updateInquiryStatus(u, d.id, d.status, d.note || undefined);
    return `Inquiry marked ${d.status.toLowerCase()}.`;
  });
}
export async function inquiryNoteAction(_p: FormState, fd: FormData) {
  return run("inquiries:write", V.inquiryNoteSchema, fd, async (u, d) => {
    await crm.addInquiryNote(u, d.id, d.body);
    return "Note added.";
  });
}
export async function inquiryAssignAction(_p: FormState, fd: FormData) {
  return run("inquiries:write", V.assignSchema, fd, async (u, d) => {
    await crm.assignInquiry(u, d.id, d.userId || null);
    return "Assignment updated.";
  });
}

/* ------------------------------------------------------------------ */
/* Leads / clients                                                    */
/* ------------------------------------------------------------------ */

export async function leadUpdateAction(_p: FormState, fd: FormData) {
  return run("leads:write", V.leadUpdateSchema, fd, async (u, d) => {
    await crm.updateLead(u, d.id, {
      title: d.title || undefined,
      status: d.status,
      priority: d.priority,
      assignedTo: d.assignedTo === undefined ? undefined : d.assignedTo || null,
      estimatedValue: d.estimatedValue,
      currency: d.currency || undefined,
      followUpAt: d.followUpAt,
      followUpNote: d.followUpNote,
      lostReason: d.lostReason,
      note: d.note || undefined,
    });
    return "Lead updated.";
  });
}
export async function leadActivityAction(_p: FormState, fd: FormData) {
  return run("leads:write", V.leadActivitySchema, fd, async (u, d) => {
    await crm.addLeadActivity(u, d.id, d.kind, d.body);
    return "Activity logged.";
  });
}
export async function clientUpsertAction(_p: FormState, fd: FormData) {
  let createdId = "";
  const res = await run("clients:write", V.clientSchema, fd, async (u, d) => {
    const doc = await crm.upsertClient(u, { ...d, id: d.id || undefined });
    if (!d.id) createdId = doc._id.toString();
    return "Client saved.";
  });
  if (res.ok && createdId) redirect(`/admin/clients/${createdId}`);
  return res;
}

/* ------------------------------------------------------------------ */
/* Bookings                                                           */
/* ------------------------------------------------------------------ */

export async function bookingTransitionAction(_p: FormState, fd: FormData) {
  return run("bookings:write", V.bookingTransitionSchema, fd, async (u, d) => {
    const endsAt = d.startsAt && d.durationMinutes ? new Date(d.startsAt.getTime() + d.durationMinutes * 60000) : undefined;
    await transitionBooking(d.id, d.status, u, { startsAt: d.startsAt, endsAt, meetingUrl: d.meetingUrl, note: d.note || undefined });
    return `Booking ${d.status.toLowerCase()}.`;
  });
}

/* ------------------------------------------------------------------ */
/* Proposals                                                          */
/* ------------------------------------------------------------------ */

export async function proposalCreateAction(_p: FormState, fd: FormData) {
  let id = "";
  const res = await run("proposals:write", V.proposalCreateSchema, fd, async (u, d) => {
    const doc = await proposals.createProposal(u, { ...d, leadId: d.leadId || undefined, clientId: d.clientId || undefined, summary: d.summary || undefined, scope: d.scope || undefined, notes: d.notes || undefined });
    id = doc._id.toString();
    return "Proposal created.";
  });
  if (res.ok && id) redirect(`/admin/proposals/${id}`);
  return res;
}
export async function proposalVersionAction(_p: FormState, fd: FormData) {
  return run("proposals:write", V.proposalVersionAddSchema, fd, async (u, d) => {
    await proposals.addProposalVersion(u, d.id, { ...d, summary: d.summary || undefined, scope: d.scope || undefined, notes: d.notes || undefined });
    return "New version saved.";
  });
}
export async function proposalTransitionAction(_p: FormState, fd: FormData) {
  return run("proposals:write", V.proposalTransitionSchema, fd, async (u, d) => {
    await proposals.transitionProposal(u, d.id, d.status, { note: d.note || undefined, sentTo: d.sentTo || undefined });
    return `Proposal ${d.status.toLowerCase().replace("_", " ")}.`;
  });
}

/* ------------------------------------------------------------------ */
/* Internal projects                                                  */
/* ------------------------------------------------------------------ */

export async function projectUpsertAction(_p: FormState, fd: FormData) {
  let id = "";
  const res = await run("projects:write", V.internalProjectSchema, fd, async (u, d) => {
    const doc = await projects.upsertInternalProject(u, { ...d, id: d.id || undefined, clientId: d.clientId || undefined, leadId: d.leadId || undefined, proposalId: d.proposalId || undefined, ownerId: d.ownerId || undefined, summary: d.summary || undefined });
    if (!d.id) id = doc._id.toString();
    return "Project saved.";
  });
  if (res.ok && id) redirect(`/admin/projects/${id}`);
  return res;
}
export async function milestoneAddAction(_p: FormState, fd: FormData) {
  return run("projects:write", V.milestoneSchema, fd, async (u, d) => {
    await projects.addMilestone(u, d.id, d.title, d.dueAt);
    return "Milestone added.";
  });
}
export async function milestoneStatusAction(_p: FormState, fd: FormData) {
  return run("projects:write", V.milestoneStatusSchema, fd, async (u, d) => {
    await projects.updateMilestoneStatus(u, d.id, d.milestoneId, d.status);
    return "Milestone updated.";
  });
}
export async function projectNoteAction(_p: FormState, fd: FormData) {
  return run("projects:write", V.projectNoteSchema, fd, async (u, d) => {
    await projects.addProjectNote(u, d.id, d.body);
    return "Note added.";
  });
}

/* ------------------------------------------------------------------ */
/* Portfolio                                                          */
/* ------------------------------------------------------------------ */

export async function portfolioUpsertAction(_p: FormState, fd: FormData) {
  let slug = "";
  let created = false;
  const res = await run(
    "cms:write",
    V.portfolioSchema,
    fd,
    async (u, d) => {
      created = !d.originalSlug;
      await cms.upsertPortfolio(u, { ...d, originalSlug: d.originalSlug || undefined });
      slug = d.slug;
      return "Project saved.";
    },
    ["/admin", ...PUBLIC_PATHS, "/work/[slug]"],
  );
  if (res.ok && created) redirect(`/admin/portfolio/${slug}`);
  return res;
}
export async function portfolioMediaAction(_p: FormState, fd: FormData) {
  return run(
    "cms:write",
    V.portfolioMediaSchema,
    fd,
    async (u, d) => {
      await cms.upsertPortfolioMedia(
        u,
        d.slug,
        {
          id: d.mediaId || undefined,
          src: d.src,
          alt: d.alt,
          caption: d.caption || undefined,
          pageLabel: d.pageLabel || undefined,
          kind: d.kind,
          device: d.device || undefined,
          isAuthenticScreenshot: !!d.isAuthenticScreenshot,
          approvedForPublication: !!d.approvedForPublication,
          sortOrder: d.sortOrder ?? 0,
          width: d.device === "mobile" ? 390 : 1440,
          height: d.device === "mobile" ? 844 : 900,
        },
        !!d.setAsCover,
      );
      return "Media saved.";
    },
    ["/admin", ...PUBLIC_PATHS],
  );
}
export async function portfolioMediaRemoveAction(_p: FormState, fd: FormData) {
  return run("cms:write", V.portfolioMediaRemoveSchema, fd, async (u, d) => {
    await cms.removePortfolioMedia(u, d.slug, d.mediaId);
    return "Media removed.";
  }, ["/admin", ...PUBLIC_PATHS]);
}
export async function portfolioDeleteAction(_p: FormState, fd: FormData) {
  const res = await run("cms:publish", V.portfolioMediaRemoveSchema.pick({ slug: true }), fd, async (u, d) => {
    await cms.deletePortfolio(u, d.slug);
    return "Project deleted.";
  }, ["/admin", ...PUBLIC_PATHS]);
  if (res.ok) redirect("/admin/portfolio");
  return res;
}

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

function pairs(lines: string[]) {
  return lines.map(V.splitPair).filter((p) => p.a);
}

export async function contentUpsertAction(_p: FormState, fd: FormData) {
  const kind = String(fd.get("kind") ?? "");
  let redirectTo = "";
  const res = await (async (): Promise<FormState> => {
    switch (kind) {
      case "service":
        return run("cms:write", V.serviceSchema, fd, async (u, d) => {
          await cms.upsertContentBySlug(u, "service", d.originalSlug || undefined, {
            ...d,
            workflow: pairs(d.workflow).map((p) => ({ title: p.a, detail: p.b })),
            faqs: pairs(d.faqs).map((p) => ({ question: p.a, answer: p.b })),
            published: !!d.published,
            sortOrder: d.sortOrder ?? 0,
          });
          redirectTo = d.originalSlug ? "" : `/admin/content/service/${d.slug}`;
          return "Service saved.";
        }, ["/admin", ...PUBLIC_PATHS, "/services/[slug]"]);
      case "solution":
        return run("cms:write", V.solutionSchema, fd, async (u, d) => {
          await cms.upsertContentBySlug(u, "solution", d.originalSlug || undefined, { ...d, useCases: pairs(d.useCases).map((p) => ({ title: p.a, detail: p.b })), published: !!d.published, sortOrder: d.sortOrder ?? 0 });
          redirectTo = d.originalSlug ? "" : `/admin/content/solution/${d.slug}`;
          return "Solution saved.";
        }, ["/admin", ...PUBLIC_PATHS, "/solutions/[slug]"]);
      case "technology":
        return run("cms:write", V.technologySchema, fd, async (u, d) => {
          await cms.upsertContentBySlug(u, "technology", d.originalSlug || undefined, { ...d, published: !!d.published });
          redirectTo = d.originalSlug ? "" : `/admin/content?tab=technology`;
          return "Technology saved.";
        }, ["/admin", ...PUBLIC_PATHS]);
      case "article":
        return run("cms:write", V.articleSchema, fd, async (u, d) => {
          const words = d.content.trim().split(/\s+/).length;
          await cms.upsertContentBySlug(u, "article", d.originalSlug || undefined, {
            ...d,
            tags: (d.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
            readingTime: Math.max(1, Math.round(words / 220)),
            published: !!d.published,
            publishedAt: d.publishedAt ?? (d.published ? new Date() : undefined),
          });
          redirectTo = d.originalSlug ? "" : `/admin/content/article/${d.slug}`;
          return "Article saved.";
        }, ["/admin", ...PUBLIC_PATHS, "/insights/[slug]"]);
      case "career":
        return run("cms:write", V.careerSchema, fd, async (u, d) => {
          await cms.upsertContentBySlug(u, "career", d.originalSlug || undefined, { ...d, published: !!d.published });
          redirectTo = d.originalSlug ? "" : `/admin/content/career/${d.slug}`;
          return "Opening saved.";
        }, ["/admin", ...PUBLIC_PATHS]);
      case "testimonial":
        return run("cms:write", V.testimonialSchema, fd, async (u, d) => {
          await cms.upsertContentById(u, "testimonial", d.id || undefined, { ...d, approved: !!d.approved, published: !!d.published && !!d.approved });
          return "Testimonial saved.";
        }, ["/admin", ...PUBLIC_PATHS]);
      case "faq":
        return run("cms:write", V.faqSchema, fd, async (u, d) => {
          await cms.upsertContentById(u, "faq", d.id || undefined, { ...d, published: !!d.published, sortOrder: d.sortOrder ?? 0 });
          return "FAQ saved.";
        }, ["/admin", ...PUBLIC_PATHS]);
      default:
        return { ok: false, message: "Unknown content type." };
    }
  })();
  if (res.ok && redirectTo) redirect(redirectTo);
  return res;
}

export async function contentDeleteAction(_p: FormState, fd: FormData) {
  const res = await run("cms:publish", V.deleteSchema, fd, async (u, d) => {
    if (d.kind === "media") await cms.deleteMediaAsset(u, d.id);
    else if (d.kind === "portfolio") await cms.deletePortfolio(u, d.id);
    else await cms.deleteContent(u, d.kind, d.id);
    return "Deleted.";
  }, ["/admin", ...PUBLIC_PATHS]);
  return res;
}

/* ------------------------------------------------------------------ */
/* Media                                                              */
/* ------------------------------------------------------------------ */

export async function mediaUploadAction(_p: FormState, fd: FormData): Promise<FormState> {
  let user: CurrentUser;
  try {
    user = await requirePermission("media:write");
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: err.message };
    throw err;
  }
  const file = fd.get("file");
  const alt = String(fd.get("alt") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { file: "Choose an image file." }, message: "No file." };
  if (!IMAGE_MIME.has(file.type)) return { ok: false, errors: { file: "Only PNG, JPEG, WebP or AVIF images are allowed." }, message: "Unsupported type." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, errors: { file: "Image is larger than 10 MB." }, message: "Too large." };
  if (alt.length < 5) return { ok: false, errors: { alt: "Describe the image (alt text, at least 5 characters)." }, message: "Alt text required." };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffMime(buf, file.type)) return { ok: false, errors: { file: "File content does not match its type." }, message: "Rejected." };
  let width: number | undefined;
  let height: number | undefined;
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();
    width = meta.width;
    height = meta.height;
  } catch {
    /* dimensions optional */
  }
  try {
    const stored = await saveUploadedFile(file, "media");
    await cms.createMediaAsset(user, { ...stored, originalName: file.name, width, height, alt, isAuthenticScreenshot: fd.get("isAuthenticScreenshot") === "on", approvedForPublication: fd.get("approvedForPublication") === "on" });
    revalidatePath("/admin/media");
    return { ok: true, message: `Uploaded ${file.name}.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Upload failed." };
  }
}
export async function mediaUpdateAction(_p: FormState, fd: FormData) {
  return run("media:write", V.mediaUpdateSchema, fd, async (u, d) => {
    await cms.updateMediaAsset(u, d.id, { alt: d.alt, caption: d.caption || undefined, approvedForPublication: !!d.approvedForPublication, isAuthenticScreenshot: !!d.isAuthenticScreenshot });
    return "Media updated.";
  }, ["/admin/media", ...PUBLIC_PATHS]);
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export async function settingsAction(_p: FormState, fd: FormData) {
  return run("settings:write", V.settingsSchema, fd, async (u, d) => {
    const { section, ...rest } = d;
    const keysBySection: Record<string, string[]> = {
      brand: ["legalName", "shortName", "tagline", "description", "logoUrl", "accentColor"],
      contact: ["email", "phone", "whatsappDigits", "addressLine", "city", "country", "showLocation"],
      socials: ["linkedin", "github", "x", "instagram", "youtube"],
      booking: ["mode", "publicEventLink", "operatingHoursNote"],
      notifications: ["inquiryEmails", "bookingEmails"],
      seo: ["defaultTitle", "titleTemplate", "defaultDescription", "ogImageUrl", "indexable"],
      home: ["heroHeadline", "heroSupport", "showreelVideoUrl", "showreelPosterUrl", "featuredProjectSlugs", "showcaseProjectSlugs"],
      legal: ["privacyMarkdown", "termsMarkdown", "privacyReviewed", "termsReviewed"],
    };
    const patch: Record<string, unknown> = {};
    for (const k of keysBySection[section] ?? []) {
      const v = (rest as Record<string, unknown>)[k];
      if (v === undefined) continue;
      patch[k] = ["showLocation", "indexable", "privacyReviewed", "termsReviewed"].includes(k) ? !!v : v;
    }
    if (section === "booking" && patch.mode === "calcom" && !patch.publicEventLink) throw new Error("Live booking needs a public Cal.com event link.");
    await cms.updateSettingsSection(u, section, patch);
    return "Settings saved.";
  }, ["/admin", ...PUBLIC_PATHS]);
}

/* ------------------------------------------------------------------ */
/* Team                                                               */
/* ------------------------------------------------------------------ */

export async function inviteAction(_p: FormState, fd: FormData) {
  return run("team:manage", V.inviteSchema, fd, async (u, d) => {
    const r = await team.inviteUser({ ...d, role: d.role as Role, actor: u });
    return r.acceptUrl ? `Invitation created. Email is in demo mode, so share this link yourself. ${r.acceptUrl}` : `Invitation sent to ${d.email}.`;
  }, ["/admin/team"]);
}
export async function roleChangeAction(_p: FormState, fd: FormData) {
  return run("team:manage", V.roleChangeSchema, fd, async (u, d) => {
    await team.updateUserRole(u, d.id, d.role as Role);
    return "Role updated. The user has been signed out.";
  }, ["/admin/team"]);
}
export async function activeToggleAction(_p: FormState, fd: FormData) {
  return run("team:manage", V.activeSchema, fd, async (u, d) => {
    await team.setUserActive(u, d.id, d.active === "true");
    return d.active === "true" ? "User reactivated." : "User deactivated and signed out.";
  }, ["/admin/team"]);
}
export async function revokeInviteAction(_p: FormState, fd: FormData) {
  return run("team:manage", V.idSchema, fd, async (u, d) => {
    await team.revokeInvitation(u, d.id);
    return "Invitation revoked.";
  }, ["/admin/team"]);
}

/* ------------------------------------------------------------------ */
/* Notifications / ops                                                */
/* ------------------------------------------------------------------ */

export async function notificationsMarkReadAction(_p: FormState, _fd: FormData): Promise<FormState> {
  void _p;
  void _fd;
  const user = await requirePermission("dashboard:read");
  await markAllRead(user);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "All notifications marked as read." };
}
export async function retryEmailsAction(_p: FormState, _fd: FormData): Promise<FormState> {
  void _p;
  void _fd;
  await requirePermission("settings:write");
  const n = await retryPendingEmails();
  revalidatePath("/admin/notifications");
  return { ok: true, message: `Retried ${n} pending email${n === 1 ? "" : "s"}.` };
}
export async function dispatchFollowUpsAction(_p: FormState, _fd: FormData): Promise<FormState> {
  void _p;
  void _fd;
  const user = await requirePermission("leads:write");
  const n = await crm.dispatchDueFollowUps(user);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Sent ${n} follow-up reminder${n === 1 ? "" : "s"}.` };
}
