import { describe, expect, it } from "@jest/globals";
import {
  countMatchingConfirmations,
  flagAmbiguousTransfers,
  shouldCreateRule,
  type TransferCandidate,
} from "../supabase/functions/_shared/finance";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-09-10T10:00:00Z");

function cand(partial: Partial<TransferCandidate> & { id: string }): TransferCandidate {
  return {
    bankAccountId: "a",
    direction: "debit",
    amountMinor: 5000000,
    occurredAtMs: T0,
    semanticType: "expense",
    ...partial,
  };
}

describe("learned merchant rules", () => {
  it("counts matching confirmations", () => {
    const reviews = [
      { merchantKey: "bolt trip", categoryId: "transport" },
      { merchantKey: "bolt trip", categoryId: "transport" },
      { merchantKey: "bolt trip", categoryId: "food" },
    ];
    expect(countMatchingConfirmations(reviews, "bolt trip", "transport")).toBe(2);
    expect(countMatchingConfirmations(reviews, "bolt trip", "food")).toBe(1);
    expect(countMatchingConfirmations(reviews, "shoprite", "food")).toBe(0);
  });

  it("creates a rule on the second confirmation", () => {
    expect(shouldCreateRule(0)).toBe(false);
    expect(shouldCreateRule(1)).toBe(false);
    expect(shouldCreateRule(2)).toBe(true);
    expect(shouldCreateRule(5)).toBe(true);
  });
});

describe("ambiguous transfer flags", () => {
  it("flags near-miss amounts within the window", () => {
    const flags = flagAmbiguousTransfers([
      cand({ id: "d1", bankAccountId: "uba", direction: "debit", amountMinor: 5000000 }),
      cand({ id: "c1", bankAccountId: "gtb", direction: "credit", amountMinor: 5050000 }),
    ]);
    expect(flags.map((f) => f.id).sort()).toEqual(["c1", "d1"]);
    expect(flags[0].reason).toMatch(/differs slightly/);
  });

  it("flags equal amounts outside the high-confidence window", () => {
    const flags = flagAmbiguousTransfers([
      cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
      cand({
        id: "c1",
        bankAccountId: "gtb",
        direction: "credit",
        occurredAtMs: T0 + 4 * DAY,
      }),
    ]);
    expect(flags.map((f) => f.id).sort()).toEqual(["c1", "d1"]);
    expect(flags[0].reason).toMatch(/dates differ/);
  });

  it("does not flag exact high-confidence pairs or unrelated rows", () => {
    expect(
      flagAmbiguousTransfers([
        cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
        cand({ id: "c1", bankAccountId: "gtb", direction: "credit" }),
      ]),
    ).toHaveLength(0);
    expect(
      flagAmbiguousTransfers([
        cand({ id: "d1", bankAccountId: "uba", direction: "debit", amountMinor: 100 }),
        cand({ id: "c1", bankAccountId: "gtb", direction: "credit", amountMinor: 999999 }),
      ]),
    ).toHaveLength(0);
    expect(
      flagAmbiguousTransfers([
        cand({ id: "d1", bankAccountId: "uba", direction: "debit" }),
        cand({ id: "c1", bankAccountId: "uba", direction: "credit" }),
      ]),
    ).toHaveLength(0);
  });
});
