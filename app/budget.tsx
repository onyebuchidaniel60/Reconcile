import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { categorySpend, formatMinor, periodSpend } from "../supabase/functions/_shared/finance";
import { Button } from "../src/components/Button";
import { CategoryCircle } from "../src/components/CategoryCircle";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { ExpensesBarCard } from "../src/components/organisms/ExpensesBarCard";
import { LoadingState } from "../src/components/LoadingState";
import { PositiveMessageCard } from "../src/components/organisms/PositiveMessageCard";
import { PillNav } from "../src/components/PillNav";
import { ProgressBar } from "../src/components/ProgressBar";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { SpendTrendCard } from "../src/components/organisms/SpendTrendCard";
import { Text } from "../src/components/Text";
import type { BarDatum } from "../src/components/BarChart";
import {
  getCategories,
  getCurrentMonthBudget,
  getTransactions,
  type Budget,
  type BudgetCap,
  type Category,
  type Transaction,
} from "../src/lib/db";
import {
  formatBoundLabel,
  formatMonthAbbrev,
  monthSampleDays,
  tintForLabel,
} from "../src/lib/txn";
import { colors } from "../src/theme/colors";
import { radius } from "../src/theme/radius";
import { spacing } from "../src/theme/spacing";

/** Compact axis label: ₦124,000 → "₦124k". */
function formatCompact(amountMinor: number): string {
  const major = Math.round(amountMinor / 100);
  if (Math.abs(major) >= 1000) return `₦${Math.round(major / 1000)}k`;
  return `₦${major}`;
}

const PILL_ROUTES = {
  home: "/home",
  activity: "/activity",
  budget: "/budget",
  insights: "/insights",
} as const;

type Semantic = "income" | "expense" | "external_transfer" | "internal_transfer" | "refund" | "unknown";

function toRows(txns: Transaction[]) {
  return txns.map((t) => ({
    semanticType: t.semantic_type as Semantic,
    categoryId: t.transaction_reviews[0]?.category_id ?? undefined,
    amountMinor: t.amount_minor,
    occurredAtMs: Date.parse(t.occurred_at),
    budgetEligible: t.budget_eligible,
  }));
}

