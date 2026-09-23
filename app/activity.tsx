import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { formatMinor } from "../supabase/functions/_shared/finance";
import { getTransactions, type Transaction } from "../src/lib/db";

type Filter = "all" | "in" | "out";

export default function ActivityScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const fetchData = useCallback(async () => getTransactions(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const txns = await fetchData();
        if (!active) return;
        setTxns(txns);
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

  const visible = txns.filter((t) => {
    if (filter === "in") return t.direction === "credit";
    if (filter === "out") return t.direction === "debit";
    return true;
  });

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Activity (Demo)</Text>
      <Text>Demo data is synthetic.</Text>
      {error ? <Text>{error}</Text> : null}
      <View>
        {(["all", "in", "out"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${f}`}
            onPress={() => setFilter(f)}
          >
            <Text>
              {f === "all" ? "All" : f === "in" ? "Money in" : "Money out"}
              {filter === f ? " (selected)" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      {visible.length === 0 ? (
        <Text>No transactions found. Sync from Demo Mode.</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Link href={`/transaction/${item.id}`}>
              {item.occurred_at.slice(0, 10)} · {item.merchant_name ?? "Unknown"} ·{" "}
              {item.direction === "credit" ? "+" : "-"}
              {formatMinor(item.amount_minor, item.currency)}
            </Link>
          )}
        />
      )}
      <Link href="/home">Back home</Link>
    </View>
  );
}
