import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { CreditCard, LayoutGrid } from "lucide-react-native";
import { periodSpend } from "../supabase/functions/_shared/finance";
import {
  getAccounts,
  getCategories,
  getCurrentMonthBudget,
  getReviewCount,
  getTransactions,
  type Budget,
  type Category,
  type Transaction,
} from "../src/lib/db";
import { useSession } from "../src/lib/session";
import {
  categoryTintFor,
  directionFor,
  formatBoundLabel,
  formatPeriodLabel,
  formatRowDate,
  periodIncome,
} from "../src/lib/txn";
import { Avatar } from "../src/components/Avatar";
import { BudgetOverviewCard } from "../src/components/organisms/BudgetOverviewCard";
import { Button } from "../src/components/Button";
import { DarkScreenScaffold } from "../src/components/DarkScreenScaffold";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { HeroSummaryCard } from "../src/components/organisms/HeroSummaryCard";
import { IconButton } from "../src/components/IconButton";
import { LoadingState } from "../src/components/LoadingState";
import { PairedTitle } from "../src/components/PairedTitle";
import { PillNav, type PillRoute } from "../src/components/PillNav";
import { Text } from "../src/components/Text";
import { TransactionRow } from "../src/components/TransactionRow";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";

function monthBounds(now: Date): { startMs: number; endMs: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { startMs: start, endMs: end };
}

