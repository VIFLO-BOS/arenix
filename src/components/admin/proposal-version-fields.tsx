import { FieldLabel, FormRow, inputClass } from "./ui";

type VersionLike = {
  summary?: string;
  scope?: string;
  deliverables?: string[];
  lineItems?: { label: string; quantity: number; unitAmount: number; description?: string }[];
  currency?: string;
  taxRatePercent?: number;
  validUntil?: Date | string;
  notes?: string;
};

/** Shared fields for creating a proposal or adding a new version. */
export function ProposalVersionFields({ version }: { version?: VersionLike }) {
  const lines = (version?.lineItems ?? []).map((li) => [li.label, li.quantity, li.unitAmount, li.description ?? ""].join(" | ")).join("\n");
  const valid = version?.validUntil ? new Date(version.validUntil).toISOString().slice(0, 10) : "";
  return (
    <>
      <FormRow>
        <FieldLabel htmlFor="p-summary">Summary</FieldLabel>
        <textarea id="p-summary" name="summary" rows={3} defaultValue={version?.summary ?? ""} className={inputClass} />
      </FormRow>
      <FormRow>
        <FieldLabel htmlFor="p-scope" hint="(markdown allowed)">
          Scope
        </FieldLabel>
        <textarea id="p-scope" name="scope" rows={6} defaultValue={version?.scope ?? ""} className={inputClass} />
      </FormRow>
      <FormRow>
        <FieldLabel htmlFor="p-deliverables" hint="(one per line)">
          Deliverables
        </FieldLabel>
        <textarea id="p-deliverables" name="deliverables" rows={4} defaultValue={(version?.deliverables ?? []).join("\n")} className={inputClass} />
      </FormRow>
      <FormRow>
        <FieldLabel htmlFor="p-items" hint="(one per line Label | qty | unit amount | description)">
          Line items
        </FieldLabel>
        <textarea id="p-items" name="lineItems" rows={5} defaultValue={lines} className={`${inputClass} font-mono text-xs`} placeholder={"Discovery workshop | 1 | 250000 | Two sessions\nWebsite build | 1 | 1800000"} />
      </FormRow>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormRow>
          <FieldLabel htmlFor="p-currency">Currency</FieldLabel>
          <input id="p-currency" name="currency" defaultValue={version?.currency ?? "NGN"} maxLength={3} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="p-tax">Tax rate %</FieldLabel>
          <input id="p-tax" name="taxRatePercent" type="number" min={0} max={100} step="0.5" defaultValue={version?.taxRatePercent ?? 0} className={inputClass} />
        </FormRow>
        <FormRow>
          <FieldLabel htmlFor="p-valid">Valid until</FieldLabel>
          <input id="p-valid" name="validUntil" type="date" defaultValue={valid} className={inputClass} />
        </FormRow>
      </div>
      <FormRow>
        <FieldLabel htmlFor="p-notes" hint="(internal)">
          Notes
        </FieldLabel>
        <textarea id="p-notes" name="notes" rows={2} defaultValue={version?.notes ?? ""} className={inputClass} />
      </FormRow>
    </>
  );
}
