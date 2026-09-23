import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  categorySpend,
  forecastSpend,
  formatMinor,
  periodSpend,
  remainingBudget,
} from "../supabase/functions/_shared/finance";
import {
  getCategories,
  getCurrentMonthBudget,
  getTransactions,
  type Budget,
  type BudgetCap,
  type Category,
  type Transaction,
} from "../src/lib/db";

export default function BudgetScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [spent, setSpent] = useState(0);
  const [forecast, setForecast] = useState<number | null>(null);
  const [caps, setCaps] = useState<{ label: string; spent: number; limit: number }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const applyBudgetData = useCallback(
    (
      budget: Budget | null,
      capRows: BudgetCap[],
      txns: Transaction[],
      cats: Category[],
    ) => {
      setCategories(cats);
      if (!budget) {
        setLimit(null);
        return;
      }
      const startMs = Date.parse(budget.period_start);
      const endMs = Date.parse(budget.period_end);
      const rows = txns.map((t) => ({
        semanticType: t.semantic_type as
          | "income"
          | "expense"
          | "external_transfer"
          | "internal_transfer"
          | "refund"
          | "unknown",
        categoryId: t.transaction_reviews[0]?.category_id ?? undefined,
        amountMinor: t.amount_minor,
        occurredAtMs: Date.parse(t.occurred_at),
        budgetEligible: t.budget_eligible,
      }));
      const spend = periodSpend(rows, startMs, endMs);
      setSpent(spend.netMinor);
      setForecast(forecastSpend(spend.netMinor, startMs, endMs, Date.now()));
      setLimit(budget.total_limit_minor);
      const labelById = new Map(cats.map((c) => [c.id, c.label]));
      setCaps(
        capRows.map((c) => ({
          label: labelById.get(c.category_id) ?? c.category_id,
          spent: Math.max(categorySpend(rows, c.category_id, startMs, endMs), 0),
          limit: c.limit_minor,
        })),
      );
    },
    [],
  );

  const fetchData = useCallback(async () => {
    const [{ budget, caps: capRows }, txns, cats] = await Promise.all([
      getCurrentMonthBudget(),
      getTransactions(500),
      getCategories(),
    ]);
    return { budget, capRows, txns, cats };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { budget, capRows, txns, cats } = await fetchData();
      applyBudgetData(budget, capRows, txns, cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load budget.");
    } finally {
      setLoading(false);
    }
  }, [fetchData, applyBudgetData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { budget, capRows, txns, cats } = await fetchData();
        if (!active) return;
        applyBudgetData(budget, capRows, txns, cats);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load budget.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData, applyBudgetData]);

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View>
        <Text>{error}</Text>
        <Text onPress={refresh}>Retry</Text>
      </View>
    );
  }
  if (limit === null) {
    return (
      <View>
        <Text>Budget (Demo)</Text>
        <Text>No budget for this month yet.</Text>
        <Link href="/budget-setup">Set up budget</Link>
        <Link href="/home">Back home</Link>
      </View>
    );
  }

  void categories;
  return (
    <View>
      <Text>Budget (Demo)</Text>
      <Text>Spent: {formatMinor(Math.max(spent, 0), "NGN")}</Text>
      <Text>
        Remaining: {formatMinor(remainingBudget(limit, spent), "NGN")}
      </Text>
      <Text>
        Forecast:{" "}
        {forecast === null
          ? "Not enough data yet this month."
          : formatMinor(forecast, "NGN")}
      </Text>
      <Text>Category caps:</Text>
      {caps.length === 0 ? <Text>No category caps set.</Text> : null}
      {caps.map((c) => (
        <Text key={c.label}>
          {c.label}: {formatMinor(c.spent, "NGN")} of {formatMinor(c.limit, "NGN")}
        </Text>
      ))}
      <Link href="/budget-setup">Edit budget</Link>
      <Link href="/home">Back home</Link>
    </View>
  );
}
