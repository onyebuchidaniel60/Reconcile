import { describe, expect, it } from "@jest/globals";
import {
  biggestCategoryChange,
  hasHistory,
  topMerchant,
  type SpendRow,
} from "../supabase/functions/_shared/finance";

const SEP = Date.parse("2026-09-01T00:00:00Z");
const OCT = Date.parse("2026-10-01T00:00:00Z");
const NOV = Date.parse("2026-11-01T00:00:00Z");

function row(partial: Partial<SpendRow> & { amountMinor: number }): SpendRow {
  return {
    semanticType: "expense",
    budgetEligible: true,
    occurredAtMs: SEP + 5 * 24 * 3600 * 1000,
    ...partial,
  };
}

describe("insights math", () => {
  it("finds the top merchant by period spend", () => {
    const rows = [
      row({ amountMinor: 100000, merchantKey: "shoprite", merchantName: "Shoprite" }),
      row({ amountMinor: 250000, merchantKey: "bolt trip", merchantName: "Bolt Trip" }),
      row({ amountMinor: 50000, merchantKey: "bolt trip", merchantName: "Bolt Trip" }),
      row({ amountMinor: 900000, merchantKey: "bolt trip", merchantName: "Bolt Trip", occurredAtMs: OCT + 1000 }),
    ];
    const top = topMerchant(rows, SEP, OCT);
    expect(top).toEqual({ key: "bolt trip", name: "Bolt Trip", totalMinor: 300000 });
    expect(topMerchant(rows, OCT, NOV)).toEqual({
      key: "bolt trip",
      name: "Bolt Trip",
      totalMinor: 900000,
    });
    expect(topMerchant([], SEP, OCT)).toBeNull();
  });

  it("finds the biggest category change", () => {
    const rows = [
      row({ amountMinor: 100000, categoryId: "food", occurredAtMs: SEP + 1000 }),
      row({ amountMinor: 400000, categoryId: "food", occurredAtMs: OCT + 1000 }),
      row({ amountMinor: 200000, categoryId: "transport", occurredAtMs: SEP + 1000 }),
      row({ amountMinor: 210000, categoryId: "transport", occurredAtMs: OCT + 1000 }),
    ];
    const change = biggestCategoryChange(rows, OCT, NOV, SEP, OCT);
    expect(change?.categoryId).toBe("food");
    expect(change?.deltaMinor).toBe(300000);
    expect(biggestCategoryChange([], OCT, NOV, SEP, OCT)).toBeNull();
  });

  it("detects insufficient history", () => {
    const rows = [row({ amountMinor: 100000, occurredAtMs: OCT + 1000 })];
    expect(hasHistory(rows, SEP, OCT)).toBe(false);
    expect(hasHistory(rows, OCT, NOV)).toBe(true);
    expect(hasHistory([], OCT, NOV)).toBe(false);
  });
});
