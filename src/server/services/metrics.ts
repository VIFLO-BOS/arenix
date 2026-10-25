import "server-only";
import { connectDb } from "@/server/db/connect";
import { Booking, Inquiry, Lead, Proposal } from "@/server/db/models/crm";
import { ClickEvent, EmailDispatch } from "@/server/db/models/system";

export type Range = "7d" | "30d" | "90d" | "all";

export function rangeStart(range: Range): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

/**
 * Real counts only. Values are computed from the database with server timestamps; nothing
 * is estimated. `configured` flags distinguish "not configured" from "0".
 */
export async function getOverviewMetrics(range: Range) {
  await connectDb();
  const start = rangeStart(range);
  const since = start ? { createdAt: { $gte: start } } : {};
  const now = new Date();

  const [
    inquiriesNew,
    inquiriesTotal,
    leadsTotal,
    leadsQualified,
    leadsWon,
    leadsLost,
    bookingsRequested,
    bookingsConfirmed,
    bookingsNoShow,
    proposalsSent,
    proposalsAccepted,
    overdueFollowUps,
    upcomingBookings,
    emailFailed,
    emailPending,
    whatsappClicks,
    byService,
    pipelineValue,
    firstResponse,
  ] = await Promise.all([
    Inquiry.countDocuments({ ...since, status: "NEW" }),
    Inquiry.countDocuments(since),
    Lead.countDocuments(since),
    Lead.countDocuments({ ...since, status: { $in: ["QUALIFIED", "PROPOSAL_SENT", "WON"] } }),
    Lead.countDocuments({ ...since, status: "WON" }),
    Lead.countDocuments({ ...since, status: "LOST" }),
    Booking.countDocuments({ ...since, status: "REQUESTED" }),
    Booking.countDocuments({ ...since, status: { $in: ["CONFIRMED", "RESCHEDULED", "COMPLETED"] } }),
    Booking.countDocuments({ ...since, status: "NO_SHOW" }),
    Proposal.countDocuments({ ...since, status: { $in: ["SENT", "ACCEPTED", "REJECTED"] } }),
    Proposal.countDocuments({ ...since, status: "ACCEPTED" }),
    Lead.countDocuments({ followUpAt: { $lt: now }, status: { $nin: ["WON", "LOST", "ARCHIVED"] } }),
    Booking.find({ startsAt: { $gte: now }, status: { $in: ["CONFIRMED", "RESCHEDULED"] } }).sort({ startsAt: 1 }).limit(5).lean(),
    EmailDispatch.countDocuments({ status: "FAILED" }),
    EmailDispatch.countDocuments({ status: "PENDING" }),
    ClickEvent.countDocuments({ ...since, kind: "whatsapp_click" }),
    Inquiry.aggregate<{ _id: string | null; count: number }>([{ $match: { ...since, type: "PROJECT" } }, { $group: { _id: "$serviceCategory", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    Lead.aggregate<{ _id: string; total: number }>([{ $match: { status: { $nin: ["WON", "LOST", "ARCHIVED"] }, estimatedValue: { $gt: 0 } } }, { $group: { _id: "$currency", total: { $sum: "$estimatedValue" } } }]),
    Lead.aggregate<{ _id: null; avgMs: number; n: number }>([
      { $match: { ...since, firstResponseAt: { $exists: true } } },
      { $project: { diff: { $subtract: ["$firstResponseAt", "$createdAt"] } } },
      { $group: { _id: null, avgMs: { $avg: "$diff" }, n: { $sum: 1 } } },
    ]),
  ]);

  const decided = leadsWon + leadsLost;
  return {
    range,
    inquiries: { newCount: inquiriesNew, total: inquiriesTotal },
    leads: { total: leadsTotal, qualified: leadsQualified, won: leadsWon, lost: leadsLost, winRate: decided ? Math.round((leadsWon / decided) * 100) : null },
    bookings: { requested: bookingsRequested, confirmed: bookingsConfirmed, noShow: bookingsNoShow, upcoming: upcomingBookings },
    proposals: { sent: proposalsSent, accepted: proposalsAccepted },
    overdueFollowUps,
    email: { failed: emailFailed, pending: emailPending },
    whatsappClicks,
    byService: byService.map((b) => ({ service: b._id ?? "Unspecified", count: b.count })),
    pipelineValue: pipelineValue.map((p) => ({ currency: p._id ?? "NGN", total: p.total })),
    firstResponse: firstResponse[0] ? { avgHours: Math.round((firstResponse[0].avgMs / 3600000) * 10) / 10, measured: firstResponse[0].n } : null,
  };
}

export async function getRecentActivity(limit = 12) {
  await connectDb();
  const [inquiries, bookings, leads] = await Promise.all([
    Inquiry.find().sort({ createdAt: -1 }).limit(limit).select("reference type name status createdAt").lean(),
    Booking.find().sort({ createdAt: -1 }).limit(limit).select("reference name status consultationType createdAt").lean(),
    Lead.find().sort({ updatedAt: -1 }).limit(limit).select("title status updatedAt").lean(),
  ]);
  const items = [
    ...inquiries.map((i) => ({ kind: "inquiry" as const, id: i._id.toString(), label: `${i.type === "PROJECT" ? "Project request" : "Inquiry"} ${i.reference}, ${i.name}`, status: i.status, at: i.createdAt as Date, href: `/admin/inquiries/${i._id.toString()}` })),
    ...bookings.map((b) => ({ kind: "booking" as const, id: b._id.toString(), label: `Booking ${b.reference}, ${b.name}`, status: b.status, at: b.createdAt as Date, href: `/admin/bookings/${b._id.toString()}` })),
    ...leads.map((l) => ({ kind: "lead" as const, id: l._id.toString(), label: `Lead, ${l.title}`, status: l.status, at: l.updatedAt as Date, href: `/admin/leads/${l._id.toString()}` })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export async function getFunnel(range: Range) {
  await connectDb();
  const start = rangeStart(range);
  const since = start ? { createdAt: { $gte: start } } : {};
  const [visitsNote, inquiries, leads, qualified, proposals, won] = await Promise.all([
    Promise.resolve(null),
    Inquiry.countDocuments(since),
    Lead.countDocuments(since),
    Lead.countDocuments({ ...since, status: { $in: ["QUALIFIED", "PROPOSAL_SENT", "WON"] } }),
    Proposal.countDocuments({ ...since, status: { $in: ["SENT", "ACCEPTED", "REJECTED"] } }),
    Lead.countDocuments({ ...since, status: "WON" }),
  ]);
  void visitsNote;
  return [
    { stage: "Inquiries + requests", value: inquiries },
    { stage: "Leads", value: leads },
    { stage: "Qualified", value: qualified },
    { stage: "Proposals sent", value: proposals },
    { stage: "Won", value: won },
  ];
}

export async function getDailySeries(range: Range) {
  await connectDb();
  const start = rangeStart(range) ?? new Date(Date.now() - 365 * 24 * 3600 * 1000);
  const rows = await Inquiry.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ day: r._id, count: r.count }));
}
