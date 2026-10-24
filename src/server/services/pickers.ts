import "server-only";
import { connectDb } from "@/server/db/connect";
import { Client, Lead, Proposal } from "@/server/db/models/crm";
import { User } from "@/server/db/models/user";
import { PortfolioProjectModel } from "@/server/db/models/cms";

/** Lightweight option lists for admin selects. */
export async function listPickerOptions() {
  await connectDb();
  const [clients, staff, leads, proposals] = await Promise.all([
    Client.find({ archivedAt: { $exists: false } }).select("name").sort({ name: 1 }).limit(500).lean(),
    User.find({ isActive: true }).select("name").sort({ name: 1 }).lean(),
    Lead.find({ status: { $nin: ["ARCHIVED", "LOST"] } }).select("title").sort({ updatedAt: -1 }).limit(300).lean(),
    Proposal.find().select("reference title").sort({ updatedAt: -1 }).limit(300).lean(),
  ]);
  return { clients, staff, leads, proposals };
}

export async function listPortfolioSlugs() {
  await connectDb();
  return PortfolioProjectModel.find().select("slug title").sort({ sortOrder: 1 }).lean();
}
