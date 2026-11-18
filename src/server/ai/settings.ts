import "server-only";
import { connectDb } from "@/server/db/connect";
import { LeadResearchSettings } from "@/server/db/models/research";
import { recordAudit } from "@/server/services/audit";
import type { CurrentUser } from "@/server/auth/session";
import type { AiProviderId, CrawlSettings, ModelPrice, ProviderSettings, ResearchSettings, ScoringWeights, TargetingSettings } from "@/types/research";
import { mergeResearchSettings } from "./pricing";

const KEY = "lead-research";

/** Lead research settings, with defaults filled in for anything not saved yet. */
export async function getResearchSettings(): Promise<ResearchSettings> {
  await connectDb();
  const doc = await LeadResearchSettings.findOne({ key: KEY }).lean();
  return mergeResearchSettings(doc);
}

export type ResearchSettingsPatch =
  | { section: "budget"; monthlyCapUsd: number; perSearchCapUsd: number; providerOrder: AiProviderId[] }
  | { section: "provider"; provider: AiProviderId; value: ProviderSettings }
  | { section: "prices"; prices: ModelPrice[]; searchPricePer1000: Record<AiProviderId, number> }
  | { section: "crawl"; crawl: CrawlSettings; placesMonthlyLimit: number }
  | { section: "scoring"; scoring: ScoringWeights; targeting: TargetingSettings; retentionMonths: number };

/** Saves one section of the settings and records who changed it. API keys are never stored here. */
export async function updateResearchSettings(actor: CurrentUser, patch: ResearchSettingsPatch): Promise<void> {
  await connectDb();
  const set: Record<string, unknown> = { updatedBy: actor.id };
  let keys: string[];
  if (patch.section === "budget") {
    set["budget.monthlyCapUsd"] = patch.monthlyCapUsd;
    set["budget.perSearchCapUsd"] = patch.perSearchCapUsd;
    set.providerOrder = patch.providerOrder;
    keys = ["monthlyCapUsd", "perSearchCapUsd", "providerOrder"];
  } else if (patch.section === "provider") {
    set[`providers.${patch.provider}`] = patch.value;
    keys = [patch.provider];
  } else if (patch.section === "prices") {
    set.prices = patch.prices;
    set.searchPricePer1000 = patch.searchPricePer1000;
    keys = ["prices", "searchPricePer1000"];
  } else if (patch.section === "crawl") {
    set.crawl = patch.crawl;
    set.placesMonthlyLimit = patch.placesMonthlyLimit;
    keys = ["crawl", "placesMonthlyLimit"];
  } else {
    set.scoring = patch.scoring;
    set.targeting = patch.targeting;
    set.retentionMonths = patch.retentionMonths;
    keys = ["scoring", "targeting", "retentionMonths"];
  }
  await LeadResearchSettings.updateOne({ key: KEY }, { $set: set, $setOnInsert: { key: KEY } }, { upsert: true });
  await recordAudit({ actor, action: "lead_research.settings.update", entityType: "LeadResearchSettings", entityId: patch.section, metadata: { keys } });
}
