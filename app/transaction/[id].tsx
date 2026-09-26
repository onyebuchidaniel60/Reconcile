import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { formatMinor } from "../../supabase/functions/_shared/finance";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { Chip } from "../../src/components/Chip";
import { Divider } from "../../src/components/Divider";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { Input } from "../../src/components/Input";
import { LoadingState } from "../../src/components/LoadingState";
import { ScreenScaffold } from "../../src/components/ScreenScaffold";
import { Text } from "../../src/components/Text";
import { spacing } from "../../src/theme/spacing";
import {
  confirmReview,
  excludeReview,
  getCategories,
  getTransaction,
  type Category,
  type Transaction,
  type TxnReview,
} from "../../src/lib/db";

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
      }}
    >
      <Text role="small" color="ink" style={{ fontWeight: "600" }}>
        {label}
      </Text>
      <Text
        role="body"
        color="ink"
        style={{ textAlign: "right", marginLeft: spacing.md, flexShrink: 1 }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
      <ScreenScaffold onBack={() => router.back()} backLabel="Back" testID="detail">
        <LoadingState variant="card-hero" testID="detail-loading" />
      </ScreenScaffold>
    );
  }

  if (error || !txn) {
    return (
      <ScreenScaffold onBack={() => router.back()} backLabel="Back" testID="detail">
        <ErrorState
          message={error ?? "Transaction not found."}
          onRetry={refresh}
          testID="detail-error"
        />
      </ScreenScaffold>
    );
  }

  const amountLabel = `${txn.direction === "credit" ? "+" : "-"}${formatMinor(
    txn.amount_minor,
    txn.currency,
  )}`;
  const chosen = picked ?? review?.category_id ?? "other";

  return (
    <ScreenScaffold onBack={() => router.back()} backLabel="Back" testID="detail">
      <Text
        role="display"
        color="ink"
        style={{ textAlign: "center", fontVariant: ["tabular-nums"] }}
        testID="detail-amount"
      >
        {amountLabel}
      </Text>
      <Text
        role="body"
        color="ink"
        style={{ textAlign: "center", marginTop: spacing.xs }}
        testID="detail-merchant"
      >
        {txn.merchant_name ?? "Unknown"}
      </Text>
      <View style={{ marginTop: spacing.md }}>
        <Card variant="paper" testID="detail-facts">
          <Text role="small" color="ink" style={{ fontWeight: "600" }}>
            Transaction facts
          </Text>
          <FactRow label="Bank" value={txn.bank_accounts?.display_name ?? "Unknown"} />
          <Divider />
          <FactRow
            label="Account"
            value={txn.bank_accounts?.masked_account_number ?? txn.bank_accounts?.display_name ?? "Unknown"}
          />
          <Divider />
          <FactRow label="Date" value={txn.occurred_at.slice(0, 10)} />
          <Divider />
          <FactRow label="Narration" value={txn.narration ?? "-"} />
        </Card>
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Card variant="paper" testID="detail-review">
          <Text role="small" color="ink" style={{ fontWeight: "600" }}>
            Your review
          </Text>
          <Text role="small" color="ink" style={{ opacity: 0.6, marginTop: spacing.xs }}>
            Status: {review?.status ?? "none"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm }}>
            {categories.map((c) => (
              <View key={c.id} style={{ margin: spacing.xs }}>
                <Chip
                  label={c.label}
                  selected={chosen === c.id}
                  accessibilityLabel={`Set ${c.label}`}
                  onPress={() => setPicked(c.id)}
                  testID={`detail-chip-${c.id}`}
                />
              </View>
            ))}
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Input
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Optional note"
              testID="detail-note"
            />
          </View>
          {error ? <Text role="body" color="ink">{error}</Text> : null}
          <View style={{ marginTop: spacing.md }}>
            <Button
              title={busy ? "Saving..." : "Confirm"}
              onPress={() => save(false)}
              disabled={busy}
              loading={busy}
              testID="detail-confirm"
            />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Exclude transaction"
              variant="secondary"
              onPress={() => save(true)}
              disabled={busy}
              accessibilityLabel="Exclude transaction"
              testID="detail-exclude"
            />
          </View>
        </Card>
      </View>
      {txn.transaction_reviews.length === 0 && !review ? (
        <View style={{ marginTop: spacing.md }}>
          <EmptyState
            message="No review yet. Pick a category above."
            testID="detail-noreview"
          />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}
