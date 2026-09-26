import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { useConfirmPulse } from "../src/lib/motion/useConfirmPulse";
import {
  categoryTintFor,
  directionFor,
  formatRowDate,
} from "../src/lib/txn";
import { Button } from "../src/components/Button";
import { Chip } from "../src/components/Chip";
import { DarkScreenScaffold } from "../src/components/DarkScreenScaffold";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { LoadingState } from "../src/components/LoadingState";
import { ReviewHeader } from "../src/components/organisms/ReviewHeader";
import { Text } from "../src/components/Text";
import { TransactionRow } from "../src/components/TransactionRow";
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import {
  confirmReview,
  getCategories,
  getPendingReviews,
  type Category,
  type ReviewItem,
} from "../src/lib/db";

export default function ReviewScreen() {
  const router = useRouter();
  // The pulse fires a confirmation haptic (instant under reduced motion);
  // the confirmed row then exits via list refresh.
  const { pulse } = useConfirmPulse();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    const [reviews, cats] = await Promise.all([
      getPendingReviews(),
      getCategories(),
    ]);
    return { reviews, cats };
  }, []);

  const applyData = useCallback(
    (reviews: ReviewItem[], cats: Category[]) => {
      setItems(reviews);
      setCategories(cats);
      setSelectedId((current) => {
        if (current && reviews.some((r) => r.transaction_id === current)) {
          return current;
        }
        return reviews[0]?.transaction_id ?? null;
      });
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { reviews, cats } = await fetchData();
      applyData(reviews, cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [fetchData, applyData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { reviews, cats } = await fetchData();
        if (!active) return;
        applyData(reviews, cats);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load reviews.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData, applyData]);

  const confirm = async () => {
    const item = items.find((r) => r.transaction_id === selectedId);
    if (!item || busy) return;
    const categoryId = picked[item.transaction_id] ?? item.category_id ?? "other";
    setBusy(true);
    setError(null);
    try {
      pulse();
      await confirmReview(item.transaction_id, categoryId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <DarkScreenScaffold testID="review">
        <LoadingState variant="row-list" testID="review-loading" />
      </DarkScreenScaffold>
    );
  }

  if (error) {
    return (
      <DarkScreenScaffold testID="review">
        <ErrorState message={error} onRetry={refresh} testID="review-error" />
      </DarkScreenScaffold>
    );
  }

  if (items.length === 0) {
    return (
      <DarkScreenScaffold testID="review">
        <EmptyState
          message="All caught up. Review complete."
          testID="review-empty"
        />
      </DarkScreenScaffold>
    );
  }

  const selectedIndex = Math.max(
    0,
    items.findIndex((r) => r.transaction_id === selectedId),
  );
  const selected = items[selectedIndex];

  return (
    <DarkScreenScaffold
      onBack={() => router.push("/home")}
      backLabel="Back home"
      actions={[{ label: "Edit list", icon: <Pencil size={24} color={colors.paper} strokeWidth={1.5} /> }]}
      scroll={false}
      testID="review"
    >
      <View style={{ flex: 1 }}>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          testID="review-list"
          ListHeaderComponent={
            <ReviewHeader
              firstWord="Review"
              secondWord="Transactions"
              starburst
              progress={`${selectedIndex + 1} of ${items.length}`}
              testID="review-header"
            />
          }
          renderItem={({ item }) => {
            const t = item.transaction;
            const isSelected = item.transaction_id === selected?.transaction_id;
            const chosen = picked[item.transaction_id] ?? item.category_id ?? "other";
            return (
              <View>
                <TransactionRow
                  merchant={t.merchant_name ?? "Unknown"}
                  date={formatRowDate(t.occurred_at)}
                  amount={t.amount_minor}
                  currency={t.currency}
                  category={categoryTintFor(
                    t,
                    categories,
                    picked[item.transaction_id] ?? item.category_id,
                  )}
                  direction={directionFor(t)}
                  surface="dark"
                  onPress={() => setSelectedId(item.transaction_id)}
                  testID={`review-row-${item.transaction_id}`}
                />
                {isSelected ? (
                  <View style={{ marginBottom: spacing.md }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {categories.map((c) => (
                        <View key={c.id} style={{ margin: spacing.xs }}>
                          <Chip
                            label={c.label}
                            selected={chosen === c.id}
                            accessibilityLabel={`Set ${c.label}`}
                            onPress={() =>
                              setPicked((p) => ({ ...p, [item.transaction_id]: c.id }))
                            }
                            testID={`review-chip-${c.id}`}
                          />
                        </View>
                      ))}
                    </View>
                    <Link
                      href={`/transaction/${t.id}`}
                      testID={`review-detail-${t.id}`}
                      style={{ paddingVertical: spacing.lg }}
                    >
                      <Text role="small" color="paper" style={{ opacity: 0.7 }}>
                        View details
                      </Text>
                    </Link>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
        <View style={{ paddingTop: spacing.md }}>
          <Button
            title={busy ? "Confirming..." : "Confirm"}
            onPress={confirm}
            disabled={busy}
            loading={busy}
            accessibilityLabel={`Confirm ${selected ? (selected.transaction.merchant_name ?? "transaction") : "transaction"}`}
            testID="review-confirm"
          />
        </View>
      </View>
    </DarkScreenScaffold>
  );
}
