import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { formatMinor, periodSpend } from "../supabase/functions/_shared/finance";
import {
  getAccounts,
  getCurrentMonthBudget,
  getReviewCount,
  getTransactions,
  type BankAccount,
  type Budget,
  type Transaction,
} from "../src/lib/db";
import { useSession } from "../src/lib/session";

function monthBounds(now: Date): { startMs: number; endMs: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { startMs: start, endMs: end };
}

export default function HomeScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(0);
  const [spent, setSpent] = useState(0);
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [recent, setRecent] = useState<Transaction[]>([]);

  const applyHomeData = useCallback(
    (
      accounts: BankAccount[],
      txns: Transaction[],
      count: number,
      budget: Budget | null,
    ) => {
      setAvailable(accounts.reduce((s, a) => s + a.available_balance_minor, 0));
      const { startMs, endMs } = monthBounds(new Date());
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
      setSpent(spend.netMinor);
      setBudgetLimit(budget ? budget.total_limit_minor : null);
      setReviewCount(count);
      setRecent(txns.slice(0, 5));
    },
    [],
  );

  const fetchData = useCallback(async () => {
    const [accounts, txns, count, { budget }] = await Promise.all([
      getAccounts(),
      getTransactions(50),
      getReviewCount(),
      getCurrentMonthBudget(),
    ]);
    return { accounts, txns, count, budget };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { accounts, txns, count, budget } = await fetchData();
      applyHomeData(accounts, txns, count, budget);
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
        const { accounts, txns, count, budget } = await fetchData();
        if (!active) return;
        applyHomeData(accounts, txns, count, budget);
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

  return (
    <View>
      <Text>Home (Demo)</Text>
      <Text>Hello, {session?.user.email ?? "there"}</Text>
      <Text>Total available: {formatMinor(available, "NGN")}</Text>
      <Text>
        Monthly spend: {formatMinor(Math.max(spent, 0), "NGN")}
        {budgetLimit !== null
          ? ` of ${formatMinor(budgetLimit, "NGN")} budget`
          : " (no budget yet)"}
      </Text>
      <Text>
        {reviewCount} transaction(s) need review.
      </Text>
      <Link href="/review">Review transactions</Link>
      <Link href="/budget">
        {budgetLimit !== null ? "View budget" : "Set up budget"}
      </Link>
      <Text>Recent activity:</Text>
      {recent.length === 0 ? (
        <Text>No transactions yet. Enter Demo Mode and sync.</Text>
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Link href={`/transaction/${item.id}`}>
              {item.merchant_name ?? "Unknown"} —{" "}
              {formatMinor(item.amount_minor, item.currency)}
            </Link>
          )}
        />
      )}
      <Link href="/activity">All activity</Link>
      <Link href="/settings">Settings</Link>
    </View>
  );
}
