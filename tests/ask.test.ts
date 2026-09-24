import { describe, expect, it } from "@jest/globals";
import {
  classifyQuestion,
  formatBudgetAnswer,
  formatCompareAnswer,
  formatSpendAnswer,
  UNSUPPORTED_ANSWER,
  type AskContext,
} from "../supabase/functions/_shared/ask";

const CTX: AskContext = {
  categories: [
    { id: "food", label: "Food" },
    { id: "transport", label: "Transport" },
  ],
  merchants: [
    { key: "bolt trip", name: "Bolt Trip" },
    { key: "shoprite", name: "Shoprite" },
  ],
};

describe("ask classifier", () => {
  it("routes supported patterns", () => {
    expect(classifyQuestion("How much did I spend this month?", CTX).intent).toBe(
      "spend_summary",
    );
    expect(classifyQuestion("How much did I spend last month?", CTX)).toEqual(
      expect.objectContaining({ intent: "spend_summary", period: "last_month" }),
    );
    expect(classifyQuestion("How much did I spend on food?", CTX)).toEqual(
      expect.objectContaining({ intent: "category_spend", categoryId: "food" }),
    );
    expect(classifyQuestion("How much did I spend at Shoprite?", CTX)).toEqual(
      expect.objectContaining({ intent: "merchant_spend", merchantKey: "shoprite" }),
    );
    expect(
      classifyQuestion("Did I spend more than last month?", CTX).intent,
    ).toBe("compare_periods");
    expect(classifyQuestion("Am I on budget?", CTX).intent).toBe("budget_status");
  });

  it("rejects unsupported questions", () => {
    expect(classifyQuestion("What is the weather?", CTX).intent).toBe("unsupported");
    expect(classifyQuestion("Move my money around", CTX).intent).toBe("unsupported");
    expect(UNSUPPORTED_ANSWER.answer).toMatch(/can't answer that yet/);
  });

  it("avoids substring false positives", () => {
    // "another" contains "other"-like fragments; unknown words stay unsupported.
    expect(classifyQuestion("Tell me another story", CTX).intent).toBe("unsupported");
  });
});

describe("ask answer formatting", () => {
  it("formats spend answers with a basis line", () => {
    const out = formatSpendAnswer({
      amountMinor: 150000,
      currency: "NGN",
      periodLabel: "this month",
      scopeLabel: "all spending",
    });
    expect(out.answer).toContain("₦1,500.00");
    expect(out.basis).toMatch(/^based on: /);
  });

  it("formats comparisons with direction", () => {
    const up = formatCompareAnswer({ currentMinor: 200000, previousMinor: 100000, currency: "NGN" });
    expect(up.answer).toMatch(/more/);
    const same = formatCompareAnswer({ currentMinor: 100000, previousMinor: 100000, currency: "NGN" });
    expect(same.answer).toMatch(/the same/);
  });

  it("formats budget states", () => {
    const none = formatBudgetAnswer({ hasBudget: false });
    expect(none.answer).toMatch(/no budget/i);
    const ok = formatBudgetAnswer({
      hasBudget: true,
      limitMinor: 200000,
      netMinor: 50000,
      currency: "NGN",
    });
    expect(ok.answer).toMatch(/within budget/);
    const over = formatBudgetAnswer({
      hasBudget: true,
      limitMinor: 200000,
      netMinor: 250000,
      currency: "NGN",
    });
    expect(over.answer).toMatch(/over budget/);
  });
});
