import { describe, expect, it } from "vitest";
import { proposalTotals } from "@/server/services/proposals";

describe("proposalTotals", () => {
  it("sums line items and applies tax", () => {
    const t = proposalTotals({ lineItems: [{ quantity: 2, unitAmount: 100000 }, { quantity: 1, unitAmount: 50000 }], taxRatePercent: 7.5 });
    expect(t.subtotal).toBe(250000);
    expect(t.tax).toBeCloseTo(18750);
    expect(t.total).toBeCloseTo(268750);
  });
  it("handles no items", () => {
    expect(proposalTotals({ lineItems: [] })).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});
