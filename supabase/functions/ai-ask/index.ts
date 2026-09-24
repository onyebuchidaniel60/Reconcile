// POST /functions/v1/ai-ask
// Deterministic Ask Reconcile: fixed question patterns answered from
// read-only tools. Ownership always resolves from the session user.
// No arbitrary SQL, no LLM, no external API calls.
import {
  classifyQuestion,
  formatBudgetAnswer,
  formatCompareAnswer,
  formatSpendAnswer,
  UNSUPPORTED_ANSWER,
  type AskMerchant,
} from "../_shared/ask.ts";
import { requireUser } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";
import { periodSpend, categorySpend, type SpendRow } from "../_shared/finance.ts";

function monthBounds(nowMs: number): {
  curStart: number;
  curEnd: number;
  prevStart: number;
  prevEnd: number;
} {
  const now = new Date(nowMs);
  const curStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  return { curStart, curEnd: nowMs, prevStart, prevEnd: curStart };
}

function periodRange(
  period: "this_month" | "last_month",
  bounds: { curStart: number; curEnd: number; prevStart: number; prevEnd: number },
): { start: number; end: number; label: string } {
  if (period === "last_month") {
    return { start: bounds.prevStart, end: bounds.prevEnd, label: "last month" };
  }
  return { start: bounds.curStart, end: bounds.curEnd, label: "this month" };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return preflight();
  }
  if (req.method !== "POST") {
    return errResponse(405, "METHOD_NOT_ALLOWED", "Use POST.", false);
  }
  const authed = await requireUser(req);
  if (authed instanceof Response) return authed;
  const { client, userId } = authed;

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return errResponse(400, "INVALID_INPUT", "Request body must be JSON.", false);
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return errResponse(400, "INVALID_INPUT", "Ask a question first.", false);
  }

  const { data: categories } = await client
    .from("categories")
    .select("id,label");
  const { data: ledger } = await client
    .from("transactions")
    .select(
      "id,semantic_type,amount_minor,occurred_at,budget_eligible,normalized_merchant,merchant_name",
    )
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(500);
  const rows: (SpendRow & { id: string })[] = (ledger ?? []).map((t) => ({
    id: t.id,
    semanticType: t.semantic_type,
    amountMinor: t.amount_minor,
    occurredAtMs: Date.parse(t.occurred_at),
    budgetEligible: t.budget_eligible,
    merchantKey: t.normalized_merchant ?? undefined,
    merchantName: t.merchant_name ?? undefined,
  }));

  const merchantMap = new Map<string, string>();
  for (const r of rows) {
    if (r.merchantKey && !merchantMap.has(r.merchantKey)) {
      merchantMap.set(r.merchantKey, r.merchantName ?? r.merchantKey);
    }
  }
  const merchants: AskMerchant[] = [...merchantMap.entries()].map(([key, name]) => ({
    key,
    name,
  }));

  const classified = classifyQuestion(
    question,
    { categories: categories ?? [], merchants },
  );
  const bounds = monthBounds(Date.now());

  if (classified.intent === "unsupported") {
    return json({ ...UNSUPPORTED_ANSWER, intent: classified.intent });
  }

  if (classified.intent === "budget_status") {
    const startDate = new Date(bounds.curStart);
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: budget } = await client
      .from("budgets")
      .select("total_limit_minor,currency")
      .eq("user_id", userId)
      .eq("period_type", "monthly")
      .eq("period_start", start)
      .maybeSingle();
    if (!budget) {
      return json({ ...formatBudgetAnswer({ hasBudget: false }), intent: classified.intent });
    }
    const spend = periodSpend(rows, bounds.curStart, bounds.curEnd);
    return json({
      ...formatBudgetAnswer({
        hasBudget: true,
        limitMinor: budget.total_limit_minor,
        netMinor: spend.netMinor,
        currency: budget.currency,
      }),
      intent: classified.intent,
    });
  }

  if (classified.intent === "compare_periods") {
    const cur = periodSpend(rows, bounds.curStart, bounds.curEnd);
    const prev = periodSpend(rows, bounds.prevStart, bounds.prevEnd);
    return json({
      ...formatCompareAnswer({
        currentMinor: cur.netMinor,
        previousMinor: prev.netMinor,
        currency: "NGN",
      }),
      intent: classified.intent,
    });
  }

  const range = periodRange(classified.period, bounds);
  if (classified.intent === "category_spend" && classified.categoryId) {
    const { data: reviews } = await client
      .from("transaction_reviews")
      .select("transaction_id,category_id")
      .eq("user_id", userId);
    const categoryByTxn = new Map(
      (reviews ?? []).map((r) => [r.transaction_id, r.category_id] as const),
    );
    const withCategory = rows.map((r) => ({
      ...r,
      categoryId: categoryByTxn.get(r.id) ?? undefined,
    }));
    const total = categorySpend(withCategory, classified.categoryId, range.start, range.end);
    return json({
      ...formatSpendAnswer({
        amountMinor: total,
        currency: "NGN",
        periodLabel: range.label,
        scopeLabel: classified.categoryLabel ?? classified.categoryId,
      }),
      intent: classified.intent,
    });
  }

  if (classified.intent === "merchant_spend" && classified.merchantKey) {
    const scoped = rows.filter((r) => r.merchantKey === classified.merchantKey);
    const spend = periodSpend(scoped, range.start, range.end);
    return json({
      ...formatSpendAnswer({
        amountMinor: spend.netMinor,
        currency: "NGN",
        periodLabel: range.label,
        scopeLabel: classified.merchantName ?? classified.merchantKey,
      }),
      intent: classified.intent,
    });
  }

  const rangeDefault = periodRange(classified.period, bounds);
  const spend = periodSpend(rows, rangeDefault.start, rangeDefault.end);
  return json({
    ...formatSpendAnswer({
      amountMinor: spend.netMinor,
      currency: "NGN",
      periodLabel: rangeDefault.label,
      scopeLabel: "all spending",
    }),
    intent: classified.intent,
  });
});
