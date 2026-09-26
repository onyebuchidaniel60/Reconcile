import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import {
  biggestCategoryChange,
  formatMinor,
  hasHistory,
  periodSpend,
  topMerchant,
} from "../supabase/functions/_shared/finance";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { InsightCard, type DeltaDirection } from "../src/components/organisms/InsightCard";
import { LoadingState } from "../src/components/LoadingState";
import { PillNav } from "../src/components/PillNav";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { Text } from "../src/components/Text";
import {
  getCategories,
  getTransactions,
  type Category,
  type Transaction,
} from "../src/lib/db";
import { spacing } from "../src/theme/spacing";

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

type Semantic = "income" | "expense" | "external_transfer" | "internal_transfer" | "refund" | "unknown";

function deltaOf(current: number, previous: number): { delta: number; direction: DeltaDirection } {
  if (previous <= 0) {
    return { delta: current > 0 ? 100 : 0, direction: current > previous ? "up" : "flat" };
  }
  const pct = Math.round((Math.abs(current - previous) / previous) * 100);
  if (current === previous) return { delta: 0, direction: "flat" };
  return { delta: pct, direction: current > previous ? "up" : "down" };
}

export default function InsightsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    const [rows, cats] = await Promise.all([getTransactions(500), getCategories()]);
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
      <ScreenScaffold titleFirst="This" titleSecond="Month" testID="insights">
        <LoadingState variant="card-hero" testID="insights-loading" />
      </ScreenScaffold>
    );
  }

  if (error) {
    return (
      <ScreenScaffold titleFirst="This" titleSecond="Month" testID="insights">
        <ErrorState message={error} onRetry={refresh} testID="insights-error" />
      </ScreenScaffold>
    );
  }

  const rows = txns.map((t) => ({
    semanticType: t.semantic_type as Semantic,
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
  const fresh = !hasHistory(rows, prev.start, prev.end);

  const curSpend = periodSpend(rows, cur.start, cur.end);
  const prevSpend = periodSpend(rows, prev.start, prev.end);
  const curNet = Math.max(curSpend.netMinor, 0);
  const prevNet = Math.max(prevSpend.netMinor, 0);
  const monthDelta = deltaOf(curNet, prevNet);
  const change = biggestCategoryChange(rows, cur.start, cur.end, prev.start, prev.end);
  const top = topMerchant(rows, cur.start, cur.end);

  return (
    <ScreenScaffold titleFirst="This" titleSecond="Month" scroll={false} testID="insights">
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {fresh ? (
            <Card variant="paper" testID="insights-first-month">
              <Text role="body" color="ink">
                Insights arrive after your first month.
              </Text>
            </Card>
          ) : (
            <View>
              <InsightCard
                label="This month vs last month"
                primary={curNet}
                secondary={prevNet}
                delta={monthDelta.delta}
                deltaDirection={monthDelta.direction}
                explanation={`Spending is ${monthDelta.direction === "flat" ? "unchanged" : `${monthDelta.direction} ${monthDelta.delta}%`} versus last month.`}
                currency="NGN"
                surface="yellow"
                testID="insights-month"
              />
              {change ? (
                <View style={{ marginTop: spacing.md }}>
                  <InsightCard
                    label="Biggest category change"
                    primary={change.currentMinor}
                    secondary={change.previousMinor}
                    delta={deltaOf(change.currentMinor, change.previousMinor).delta}
                    deltaDirection={deltaOf(change.currentMinor, change.previousMinor).direction}
                    explanation={`${labelById.get(change.categoryId) ?? change.categoryId} moved from ${formatMinor(change.previousMinor, "NGN")} to ${formatMinor(change.currentMinor, "NGN")}.`}
                    currency="NGN"
                    surface="ink"
                    starburst
                    testID="insights-change"
                  />
                </View>
              ) : null}
              {top && curNet > 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <InsightCard
                    label="Top merchant"
                    primary={top.totalMinor}
                    secondary={curNet}
                    delta={Math.round((top.totalMinor / curNet) * 100)}
                    deltaDirection="flat"
                    explanation={`${top.name} is your top merchant at ${formatMinor(top.totalMinor, "NGN")} this month.`}
                    currency="NGN"
                    testID="insights-merchant"
                  />
                </View>
              ) : null}
            </View>
          )}
          {txns.length === 0 && fresh ? (
            <EmptyState
              message="No transactions yet. Insights need data first."
              testID="insights-empty"
            />
          ) : null}
          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Ask Reconcile"
              variant="ghost"
              onPress={() => router.push("/ask")}
              testID="insights-ask"
            />
          </View>
          <Link
            href="/home"
            testID="insights-home"
            style={{ paddingVertical: spacing.lg }}
          >
            <Text role="small" color="ink" style={{ opacity: 0.7, marginTop: spacing.sm }}>
              Back home
            </Text>
          </Link>
        </View>
        <PillNav
          active="insights"
          onNavigate={(route) => router.push(PILL_ROUTES[route])}
          testID="insights-pill"
        />
      </View>
    </ScreenScaffold>
  );
}
