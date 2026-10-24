/**
 * Seeds MongoDB with the typed starter content (projects, services, solutions, technologies,
 * articles, FAQs, legal drafts, site settings). Idempotent: existing records are left
 * untouched unless --force is passed, so admin edits survive re-seeding.
 *
 *   npm run db:seed            # insert missing records only
 *   npm run db:seed -- --force # overwrite content fields from fixtures
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

  await upsertBySlug(PortfolioProjectModel as unknown as mongoose.Model<unknown>, projectsFixture, "projects");
  await upsertBySlug(ServiceModel as unknown as mongoose.Model<unknown>, servicesFixture, "services");
  await upsertBySlug(SolutionModel as unknown as mongoose.Model<unknown>, solutionsFixture, "solutions");
  await upsertBySlug(TechnologyModel as unknown as mongoose.Model<unknown>, technologiesFixture, "technologies");
  await upsertBySlug(ArticleModel as unknown as mongoose.Model<unknown>, articlesFixture, "articles");

  // FAQs have no slug; match on question text.
  let faqInserted = 0;
  for (const f of faqsFixture) {
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
  console.log(`${"faqs".padEnd(14)} inserted ${faqInserted}, kept ${faqsFixture.length - faqInserted}`);

  const settings = await SiteSetting.findOne({ key: "site" });
  if (!settings) {
    await SiteSetting.create({ key: "site", legal: { privacyMarkdown: legalFixture.privacyMarkdown, termsMarkdown: legalFixture.termsMarkdown } });
    console.log(`${"settings".padEnd(14)} created default site settings (legal drafts loaded)`);
  } else {
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
