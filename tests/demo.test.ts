import { describe, expect, it } from "@jest/globals";
import { buildDemoDataset } from "../supabase/functions/_shared/demo";
import { validateNormalized } from "../supabase/functions/_shared/finance";

describe("demo dataset", () => {
  it("contains 40–60 synthetic transactions", () => {
    const { transactions } = buildDemoDataset(Date.parse("2026-09-23T12:00:00Z"));
    expect(transactions.length).toBeGreaterThanOrEqual(40);
    expect(transactions.length).toBeLessThanOrEqual(60);
  });

  it("has unique, stable provider ids and valid rows", () => {
    const first = buildDemoDataset(Date.parse("2026-09-23T12:00:00Z"));
    const second = buildDemoDataset(Date.parse("2026-09-23T12:00:00Z"));
    const ids = first.transactions.map((t) => t.providerTransactionId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(second.transactions.map((t) => t.providerTransactionId)).toEqual(ids);
    for (const t of first.transactions) {
      expect(validateNormalized(t)).toEqual([]);
    }
  });

  it("includes the ₦50,000 internal transfer pair", () => {
    const { transactions } = buildDemoDataset(Date.parse("2026-09-23T12:00:00Z"));
    const out = transactions.find(
      (t) => t.accountKey === "uba" && t.direction === "debit" && t.amountMinor === 5000000,
    );
    const back = transactions.find(
      (t) => t.accountKey === "gtb" && t.direction === "credit" && t.amountMinor === 5000000,
    );
    expect(out).toBeDefined();
    expect(back).toBeDefined();
    expect(out!.occurredAt.slice(0, 10)).toBe(back!.occurredAt.slice(0, 10));
  });

  it("mixes expenses, income, and refunds", () => {
    const { transactions } = buildDemoDataset(Date.parse("2026-09-23T12:00:00Z"));
    const types = new Set(transactions.map((t) => t.semanticType));
    expect(types.has("expense")).toBe(true);
    expect(types.has("income")).toBe(true);
    expect(types.has("refund")).toBe(true);
  });
});
