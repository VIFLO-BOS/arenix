/**
 * Seeds MongoDB with the typed starter content (projects, services, solutions, technologies,
 * articles, FAQs, legal drafts, site settings). Idempotent: existing records are left
 * untouched unless --force is passed, so admin edits survive re-seeding.
 *
 *   npm run db:seed            # insert missing records only
 *   npm run db:seed -- --force # overwrite content fields from fixtures
 *   npm run db:seed -- --force --only projects   # overwrite one collection, leave the rest alone
 *
 * --only accepts a comma separated list of projects, services, solutions, technologies,
 * articles, faqs and settings.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import { ArticleModel, FaqModel, PortfolioProjectModel, ServiceModel, SiteSetting, SolutionModel, TechnologyModel } from "../src/server/db/models/cms";
import { projectsFixture } from "../src/content/projects";
import { servicesFixture } from "../src/content/services";
import { solutionsFixture } from "../src/content/solutions";
import { technologiesFixture } from "../src/content/technologies";
import { articlesFixture, faqsFixture, legalFixture } from "../src/content/misc";

loadEnv({ path: ".env.local", override: false });

const force = process.argv.includes("--force");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx >= 0 ? new Set((process.argv[onlyIdx + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean)) : null;
const wants = (collection: string) => !only || only.has(collection);
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/arenix";

async function upsertBySlug<T extends { slug: string }>(model: mongoose.Model<unknown>, items: T[], label: string) {
  let inserted = 0;
  let updated = 0;
  for (const item of items) {
    const { slug, ...rest } = item as T & Record<string, unknown>;
    const data = { ...rest, slug } as Record<string, unknown>;
    if ("publishedAt" in data && typeof data.publishedAt === "string") data.publishedAt = new Date(data.publishedAt as string);
    const existing = await model.exists({ slug });
    if (existing && !force) continue;
    if (existing) {
      await model.updateOne({ slug }, { $set: data });
      updated++;
    } else {
      await model.create(data);
      inserted++;
    }
  }
  console.log(`${label.padEnd(14)} inserted ${inserted}, updated ${updated}, kept ${items.length - inserted - updated}`);
}

async function main() {
  console.log(`Connecting to ${uri.replace(/\/\/([^@]+)@/, "//***@")} …`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  if (wants("projects")) await upsertBySlug(PortfolioProjectModel as unknown as mongoose.Model<unknown>, projectsFixture, "projects");
  if (wants("services")) await upsertBySlug(ServiceModel as unknown as mongoose.Model<unknown>, servicesFixture, "services");
  if (wants("solutions")) await upsertBySlug(SolutionModel as unknown as mongoose.Model<unknown>, solutionsFixture, "solutions");
  if (wants("technologies")) await upsertBySlug(TechnologyModel as unknown as mongoose.Model<unknown>, technologiesFixture, "technologies");
  if (wants("articles")) await upsertBySlug(ArticleModel as unknown as mongoose.Model<unknown>, articlesFixture, "articles");

  // FAQs have no slug; match on question text.
  let faqInserted = 0;
  for (const f of wants("faqs") ? faqsFixture : []) {
    const { id, ...rest } = f;
    void id;
    const exists = await FaqModel.exists({ question: f.question });
    if (exists && !force) continue;
    if (exists) await FaqModel.updateOne({ question: f.question }, { $set: rest });
    else {
      await FaqModel.create(rest);
      faqInserted++;
    }
  }
  if (wants("faqs")) console.log(`${"faqs".padEnd(14)} inserted ${faqInserted}, kept ${faqsFixture.length - faqInserted}`);

  const settings = wants("settings") ? await SiteSetting.findOne({ key: "site" }) : undefined;
  if (settings === null) {
    await SiteSetting.create({ key: "site", legal: { privacyMarkdown: legalFixture.privacyMarkdown, termsMarkdown: legalFixture.termsMarkdown } });
    console.log(`${"settings".padEnd(14)} created default site settings (legal drafts loaded)`);
  } else if (settings) {
    console.log(`${"settings".padEnd(14)} kept existing site settings`);
  }

  // Ensure indexes exist (text indexes etc.).
  await Promise.all([PortfolioProjectModel.syncIndexes(), ServiceModel.syncIndexes(), SolutionModel.syncIndexes(), TechnologyModel.syncIndexes(), ArticleModel.syncIndexes(), FaqModel.syncIndexes()]);
  console.log("Indexes synced. Done.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