function firstNameOf(email: string | undefined): string {
  const local = (email ?? "").split("@")[0];
  if (!local) return "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

const PILL_ROUTES: Record<PillRoute, "/home" | "/activity" | "/budget" | "/insights"> = {
  home: "/home",
  activity: "/activity",
  budget: "/budget",
  insights: "/insights",
};

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null);
  const [budgetCurrency, setBudgetCurrency] = useState("NGN");
  const [reviewCount, setReviewCount] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchData = useCallback(async () => {
    const [accounts, txns, count, { budget }, cats] = await Promise.all([
      getAccounts(),
      getTransactions(50),
      getReviewCount(),
      getCurrentMonthBudget(),
      getCategories(),
    ]);
    return { accounts, txns, count, budget, cats };
  }, []);

  const applyHomeData = useCallback(
    (
      accounts: { id: string }[],
      txns: Transaction[],
      count: number,
      budget: Budget | null,
      cats: Category[],
    ) => {
      setHasAccounts(accounts.length > 0);
      const now = new Date();
      const { startMs, endMs } = monthBounds(now);
      const spend = periodSpend(
        txns.map((t) => ({
          semanticType: t.semantic_type as
            | "income"
            | "expense"
            | "external_transfer"
            | "internal_transfer"
            | "refund"
            | "unknown",
          amountMinor: t.amount_minor,
          occurredAtMs: Date.parse(t.occurred_at),
          budgetEligible: t.budget_eligible,
        })),
        startMs,
        endMs,
      );
      setIncome(periodIncome(txns, startMs, endMs));
      setExpenses(spend.expenseMinor);
      setBudgetLimit(budget ? budget.total_limit_minor : null);
      setBudgetCurrency(budget?.currency ?? txns[0]?.currency ?? "NGN");
      setReviewCount(count);
      setRecent(txns.slice(0, 5));
      setCategories(cats);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { accounts, txns, count, budget, cats } = await fetchData();
      applyHomeData(accounts, txns, count, budget, cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load home.");
    } finally {
      setLoading(false);
    }
  }, [fetchData, applyHomeData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { accounts, txns, count, budget, cats } = await fetchData();
        if (!active) return;
        applyHomeData(accounts, txns, count, budget, cats);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load home.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData, applyHomeData]);

  const name = firstNameOf(session?.user.email);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const spent = Math.max(expenses, 0);
  const progress = budgetLimit && budgetLimit > 0 ? spent / budgetLimit : 0;

  if (loading) {
    return (
      <DarkScreenScaffold testID="home">
        <LoadingState variant="card-hero" testID="home-loading" />
      </DarkScreenScaffold>
    );
  }

  if (error) {
    return (
      <DarkScreenScaffold testID="home">
        <ErrorState message={error} onRetry={refresh} testID="home-error" />
      </DarkScreenScaffold>
    );
  }

  if (!hasAccounts) {
    return (
      <DarkScreenScaffold testID="home">
        <EmptyState
          message="No accounts connected"
          action={
            <Button
              title="Enter Demo Mode"
              onPress={() => router.push("/demo")}
              testID="home-empty-demo"
            />
          }
          testID="home-empty"
        />
      </DarkScreenScaffold>
    );
  }

  return (
    <DarkScreenScaffold scroll={false} testID="home">
      <View style={{ flex: 1 }}>
        <FlatList
          data={recent}
          keyExtractor={(t) => t.id}
          testID="home-recent-list"
          ListHeaderComponent={
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: spacing.md,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open settings"
                  onPress={() => router.push("/settings")}
                  testID="home-avatar-button"
                >
                  <Avatar displayName={name} size={48} testID="home-avatar" />
                </Pressable>
                <View style={{ flexDirection: "row" }}>
                  <IconButton
                    accessibilityLabel="Open menu"
                    tone="dark"
                    testID="home-menu"
                  >
                    <LayoutGrid size={24} color={colors.paper} strokeWidth={1.5} />
                  </IconButton>
                  <View style={{ marginLeft: spacing.sm }}>
                    <IconButton
                      accessibilityLabel="View cards"
                      tone="dark"
                      testID="home-cards"
                    >
                      <CreditCard size={24} color={colors.paper} strokeWidth={1.5} />
                    </IconButton>
                  </View>
                </View>
              </View>
              <Text
                role="titleHeavy"
                color="paper"
                style={{ fontWeight: "600", marginTop: spacing.md }}
                numberOfLines={1}
                testID="home-greeting"
              >
                Hey, {name}
              </Text>
              <View style={{ marginTop: spacing.md }}>
                <HeroSummaryCard
                  period={formatPeriodLabel(now)}
                  total={income + expenses}
                  income={income}
                  expenses={expenses}
                  currency={budgetCurrency}
                  testID="home-hero"
                />
              </View>
              {budgetLimit !== null ? (
                <View style={{ marginTop: spacing.md }}>
                  <BudgetOverviewCard
                    spent={spent}
                    limit={budgetLimit}
                    currency={budgetCurrency}
                    periodStart={formatBoundLabel(periodStart)}
                    periodEnd={formatBoundLabel(periodEnd)}
                    progress={progress}
                    testID="home-budget"
                  />
                </View>
              ) : null}
              {reviewCount > 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button
                    title={`Review ${reviewCount} transactions`}
                    variant="secondary"
                    onPress={() => router.push("/review")}
                    testID="home-review"
                  />
                </View>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: spacing.xl,
                  marginBottom: spacing.sm,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PairedTitle
                    first="Recent"
                    second="Activity"
                    color="paper"
                    testID="home-recent-title"
                  />
                </View>
                <Link href="/activity" testID="home-view-all">
                  <Text role="small" color="paper" style={{ opacity: 0.7 }}>
                    View all
                  </Text>
                </Link>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TransactionRow
              merchant={item.merchant_name ?? "Unknown"}
              date={formatRowDate(item.occurred_at)}
              amount={item.amount_minor}
              currency={item.currency}
              category={categoryTintFor(item, categories)}
              direction={directionFor(item)}
              surface="dark"
              onPress={() => router.push(`/transaction/${item.id}`)}
              testID={`home-row-${item.id}`}
            />
          )}
        />
        <PillNav
          active="home"
          onNavigate={(route) => router.push(PILL_ROUTES[route])}
          surface="dark"
          testID="home-pill"
          style={{ marginHorizontal: -spacing.sm }}
        />
      </View>
    </DarkScreenScaffold>
  );
}
