import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  biggestCategoryChange,
  formatMinor,
  hasHistory,
  periodSpend,
  topMerchant,
} from "../supabase/functions/_shared/finance";
import {
  getCategories,
  getTransactions,
  type Category,
  type Transaction,
} from "../src/lib/db";
import { PillNav } from "../src/components/PillNav";

const PILL_ROUTES = {
  home: "/home",
  activity: "/activity",
  budget: "/budget",
  insights: "/insights",
} as const;

function monthBounds(back: number): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1).getTime();
  const end =
    back === 0
      ? now.getTime()
      : new Date(now.getFullYear(), now.getMonth() - back + 1, 1).getTime();
  return { start, end };
}

export default function InsightsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    const [rows, cats] = await Promise.all([
      getTransactions(500),
      getCategories(),
    ]);
    return { rows, cats };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows, cats } = await fetchData();
      setTxns(rows);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load insights.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { rows, cats } = await fetchData();
        if (!active) return;
        setTxns(rows);
        setCategories(cats);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load insights.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

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
        <Link href="/home">Back home</Link>
      </View>
    );
  }

  const rows = txns.map((t) => ({
    semanticType: t.semantic_type as
      | "income"
      | "expense"
      | "external_transfer"
      | "internal_transfer"
      | "refund"
      | "unknown",
    categoryId: t.transaction_reviews[0]?.category_id ?? undefined,
    merchantKey: t.normalized_merchant ?? undefined,
    merchantName: t.merchant_name ?? undefined,
    amountMinor: t.amount_minor,
    occurredAtMs: Date.parse(t.occurred_at),
    budgetEligible: t.budget_eligible,
  }));
  const cur = monthBounds(0);
  const prev = monthBounds(1);
  const labelById = new Map(categories.map((c) => [c.id, c.label]));

  if (!hasHistory(rows, prev.start, prev.end)) {
    const curSpend = periodSpend(rows, cur.start, cur.end);
    return (
      <View>
        <Text>Insights (Demo)</Text>
        <Text>First month: not enough history for comparisons yet.</Text>
        <Text>
          Spent so far this month: {formatMinor(Math.max(curSpend.netMinor, 0), "NGN")}
        </Text>
        <Text>Demo data is synthetic.</Text>
        <Link href="/ask">Ask Reconcile</Link>
        <Link href="/home">Back home</Link>
      </View>
    );
  }

  const curSpend = periodSpend(rows, cur.start, cur.end);
  const prevSpend = periodSpend(rows, prev.start, prev.end);
  const change = biggestCategoryChange(rows, cur.start, cur.end, prev.start, prev.end);
  const top = topMerchant(rows, cur.start, cur.end);

  return (
    <View>
      <Text>Insights (Demo)</Text>
      <Text>Demo data is synthetic.</Text>
      <Text>
        This month: {formatMinor(Math.max(curSpend.netMinor, 0), "NGN")} · Last
        month: {formatMinor(Math.max(prevSpend.netMinor, 0), "NGN")}
      </Text>
      {change ? (
        <Text>
          Biggest change: {labelById.get(change.categoryId) ?? change.categoryId} (
          {formatMinor(change.previousMinor, "NGN")} →{" "}
          {formatMinor(change.currentMinor, "NGN")})
        </Text>
      ) : (
        <Text>No category changes to show.</Text>
      )}
      {top ? (
        <Text>
          Top merchant: {top.name} ({formatMinor(top.totalMinor, "NGN")})
        </Text>
      ) : (
        <Text>No merchant spending to show.</Text>
      )}
      <Link href="/ask">Ask Reconcile</Link>
      <Link href="/home">Back home</Link>
      <PillNav
        active="insights"
        onNavigate={(route) => router.push(PILL_ROUTES[route])}
        testID="insights-pill"
      />
    </View>
  );
}
