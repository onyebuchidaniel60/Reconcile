import { describe, expect, it } from "@jest/globals";
import {
  asEmbedArray,
  categorySpend,
  forecastSpend,
  periodSpend,
  remainingBudget,
  type SpendRow,
} from "../supabase/functions/_shared/finance";

const START = Date.parse("2026-09-01T00:00:00Z");
const END = Date.parse("2026-10-01T00:00:00Z");
const MID = Date.parse("2026-09-15T12:00:00Z");

function row(
  partial: Partial<SpendRow> & { amountMinor: number },
): SpendRow {
  return {
    semanticType: "expense",
    budgetEligible: true,
    occurredAtMs: MID,
    ...partial,
  };
}

describe("budget math", () => {
  it("sums eligible expenses in the period", () => {
    const spend = periodSpend(
      [row({ amountMinor: 100000 }), row({ amountMinor: 250000 })],
      START,
      END,
    );
    expect(spend.expenseMinor).toBe(350000);
    expect(spend.netMinor).toBe(350000);
  });

  it("refunds reduce eligible spend", () => {
    const spend = periodSpend(
      [
        row({ amountMinor: 100000 }),
        row({ amountMinor: 30000, semanticType: "refund" }),
      ],
      START,
      END,
    );
    expect(spend.refundMinor).toBe(30000);
    expect(spend.netMinor).toBe(70000);
  });

  it("excludes ineligible rows and out-of-period rows", () => {
    const spend = periodSpend(
      [
        row({ amountMinor: 100000, budgetEligible: false }),
        row({ amountMinor: 200000, occurredAtMs: START - 1 }),
        row({ amountMinor: 300000, occurredAtMs: END }),
        row({ amountMinor: 40000, semanticType: "internal_transfer" }),
        row({ amountMinor: 50000, semanticType: "income" }),
        row({ amountMinor: 60000 }),
      ],
      START,
      END,
    );
    expect(spend.netMinor).toBe(60000);
  });

  it("computes remaining budget", () => {
    expect(remainingBudget(200000, 60000)).toBe(140000);
    expect(remainingBudget(200000, 250000)).toBe(-50000);
  });

  it("normalizes to-one embeds to arrays", () => {
    // PostgREST returns a unique embedded row as an object, not an array.
    expect(asEmbedArray(null)).toEqual([]);
    expect(asEmbedArray(undefined)).toEqual([]);
    expect(asEmbedArray([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(asEmbedArray({ a: 1 })).toEqual([{ a: 1 }]);
  });

  it("forecasts only with sufficient elapsed data", () => {
    // 10% elapsed → insufficient.
    expect(
      forecastSpend(10000, START, END, START + (END - START) * 0.1),
    ).toBeNull();
    // 50% elapsed → projection.
    expect(
      forecastSpend(10000, START, END, START + (END - START) * 0.5),
    ).toBe(20000);
    // Ended period → null.
    expect(forecastSpend(10000, START, END, END + 1)).toBeNull();
  });

  it("tracks category spend with refunds", () => {    const rows = [
      row({ amountMinor: 100000, categoryId: "food" }),
      row({ amountMinor: 20000, categoryId: "food", semanticType: "refund" }),
      row({ amountMinor: 50000, categoryId: "transport" }),
    ];
    expect(categorySpend(rows, "food", START, END)).toBe(80000);
    expect(categorySpend(rows, "transport", START, END)).toBe(50000);
    expect(categorySpend(rows, "bills", START, END)).toBe(0);
  });
});
