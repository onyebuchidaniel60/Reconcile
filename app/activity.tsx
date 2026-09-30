import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pencil } from "lucide-react-native";
import { Chip } from "../src/components/Chip";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { IconButton } from "../src/components/IconButton";
import { LoadingState } from "../src/components/LoadingState";
import { PillNav, pillNavClearance } from "../src/components/PillNav";
import { ScreenScaffold } from "../src/components/ScreenScaffold";
import { Text } from "../src/components/Text";
import { TransactionRow } from "../src/components/TransactionRow";
import { select } from "../src/lib/haptics";
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
  resolveDisplayName,
} from "../src/lib/txn";
import { colors } from "../src/theme/colors";
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

/**
 * Phase 10B (Fix C): a row is renameable once its review exists and is
 * settled. `needs_review` is excluded on purpose — those are still being
 * triaged on the Review screen, which is where the name is set.
 */
function isReviewed(txn: Transaction): boolean {
  const status = txn.transaction_reviews?.[0]?.status;
  return status === "reconciled" || status === "excluded";
}

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  type SectionItem = { header: string; row?: undefined } | { header?: undefined; row: Transaction };

  // design.md §8: timeline grouped by day with a Label-weight day header.
  const sections: SectionItem[] = useMemo(() => {
    const groups = new Map<string, { label: string; rows: Transaction[] }>();
    for (const t of visible) {
      const at = new Date(t.occurred_at);
      const valid = !Number.isNaN(at.getTime());
      const key = valid
        ? `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`
        : t.occurred_at.slice(0, 10);
      const label = valid ? formatRowDate(t.occurred_at) : t.occurred_at.slice(0, 10);
      const group = groups.get(key);
      if (group) group.rows.push(t);
      else groups.set(key, { label, rows: [t] });
    }
    return [...groups.values()].flatMap((g): SectionItem[] => [
      { header: g.label },
      ...g.rows.map((row): SectionItem => ({ row })),
    ]);
  }, [visible]);

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
              data={sections}
              keyExtractor={(item) => item.header ?? item.row!.id}
              testID="activity-list"
              // Phase 10A.5: the measured pill clearance keeps the last row
              // clear of the floating pill nav on short screens.
              contentContainerStyle={{
                paddingBottom: pillNavClearance(insets.bottom),
              }}
              renderItem={({ item, index }) =>
                item.header !== undefined ? (
                  <Text
                    role="small"
                    color="ink"
                    style={{
                      fontWeight: "600",
                      marginTop: index === 0 ? spacing.sm : spacing.md,
                    }}
                    testID={`activity-day-${item.header}`}
                  >
                    {item.header}
                  </Text>
                ) : (
                  // Phase 10B (Fix C): the chosen entry point is a trailing
                  // pencil, not a long-press sheet. Long-press is undiscoverable
                  // and has no affordance on Android, and a sheet needs a modal
                  // primitive this phase is not allowed to add. The pencil is
                  // shown only for rows whose review already exists
                  // (reconciled/excluded) — `needs_review` rows are renamed
                  // from Review. It navigates to Detail, where the edit lives.
                  <View
                    style={{ flexDirection: "row", alignItems: "center" }}
                    testID={`activity-item-${item.row!.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <TransactionRow
                        merchant={resolveDisplayName(
                          item.row!.transaction_reviews?.[0],
                          item.row!,
                        )}
                        date={formatRowDate(item.row!.occurred_at)}
                        amount={item.row!.amount_minor}
                        currency={item.row!.currency}
                        category={categoryTintFor(item.row!, categories)}
                        direction={directionFor(item.row!)}
                        onPress={() => router.push(`/transaction/${item.row!.id}`)}
                        testID={`activity-row-${item.row!.id}`}
                      />
                    </View>
                    {isReviewed(item.row!) ? (
                      <View style={{ marginLeft: spacing.xs }}>
                        <IconButton
                          accessibilityLabel={`Rename ${resolveDisplayName(
                            item.row!.transaction_reviews?.[0],
                            item.row!,
                          )}`}
                          onPress={() => {
                            void select();
                            router.push(`/transaction/${item.row!.id}`);
                          }}
                          tone="light"
                          testID={`activity-rename-${item.row!.id}`}
                        >
                          <Pencil size={20} color={colors.ink} strokeWidth={1.5} />
                        </IconButton>
                      </View>
                    ) : null}
                  </View>
                )
              }
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
