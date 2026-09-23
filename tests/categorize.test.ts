import { describe, expect, it } from "@jest/globals";
import {
  categorize,
  normalizeMerchantName,
} from "../supabase/functions/_shared/finance";

describe("deterministic categorization", () => {
  it("prioritizes user rules, then patterns, then deterministic rules", () => {
    const base = {
      merchantKey: "bolt trip",
      normalizedMerchant: "bolt trip",
      narration: "Bolt trip ref 1",
    };
    expect(
      categorize({ ...base, userRuleCategoryId: "personal", priorPatternCategoryId: "food" }),
    ).toEqual({ categoryId: "personal", source: "user_rule" });
    expect(categorize({ ...base, priorPatternCategoryId: "food" })).toEqual({
      categoryId: "food",
      source: "pattern",
    });
    expect(categorize(base)).toEqual({ categoryId: "transport", source: "deterministic" });
  });

  it("covers common Nigerian merchants", () => {
    const cases: [string, string][] = [
      ["Shoprite groceries", "food"],
      ["MTN airtime", "bills"],
      ["DSTV subscription", "entertainment"],
      ["Jumia order", "shopping"],
      ["Medplus Pharmacy", "health"],
      ["Monthly salary payment", "income"],
      ["Jumia order refund", "refund"],
      ["Transfer to GTBank", "external_transfer"],
    ];
    for (const [raw, category] of cases) {
      const normalized = normalizeMerchantName(raw);
      expect(
        categorize({ merchantKey: normalized, normalizedMerchant: normalized, narration: raw })
          .categoryId,
      ).toBe(category);
    }
  });

  it("falls back to Other", () => {
    expect(
      categorize({
        merchantKey: "zzz unknown",
        normalizedMerchant: "zzz unknown",
        narration: "zzz unknown",
      }),
    ).toEqual({ categoryId: "other", source: "other" });
  });
});
