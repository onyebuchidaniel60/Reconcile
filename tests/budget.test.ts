import { describe, expect, it } from "@jest/globals";
import {
  asEmbedArray,
  categorySpend,
  forecastSpend,
  periodSpend,
  remainingBudget,
  type SpendRow,
} from "../supabase/functions/_shared/finance";
import {
  getMonthlySpend,
  monthBoundsFor,
  monthFromIso,
  monthOffset,
  recentMonths,
} from "../src/lib/txn";
import type { Transaction } from "../src/lib/db";

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

// ---------------------------------------------------------------------------
// Phase 10B.5, Fix A: the ONE definition of "money spent this month" that
// both Home and Budget now call. The Budget engine's reading (net of
// refunds) is the correct one, so these tests pin that behaviour.
// ---------------------------------------------------------------------------

const SEPT = new Date(2026, 8, 15); // any date inside the wanted month
const AUG = new Date(2026, 7, 15);

function t(
  partial: Partial<Transaction> & { amount_minor: number },
): Transaction {
  return {
    id: `t-${partial.amount_minor}`,
    bank_account_id: "a1",
    currency: "NGN",
    direction: "debit",
    semantic_type: "expense",
    occurred_at: "2026-09-14T10:00:00.000Z",
    merchant_name: "Bolt",
    narration: "Bolt trip",
    normalized_merchant: "bolt",
    budget_eligible: true,
    ...partial,
  } as Transaction;
}

describe("getMonthlySpend (Phase 10B.5, Fix A)", () => {
  it("nets expenses, income and refunds over the calendar month", () => {
    const spend = getMonthlySpend(
      [
        // Expenses in the month.
        t({ amount_minor: 100000 }),
        t({ amount_minor: 250000, semantic_type: "expense", occurred_at: "2026-09-20T10:00:00.000Z" }),
        // A refund reduces spend.
        t({ amount_minor: 30000, semantic_type: "refund", direction: "credit" }),
        // Income is reported separately and never reduced by refunds.
        t({ amount_minor: 45000000, semantic_type: "income", direction: "credit", budget_eligible: false }),
        // Internal transfers are never spend (no double count).
        t({ amount_minor: 5000000, semantic_type: "internal_transfer" }),
        // The paired credit leg of the same transfer, also excluded.
        t({ amount_minor: 5000000, semantic_type: "external_transfer", direction: "credit" }),
        // Outside the month entirely.
        t({ amount_minor: 999999, occurred_at: "2026-08-14T10:00:00.000Z" }),
      ],
      SEPT,
    );
    expect(spend.expenseMinor).toBe(350000);
    expect(spend.refundMinor).toBe(30000);
    // The figure Home "Expenses" and Budget "Spent" must now both show.
    expect(spend.netMinor).toBe(320000);
    expect(spend.incomeMinor).toBe(45000000);
  });

  it("excludes budget-ineligible rows from spend but keeps their income", () => {
    const spend = getMonthlySpend(
      [
        t({ amount_minor: 100000, budget_eligible: false, semantic_type: "expense" }),
        t({ amount_minor: 70000, budget_eligible: true }),
        t({ amount_minor: 5000000, budget_eligible: false, semantic_type: "income", direction: "credit" }),
      ],
      SEPT,
    );
    expect(spend.netMinor).toBe(70000);
    expect(spend.incomeMinor).toBe(5000000);
  });

  it("never returns a negative net when refunds exceed expenses", () => {
    const spend = getMonthlySpend(
      [
        t({ amount_minor: 10000 }),
        t({ amount_minor: 90000, semantic_type: "refund", direction: "credit" }),
      ],
      SEPT,
    );
    expect(spend.netMinor).toBe(0);
    expect(spend.refundMinor).toBe(90000);
  });

  it("reads only the requested month, using LOCAL calendar boundaries", () => {
    // The window is a local calendar month, matching what the screen labels
    // show. Built from local dates so the test is honest in any timezone
    // rather than encoding a UTC assumption.
    const local = (y: number, m: number, d: number, h: number): string =>
      new Date(y, m, d, h, 0, 0).toISOString();
    const rows = [
      t({ amount_minor: 111, occurred_at: local(2026, 7, 31, 23) }),
      t({ amount_minor: 222, occurred_at: local(2026, 8, 1, 0) }),
      t({ amount_minor: 333, occurred_at: local(2026, 8, 30, 12) }),
      t({ amount_minor: 444, occurred_at: local(2026, 9, 1, 0) }),
    ];
    expect(getMonthlySpend(rows, AUG).netMinor).toBe(111);
    expect(getMonthlySpend(rows, SEPT).netMinor).toBe(555);
  });

  it("matches the Budget engine exactly for the same window (parity)", () => {
    // The whole point of Fix A: one definition. Same rows through the old
    // engine helper and the new shared helper must agree.
    const rows: SpendRow[] = [
      { semanticType: "expense", amountMinor: 120000, occurredAtMs: Date.parse("2026-09-03T10:00:00Z"), budgetEligible: true },
      { semanticType: "expense", amountMinor: 80000, occurredAtMs: Date.parse("2026-09-11T10:00:00Z"), budgetEligible: true },
      { semanticType: "refund", amountMinor: 20000, occurredAtMs: Date.parse("2026-09-12T10:00:00Z"), budgetEligible: true },
      { semanticType: "expense", amountMinor: 500000, occurredAtMs: Date.parse("2026-09-13T10:00:00Z"), budgetEligible: false },
    ];
    const { startMs, endMs } = monthBoundsFor(SEPT);
    const engine = periodSpend(rows, startMs, endMs);
    const shared = getMonthlySpend(
      rows.map((r) => ({
        amount_minor: r.amountMinor,
        semantic_type: r.semanticType,
        budget_eligible: r.budgetEligible,
        occurred_at: new Date(r.occurredAtMs).toISOString(),
      })) as unknown as Transaction[],
      SEPT,
    );
    expect(shared.netMinor).toBe(engine.netMinor);
    expect(shared.expenseMinor).toBe(engine.expenseMinor);
    expect(shared.refundMinor).toBe(engine.refundMinor);
  });
});

describe("month helpers (Phase 10B.5, Fix B)", () => {
  it("monthBoundsFor returns a half-open local calendar month", () => {
    const { startMs, endMs } = monthBoundsFor(SEPT);
    const start = new Date(startMs);
    const end = new Date(endMs);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(8);
    expect(end.getMonth()).toBe(9);
    expect(end.getDate()).toBe(1);
  });

  it("monthOffset walks back whole calendar months", () => {
    expect(monthOffset(new Date(2026, 0, 15), 1).getMonth()).toBe(11);
    expect(monthOffset(new Date(2026, 0, 15), 1).getFullYear()).toBe(2025);
    expect(monthOffset(SEPT, 0).getMonth()).toBe(8);
    expect(monthOffset(new Date(2026, 2, 31), 1).getMonth()).toBe(1);
  });

  it("recentMonths returns the requested count, newest first", () => {
    const months = recentMonths(new Date(2026, 8, 30), 6);
    expect(months).toHaveLength(6);
    expect(months[0].getMonth()).toBe(8);
    expect(months[1].getMonth()).toBe(7);
    expect(months[5].getMonth()).toBe(3);
  });

  it("monthFromIso reads year and month without UTC drift", () => {
    const d = monthFromIso("2026-09-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(1);
  });
});
