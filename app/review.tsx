import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { formatMinor } from "../supabase/functions/_shared/finance";
import {
  confirmReview,
  excludeReview,
  getCategories,
  getPendingReviews,
  type Category,
  type ReviewItem,
} from "../src/lib/db";

export default function ReviewScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [reviews, cats] = await Promise.all([
      getPendingReviews(),
      getCategories(),
    ]);
    return { reviews, cats };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { reviews, cats } = await fetchData();
      setItems(reviews);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { reviews, cats } = await fetchData();
        if (!active) return;
        setItems(reviews);
        setCategories(cats);
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
  }, [fetchData]);

  const confirm = async (item: ReviewItem) => {
    const categoryId = picked[item.transaction_id] ?? item.category_id ?? "other";
    setBusyId(item.transaction_id);
    setError(null);
    try {
      await confirmReview(item.transaction_id, categoryId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed.");
    } finally {
      setBusyId(null);
    }
  };

  const exclude = async (item: ReviewItem) => {
    setBusyId(item.transaction_id);
    setError(null);
    try {
      await excludeReview(item.transaction_id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Exclude failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Review (Demo)</Text>
      <Text>{items.length} pending transaction(s). Demo data is synthetic.</Text>
      {error ? <Text>{error}</Text> : null}
      {items.length === 0 ? (
        <View>
          <Text>Nothing to review. Sync to fetch transactions.</Text>
          <Link href="/home">Back home</Link>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const t = item.transaction;
            const selected = picked[item.transaction_id] ?? item.category_id ?? "other";
            return (
              <View>
                <Link href={`/transaction/${t.id}`}>
                  {t.merchant_name ?? "Unknown"} —{" "}
                  {formatMinor(t.amount_minor, t.currency)}
                </Link>
                <Text>
                  {t.occurred_at.slice(0, 10)} · {t.semantic_type}
                </Text>
                <Text>Suggested: {selected}</Text>
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${c.label}`}
                    onPress={() =>
                      setPicked((p) => ({ ...p, [item.transaction_id]: c.id }))
                    }
                  >
                    <Text>
                      {c.label}
                      {selected === c.id ? " (selected)" : ""}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm category"
                  onPress={() => confirm(item)}
                  disabled={busyId === item.transaction_id}
                >
                  <Text>Confirm</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Exclude transaction"
                  onPress={() => exclude(item)}
                  disabled={busyId === item.transaction_id}
                >
                  <Text>Exclude</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
      <Link href="/home">Back home</Link>
    </View>
  );
}
