import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { CreditCard, LayoutGrid, X } from "lucide-react-native";
import {
  getAccounts,
  getCategories,
  getCurrentMonthBudget,
  getProfile,
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
  getMonthlySpend,
  monthBoundsFor,
  monthOffset,
  recentMonths,
  resolveDisplayName,
} from "../src/lib/txn";
import { Avatar } from "../src/components/Avatar";
import { BudgetOverviewCard } from "../src/components/organisms/BudgetOverviewCard";
import { Button } from "../src/components/Button";
import { Chip } from "../src/components/Chip";
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
import { select } from "../src/lib/haptics";
import { colors } from "../src/theme/colors";
import { radius } from "../src/theme/radius";
import { spacing } from "../src/theme/spacing";

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

/** How many calendar months the summary period selector offers. */
const MONTH_CHOICES = 6;

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // Phase 10B.5 (Fix B): how many months back the summary is showing. Held
  // as an offset (not a Date) so the default stays live rather than
  // freezing at mount, and 0 always means "this month".
  const [monthBack, setMonthBack] = useState(0);
  const [pickingMonth, setPickingMonth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null);
  const [budgetCurrency, setBudgetCurrency] = useState("NGN");
  const [reviewCount, setReviewCount] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [accounts, txns, count, { budget }, cats, profile] = await Promise.all([
      getAccounts(),
      getTransactions(50),
      getReviewCount(),
      getCurrentMonthBudget(),
      getCategories(),
      getProfile(),
    ]);
    return { accounts, txns, count, budget, cats, profile };
  }, []);

  // The month currently being summarised, derived from `monthBack`.
  const selectedMonth = useCallback(
    () => monthOffset(new Date(), monthBack),
    [monthBack],
  );
  // The six selectable months. Built fresh each render — it is six Date
  // objects and the picker is open only while the user is choosing.
  const monthChoices = recentMonths(new Date(), MONTH_CHOICES);

  const applyHomeData = useCallback(
    (
      accounts: { id: string }[],
      txns: Transaction[],
      count: number,
      budget: Budget | null,
      cats: Category[],
      profile: { avatar_url: string | null } | null,
      month: Date,
    ) => {
      setHasAccounts(accounts.length > 0);
      // Phase 10B.5 (Fix A): one shared definition of monthly spend. Home
      // previously used the gross figure (refunds ignored) while Budget used
      // the net one, so the same month showed two different "Expenses"
      // numbers. `spend.netMinor` is the Budget reading, which is correct.
      const spend = getMonthlySpend(txns, month);
      setIncome(spend.incomeMinor);
      setExpenses(spend.netMinor);
      setBudgetLimit(budget ? budget.total_limit_minor : null);
      setBudgetCurrency(budget?.currency ?? txns[0]?.currency ?? "NGN");
      setReviewCount(count);
      // Phase 10B.5 (Fix B): the recent list follows the selected month, so
      // switching months shows that period's activity rather than an
      // unrelated newest-first slice.
      const from = spend.startMs;
      const until = spend.endMs;
      setRecent(
        txns
          .filter((t) => {
            const at = Date.parse(t.occurred_at);
            return at >= from && at < until;
          })
          .slice(0, 5),
      );
      setCategories(cats);
      setAvatarUrl(profile?.avatar_url ?? null);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { accounts, txns, count, budget, cats, profile } = await fetchData();
      applyHomeData(accounts, txns, count, budget, cats, profile, selectedMonth());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load home.");
    } finally {
      setLoading(false);
    }
  }, [fetchData, applyHomeData, selectedMonth]);

  // Re-runs whenever the selected month changes, so switching months
  // recomputes the hero, the budget bar, and the recent list for that
  // period (Phase 10B.5, Fix B).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { accounts, txns, count, budget, cats, profile } = await fetchData();
        if (!active) return;
        applyHomeData(accounts, txns, count, budget, cats, profile, selectedMonth());
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
  }, [fetchData, applyHomeData, selectedMonth]);

  const name = firstNameOf(session?.user.email);
  const shown = selectedMonth();
  const { startMs: periodStartMs, endMs: periodEndMs } = monthBoundsFor(shown);
  const periodStart = new Date(periodStartMs);
  // Exclusive end bound minus 1ms so the label reads the last day in the
  // month rather than the first day of the next.
  const periodEnd = new Date(periodEndMs - 1);
  const spent = Math.max(expenses, 0);
  // A budget exists per calendar month; only show its card when the summary
  // is showing that same month, otherwise the bar would compare this
  // month's spend against a different month's limit.
  const isCurrentMonth = monthBack === 0;
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
                  <Avatar
                    displayName={name}
                    size={48}
                    uri={avatarUrl}
                    testID="home-avatar"
                  />
                </Pressable>
                <View style={{ flexDirection: "row" }}>
                  {/* Phase 10A.5: shortcuts duplicating PillNav destinations
                    (operator request). Grid → Insights, card → Budget. */}
                  <IconButton
                    accessibilityLabel="Insights"
                    tone="dark"
                    onPress={() => {
                      void select();
                      router.push("/insights");
                    }}
                    testID="home-menu"
                  >
                    <LayoutGrid size={24} color={colors.paper} strokeWidth={1.5} />
                  </IconButton>
                  <View style={{ marginLeft: spacing.sm }}>
                    <IconButton
                      accessibilityLabel="Budget"
                      tone="dark"
                      onPress={() => {
                        void select();
                        router.push("/budget");
                      }}
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
                  period={formatPeriodLabel(shown)}
                  total={income + expenses}
                  income={income}
                  expenses={expenses}
                  currency={budgetCurrency}
                  onPressPeriod={() => setPickingMonth((open) => !open)}
                  testID="home-hero"
                />
              </View>
              {/* Phase 10B.5 (Fix B): the month picker. Inline under the
                hero card rather than in a modal — no new primitive, and it
                keeps the chart visible while the user compares months. */}
              {pickingMonth ? (
                <View
                  style={{
                    marginTop: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.compact,
                    backgroundColor: colors.paper,
                  }}
                  testID="home-month-picker"
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text role="small" color="ink" style={{ fontWeight: "600" }}>
                      Summary period
                    </Text>
                    <IconButton
                      accessibilityLabel="Close month picker"
                      onPress={() => setPickingMonth(false)}
                      tone="light"
                      testID="home-month-close"
                    >
                      <X size={20} color={colors.ink} strokeWidth={1.5} />
                    </IconButton>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      marginTop: spacing.sm,
                    }}
                  >
                    {monthChoices.map((choice, index) => (
                      <View key={choice.toISOString()} style={{ margin: spacing.xs }}>
                        <Chip
                          label={formatPeriodLabel(choice)}
                          selected={index === monthBack}
                          accessibilityLabel={`Show ${formatPeriodLabel(choice)}`}
                          onPress={() => {
                            setMonthBack(index);
                            setPickingMonth(false);
                          }}
                          testID={`home-month-${index}`}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {budgetLimit !== null && isCurrentMonth ? (
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
                <Link
                  href="/activity"
                  testID="home-view-all"
                  style={{ paddingVertical: spacing.lg }}
                >
                  <Text role="small" color="paper" style={{ opacity: 0.7 }}>
                    View all
                  </Text>
                </Link>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TransactionRow
              merchant={resolveDisplayName(item.transaction_reviews?.[0], item)}
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
