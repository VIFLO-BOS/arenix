/**
 * Loads the default Privacy policy and Terms of use from src/content/legal.ts into the site
 * settings, after saving the current texts to a backup file. The "reviewed" flags are left as
 * they are, so the "Pending legal review" label stays until a person ticks them in Settings.
 *
 *   npx tsx scripts/load-legal-texts.ts <backup-folder>             dry run, shows what would change
 *   npx tsx scripts/load-legal-texts.ts <backup-folder> --apply     backs up, then writes
 *
 * Uses MONGODB_URI from the environment (or .env.local), so check which database it points at.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import mongoose from "mongoose";
import { PRIVACY_POLICY, TERMS_OF_USE, LEGAL_VERSION } from "../src/content/legal";

config({ path: ".env.local" });

async function main() {
  const backupDir = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!backupDir || backupDir.startsWith("--")) throw new Error("Give a folder for the backup as the first argument.");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection.");
  const target = `${mongoose.connection.host}/${db.databaseName}`;
  const settings = db.collection("sitesettings");
  const doc = await settings.findOne({ key: "site" });
  if (!doc) throw new Error(`No site settings document in ${target}.`);
  const legal = (doc.legal ?? {}) as Record<string, unknown>;
  const same = legal.privacyMarkdown === PRIVACY_POLICY && legal.termsMarkdown === TERMS_OF_USE;
  console.log(`database ${target}`);
  console.log(`current privacy ${String(legal.privacyMarkdown ?? "").length} chars, terms ${String(legal.termsMarkdown ?? "").length} chars, reviewed flags ${legal.privacyReviewed}/${legal.termsReviewed}`);
  console.log(`new privacy ${PRIVACY_POLICY.length} chars, terms ${TERMS_OF_USE.length} chars, version ${LEGAL_VERSION}`);
  if (same) {
    console.log("already up to date, nothing to do");
  } else if (apply) {
    mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `legal-backup-${db.databaseName}-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify({ target, savedAt: new Date().toISOString(), legal }, null, 2));
    await settings.updateOne({ _id: doc._id }, { $set: { "legal.privacyMarkdown": PRIVACY_POLICY, "legal.termsMarkdown": TERMS_OF_USE, updatedAt: new Date() } });
    await db.collection("auditlogs").insertOne({ action: "settings.legal_texts_loaded", entityType: "SiteSetting", entityId: "site", actorLabel: "System (load-legal-texts script)", severity: "INFO", metadata: { version: LEGAL_VERSION }, createdAt: new Date() });
    console.log(`backed up to ${file} and wrote the new texts`);
  } else {
    console.log("dry run, add --apply to write");
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
