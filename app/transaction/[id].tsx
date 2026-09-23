import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { formatMinor } from "../../supabase/functions/_shared/finance";
import {
  confirmReview,
  excludeReview,
  getCategories,
  getTransaction,
  type Category,
  type Transaction,
  type TxnReview,
} from "../../src/lib/db";

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [review, setReview] = useState<TxnReview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) throw new Error("Transaction not found.");
    const [{ txn: t, review: r }, cats] = await Promise.all([
      getTransaction(id),
      getCategories(),
    ]);
    return { t, r, cats };
  }, [id]);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { t, r, cats } = await fetchData();
      setTxn(t);
      setReview(r);
      setCategories(cats);
      setPicked(r?.category_id ?? null);
      setNote(r?.user_note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load transaction.");
    } finally {
      setLoading(false);
    }
  }, [id, fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { t, r, cats } = await fetchData();
        if (!active) return;
        setTxn(t);
        setReview(r);
        setCategories(cats);
        setPicked(r?.category_id ?? null);
        setNote(r?.user_note ?? "");
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load transaction.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const save = async (exclude: boolean) => {
    if (!txn) return;
    setBusy(true);
    setError(null);
    try {
      if (exclude) {
        await excludeReview(txn.id);
      } else {
        await confirmReview(txn.id, picked ?? "other", note || undefined);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }
  if (error || !txn) {
    return (
      <View>
        <Text>{error ?? "Transaction not found."}</Text>
        <Link href="/review">Back to review</Link>
      </View>
    );
  }

  return (
    <View>
      <Text>Transaction (Demo)</Text>
      <Text>
        {formatMinor(txn.amount_minor, txn.currency)} {txn.direction}
      </Text>
      <Text>Merchant: {txn.merchant_name ?? "Unknown"}</Text>
      <Text>Bank: {txn.bank_accounts?.display_name ?? "Unknown account"}</Text>
      <Text>Date: {txn.occurred_at.slice(0, 10)}</Text>
      <Text>Narration: {txn.narration ?? "-"}</Text>
      <Text>Type: {txn.semantic_type}</Text>
      <Text>Review status: {review?.status ?? "none"}</Text>
      <Text>Category</Text>
      {categories.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`Set ${c.label}`}
          onPress={() => setPicked(c.id)}
        >
          <Text>
            {c.label}
            {picked === c.id ? " (selected)" : ""}
          </Text>
        </Pressable>
      ))}
      <Text>Note</Text>
      <TextInput value={note} onChangeText={setNote} accessibilityLabel="Note" />
      {error ? <Text>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save category"
        onPress={() => save(false)}
        disabled={busy}
      >
        <Text>Save</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exclude transaction"
        onPress={() => save(true)}
        disabled={busy}
      >
        <Text>Exclude</Text>
      </Pressable>
      <Link href="/review">Back to review</Link>
      <Link href="/activity">Activity</Link>
    </View>
  );
}
