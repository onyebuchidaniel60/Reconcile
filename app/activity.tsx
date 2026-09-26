import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { Chip } from "../src/components/Chip";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { LoadingState } from "../src/components/LoadingState";
import { PillNav } from "../src/components/PillNav";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { TransactionRow } from "../src/components/TransactionRow";
import {
  getAccounts,
  getCategories,
  getTransactions,
  type BankAccount,
  type Category,
  type Transaction,
} from "../src/lib/db";
import {
  categoryTintFor,
  directionFor,
  formatRowDate,
} from "../src/lib/txn";
import { spacing } from "../src/theme/spacing";

type Filter = { kind: "all" } | { kind: "new" } | { kind: "category"; id: string } | { kind: "account"; id: string };

const PILL_ROUTES = {
  home: "/home",
  activity: "/activity",
  budget: "/budget",
  insights: "/insights",
} as const;

function filterKey(filter: Filter): string {
  if (filter.kind === "all") return "all";
  if (filter.kind === "new") return "new";
  return `${filter.kind}:${filter.id}`;
}

export default function ActivityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });

  const fetchData = useCallback(async () => {
    const [rows, cats, list] = await Promise.all([
      getTransactions(),
      getCategories(),
      getAccounts(),
    ]);
    return { rows, cats, list };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows, cats, list } = await fetchData();
      setTxns(rows);
      setCategories(cats);
      setAccounts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { rows, cats, list } = await fetchData();
        if (!active) return;
        setTxns(rows);
        setCategories(cats);
        setAccounts(list);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load activity.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const visible = useMemo(
    () =>
      txns.filter((t) => {
        if (filter.kind === "all") return true;
        if (filter.kind === "new") {
          return t.transaction_reviews[0]?.status === "needs_review";
        }
        if (filter.kind === "category") {
          return t.transaction_reviews[0]?.category_id === filter.id;
        }
        return t.bank_account_id === filter.id;
      }),
    [txns, filter],
  );

  const activeKey = filterKey(filter);

  const chips: { key: string; label: string; filter: Filter; testID: string }[] = [
    { key: "all", label: "All", filter: { kind: "all" }, testID: "activity-filter-all" },
    { key: "new", label: "New", filter: { kind: "new" }, testID: "activity-filter-new" },
    ...categories.map((c) => ({
      key: `cat:${c.id}`,
      label: c.label,
      filter: { kind: "category", id: c.id } as Filter,
      testID: `activity-filter-cat-${c.id}`,
    })),
    ...accounts.map((a) => ({
      key: `acct:${a.id}`,
      label: a.display_name ?? "Account",
      filter: { kind: "account", id: a.id } as Filter,
      testID: `activity-filter-acct-${a.id}`,
    })),
  ];

  if (loading) {
    return (
      <ScreenScaffold titleFirst="Recent" titleSecond="Activity" testID="activity">
        <LoadingState variant="row-list" testID="activity-loading" />
      </ScreenScaffold>
    );
  }

  if (error) {
    return (
      <ScreenScaffold titleFirst="Recent" titleSecond="Activity" testID="activity">
        <ErrorState message={error} onRetry={refresh} testID="activity-error" />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold titleFirst="Recent" titleSecond="Activity" scroll={false} testID="activity">
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            testID="activity-filters"
          >
            <View style={{ flexDirection: "row" }}>
              {chips.map((chip) => (
                <View key={chip.key} style={{ marginRight: spacing.sm }}>
                  <Chip
                    label={chip.label}
                    selected={activeKey === chip.key}
                    onPress={() => setFilter(chip.filter)}
                    testID={chip.testID}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
          {visible.length === 0 ? (
            <EmptyState
              message="No transactions yet. Connect a bank or enter Demo Mode."
              testID="activity-empty"
            />
          ) : (
            <FlatList
              data={visible}
              keyExtractor={(t) => t.id}
              testID="activity-list"
              renderItem={({ item }) => (
                <TransactionRow
                  merchant={item.merchant_name ?? "Unknown"}
                  date={formatRowDate(item.occurred_at)}
                  amount={item.amount_minor}
                  currency={item.currency}
                  category={categoryTintFor(item, categories)}
                  direction={directionFor(item)}
                  onPress={() => router.push(`/transaction/${item.id}`)}
                  testID={`activity-row-${item.id}`}
                />
              )}
            />
          )}
        </View>
        <PillNav
          active="activity"
          onNavigate={(route) => router.push(PILL_ROUTES[route])}
          testID="activity-pill"
        />
      </View>
    </ScreenScaffold>
  );
}
