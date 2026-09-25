import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  createBudget,
  getCategories,
  parseMajorToMinor,
  type Category,
} from "../src/lib/db";
import { spacing } from "../src/theme/spacing";

export default function BudgetSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState("");
  const [caps, setCaps] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Could not load categories."),
      )
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setError(null);
    let totalMinor: number;
    try {
      totalMinor = parseMajorToMinor(total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid total.");
      return;
    }
    const capRows: { category_id: string; limit_minor: number }[] = [];
    try {
      for (const [categoryId, raw] of Object.entries(caps)) {
        if (!raw.trim()) continue;
        capRows.push({ category_id: categoryId, limit_minor: parseMajorToMinor(raw) });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid category cap.");
      return;
    }
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const periodStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    const periodEnd = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    setBusy(true);
    try {
      await createBudget(totalMinor, "NGN", periodStart, periodEnd, capRows);
      router.replace("/budget");
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

  // Skeletal demo screen (rebuilt in Phase 9). The scrollable padded
  // container keeps the long category list reachable and inputs off the
  // screen edges at narrow native widths.
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
      }}
    >
      <Text>Budget setup (Demo)</Text>
      {error ? <Text>{error}</Text> : null}
      <Text>Monthly total (₦)</Text>
      <TextInput
        value={total}
        onChangeText={setTotal}
        keyboardType="numeric"
        accessibilityLabel="Monthly total"
      />
      <Text>Category caps (optional, ₦)</Text>
      {categories.map((c) => (
        <View key={c.id}>
          <Text>{c.label}</Text>
          <TextInput
            value={caps[c.id] ?? ""}
            onChangeText={(v) => setCaps((prev) => ({ ...prev, [c.id]: v }))}
            keyboardType="numeric"
            accessibilityLabel={`${c.label} cap`}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save budget"
        onPress={save}
        disabled={busy}
      >
        <Text>{busy ? "Saving..." : "Save budget"}</Text>
      </Pressable>
      <Link href="/budget">Back to budget</Link>
    </ScrollView>
  );
}
