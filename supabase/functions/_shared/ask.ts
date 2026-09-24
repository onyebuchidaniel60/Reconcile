// Deterministic Ask Reconcile: fixed question patterns answered from
// read-only tools. No LLM, no arbitrary SQL, no external calls.
// Pure (imports finance only): unit-tested with jest, used by the ai-ask
// Edge Function and reusable on the client.
import { formatMinor } from "./finance.ts";

export type AskPeriod = "this_month" | "last_month";

export type AskIntent =
  | "spend_summary"
  | "category_spend"
  | "merchant_spend"
  | "compare_periods"
  | "budget_status"
  | "unsupported";

export interface AskCategory {
  id: string;
  label: string;
}

export interface AskMerchant {
  key: string;
  name: string;
}

export interface AskContext {
  categories: AskCategory[];
  merchants: AskMerchant[];
}

export interface ClassifiedAsk {
  intent: AskIntent;
  categoryId?: string;
  categoryLabel?: string;
  merchantKey?: string;
  merchantName?: string;
  period: AskPeriod;
}

export function detectPeriod(question: string): AskPeriod {
  return question.toLowerCase().includes("last month") ? "last_month" : "this_month";
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentions(question: string, phrase: string): boolean {
  const normalized = phrase.toLowerCase().replace(/_/g, " ").trim();
  if (normalized.length < 3) return false;
  return new RegExp(`\\b${escapeRegExp(normalized)}\\b`).test(question);
}

export function classifyQuestion(raw: string, ctx: AskContext): ClassifiedAsk {
  const q = raw.toLowerCase();
  const period = detectPeriod(q);
  if (/(budget|remaining|left to spend|on track|over budget)/.test(q)) {
    return { intent: "budget_status", period };
  }
  if (/(compar| versus | vs |more than last|less than last|changed|difference)/.test(q)) {
    return { intent: "compare_periods", period };
  }
  for (const category of ctx.categories) {
    if (mentions(q, category.label) || mentions(q, category.id)) {
      return {
        intent: "category_spend",
        categoryId: category.id,
        categoryLabel: category.label,
        period,
      };
    }
  }
  const hits = ctx.merchants.filter(
    (m) => mentions(q, m.key) || mentions(q, m.name),
  );
  if (hits.length > 0) {
    const best = hits.sort((a, b) => b.key.length - a.key.length)[0];
    return {
      intent: "merchant_spend",
      merchantKey: best.key,
      merchantName: best.name,
      period,
    };
  }
  if (/(spend|spent|total|how much)/.test(q)) {
    return { intent: "spend_summary", period };
  }
  return { intent: "unsupported", period };
}

export interface AskAnswer {
  answer: string;
  basis: string;
}

export interface SpendAnswerVars {
  amountMinor: number;
  currency: string;
  periodLabel: string;
  scopeLabel: string;
}

export function formatSpendAnswer(vars: SpendAnswerVars): AskAnswer {
  const amount = formatMinor(Math.max(vars.amountMinor, 0), vars.currency);
  return {
    answer: `You spent ${amount} on ${vars.scopeLabel} ${vars.periodLabel}.`,
    basis: `based on: ${vars.scopeLabel} spend, ${vars.periodLabel}`,
  };
}

export interface CompareAnswerVars {
  currentMinor: number;
  previousMinor: number;
  currency: string;
}

export function formatCompareAnswer(vars: CompareAnswerVars): AskAnswer {
  const current = formatMinor(Math.max(vars.currentMinor, 0), vars.currency);
  const previous = formatMinor(Math.max(vars.previousMinor, 0), vars.currency);
  const delta = vars.currentMinor - vars.previousMinor;
  const direction =
    delta > 0 ? "more" : delta < 0 ? "less" : "the same amount";
  const abs = formatMinor(Math.abs(delta), vars.currency);
  const sentence =
    delta === 0
      ? `You spent ${current} this month, the same as last month (${previous}).`
      : `You spent ${current} this month, ${abs} ${direction} than last month (${previous}).`;
  return {
    answer: `${sentence} Note: this month is still in progress.`,
    basis: "based on: this month vs last month net spend",
  };
}

export interface BudgetAnswerVars {
  hasBudget: boolean;
  limitMinor?: number;
  netMinor?: number;
  currency?: string;
}

export function formatBudgetAnswer(vars: BudgetAnswerVars): AskAnswer {
  if (
    !vars.hasBudget ||
    vars.limitMinor === undefined ||
    vars.netMinor === undefined ||
    !vars.currency
  ) {
    return {
      answer: "You have no budget for this month yet. Set one up to track it here.",
      basis: "based on: no current-month budget",
    };
  }
  const remaining = vars.limitMinor - vars.netMinor;
  const state = remaining >= 0 ? "within budget" : "over budget";
  return {
    answer:
      `You spent ${formatMinor(Math.max(vars.netMinor, 0), vars.currency)} of ` +
      `${formatMinor(vars.limitMinor, vars.currency)}. ` +
      `${formatMinor(remaining, vars.currency)} remaining — ${state}.`,
    basis: "based on: current-month budget vs eligible spend",
  };
}

export const UNSUPPORTED_ANSWER: AskAnswer = {
  answer:
    "I can't answer that yet. Try asking about monthly spend, a category, a merchant, a month comparison, or your budget.",
  basis: "based on: no supported pattern matched",
};