export default function BudgetScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [capRows, setCapRows] = useState<BudgetCap[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    const [{ budget: b, caps }, rows, categories] = await Promise.all([
      getCurrentMonthBudget(),
      getTransactions(500),
      getCategories(),
    ]);
    return { b, caps, rows, categories };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { b, caps, rows, categories } = await fetchData();
      setBudget(b);
      setCapRows(caps);
      setTxns(rows);
      setCats(categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load budget.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { b, caps, rows, categories } = await fetchData();
        if (!active) return;
        setBudget(b);
        setCapRows(caps);
        setTxns(rows);
        setCats(categories);
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
  }, [fetchData]);

  if (loading) {
    return (
      <ScreenScaffold titleFirst="Monthly" titleSecond="Budget" testID="budget">
        <LoadingState variant="chart-card" testID="budget-loading" />
      </ScreenScaffold>
    );
  }

  if (error) {
    return (
      <ScreenScaffold titleFirst="Monthly" titleSecond="Budget" testID="budget">
        <ErrorState message={error} onRetry={refresh} testID="budget-error" />
      </ScreenScaffold>
    );
  }

  if (!budget) {
    return (
      <ScreenScaffold titleFirst="Monthly" titleSecond="Budget" testID="budget">
        <EmptyState
          message="No budget yet. Set one up to track spending."
          action={
            <Button
              title="Set up budget"
              variant="secondary"
              onPress={() => router.push("/budget-setup")}
              testID="budget-empty-setup"
            />
          }
          testID="budget-empty"
        />
      </ScreenScaffold>
    );
  }

  const now = new Date();
  const rows = toRows(txns);
  const labelById = new Map(cats.map((c) => [c.id, c.label]));
  const currency = budget.currency;

  // Four-month expense comparison (oldest → newest).
  const months = [3, 2, 1, 0].map((back) => {
    const start = new Date(now.getFullYear(), now.getMonth() - back, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1).getTime();
    const spend = periodSpend(rows, start, end);
    return {
      label: formatMonthAbbrev(new Date(now.getFullYear(), now.getMonth() - back, 1)),
      value: Math.max(spend.expenseMinor, 0),
    };
  });
  const maxMonth = Math.max(1, ...months.map((m) => m.value));
  const peakIndex = months.findIndex((m) => m.value === Math.max(...months.map((x) => x.value)));
  const bars: BarDatum[] = months.map((m, index) => ({
    label: m.label,
    value: m.value,
    fill: index === peakIndex ? ("hatched" as const) : ("ink" as const),
  }));
  const lastDelta = months[3].value - months[2].value;
  // Compact (matches the axis convention): full-precision NGN deltas never
  // fit the 48px alert-red starburst and spill onto the yellow card.
  const callout = `${lastDelta < 0 ? "-" : "+"}${formatCompact(Math.abs(lastDelta))}`;

  // Month spend, trend points (weekly cumulative), forecast message.
  const monthStart = Date.parse(budget.period_start);
  const monthEnd = Date.parse(budget.period_end);
  const spend = periodSpend(rows, monthStart, monthEnd);
  const spent = Math.max(spend.netMinor, 0);
  const sampleDays = monthSampleDays(budget.period_start);
  const points = sampleDays.map((day) => {
    const at = new Date(now.getFullYear(), now.getMonth(), day).getTime();
    const partial = periodSpend(rows, monthStart, Math.min(at + 86400000, monthEnd));
    return { x: day, y: Math.max(partial.netMinor, 1) };
  });
  const daysLeft = Math.max(sampleDays[sampleDays.length - 1] - now.getDate() + 1, 1);
  const remaining = budget.total_limit_minor - spent;
  const message =
    remaining >= 0
      ? `You can spend ${formatMinor(Math.round(remaining / daysLeft), currency)} each day for the rest of the period.`
      : `You're over budget by ${formatMinor(-remaining, currency)}. Every naira counts from here.`;

  const capViews = capRows.map((cap) => {
    const label = labelById.get(cap.category_id) ?? cap.category_id;
    const capSpent = Math.max(categorySpend(rows, cap.category_id, monthStart, monthEnd), 0);
    return { label, spent: capSpent, limit: cap.limit_minor, over: capSpent > cap.limit_minor };
  });

  return (
    <ScreenScaffold titleFirst="Monthly" titleSecond="Budget" scroll={false} testID="budget">
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ExpensesBarCard
            bars={bars}
            axisTicks={[
              { value: 0, label: "₦0" },
              { value: Math.round(maxMonth / 2), label: formatCompact(Math.round(maxMonth / 2)) },
              { value: maxMonth, label: formatCompact(maxMonth) },
            ]}
            callout={callout}
            currency={currency}
            testID="budget-expenses"
          />
          <View style={{ marginTop: spacing.md }}>
            <SpendTrendCard
              spent={spent}
              limit={budget.total_limit_minor}
              currency={currency}
              points={points}
              projectedFrom={points.length - 1}
              axisTicks={[
                { value: 1, label: formatBoundLabel(new Date(monthStart)) },
                {
                  value: 2,
                  label: formatBoundLabel(new Date(monthStart + (monthEnd - monthStart) / 2)),
                },
                { value: 3, label: formatBoundLabel(new Date(monthEnd - 1)) },
              ]}
              testID="budget-trend"
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <PositiveMessageCard message={message} testID="budget-positive" />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Text role="h2" color="ink" testID="budget-caps-title">
              Category caps
            </Text>
            {capViews.length === 0 ? (
              <Text role="body" color="ink" style={{ marginTop: spacing.sm }}>
                No category caps set.
              </Text>
            ) : null}
            {capViews.map((cap) => (
              <View
                key={cap.label}
                testID={`budget-cap-${cap.label}`}
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: spacing.sm,
                    borderRadius: radius.chip,
                  },
                  cap.over ? { backgroundColor: colors.coral, padding: spacing.sm } : null,
                ]}
              >
                <CategoryCircle category={tintForLabel(cap.label)} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text role="small" color="ink" style={{ fontWeight: "600" }}>
                      {cap.label}
                    </Text>
                    <Text role="small" color="ink" style={{ opacity: 0.6 }}>
                      {formatMinor(cap.spent, currency)} of {formatMinor(cap.limit, currency)}
                    </Text>
                  </View>
                  <View style={{ marginTop: spacing.xs }}>
                    <ProgressBar
                      value={cap.limit > 0 ? cap.spent / cap.limit : 0}
                      height={8}
                      testID={`budget-cap-bar-${cap.label}`}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Edit budget"
              variant="ghost"
              onPress={() => router.push("/budget-setup")}
              testID="budget-edit"
            />
          </View>
        </View>
        <PillNav
          active="budget"
          onNavigate={(route) => router.push(PILL_ROUTES[route])}
          testID="budget-pill"
        />
      </View>
    </ScreenScaffold>
  );
}
