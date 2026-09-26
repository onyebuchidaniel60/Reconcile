import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { CategoryCircle } from "../src/components/CategoryCircle";
import { ErrorState } from "../src/components/ErrorState";
import { FormScaffold } from "../src/components/FormScaffold";
import { Input } from "../src/components/Input";
import { LoadingState } from "../src/components/LoadingState";
import { Text } from "../src/components/Text";
import {
  createBudget,
  getCategories,
  getCurrentMonthBudget,
  parseMajorToMinor,
  updateBudget,
  type Category,
} from "../src/lib/db";
import { tintForLabel } from "../src/lib/txn";
import { spacing } from "../src/theme/spacing";

function nowBounds(): { start: string; end: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
    end: `${now.getFullYear()}-${pad(now.getMonth() + 2)}-01`,
  };
}

export default function BudgetSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("NGN");
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState("");
  const [caps, setCaps] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ budget, caps: capRows }, cats] = await Promise.all([
      getCurrentMonthBudget(),
      getCategories(),
    ]);
    return { budget, capRows, cats };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { budget, capRows, cats } = await fetchData();
      setCategories(cats);
      setBudgetId(budget?.id ?? null);
      setCurrency(budget?.currency ?? "NGN");
      setTotal(
        budget ? (budget.total_limit_minor / 100).toString() : "",
      );
      const next: Record<string, string> = {};
      for (const cap of capRows) next[cap.category_id] = (cap.limit_minor / 100).toString();
      setCaps(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load budget setup.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { budget, capRows, cats } = await fetchData();
        if (!active) return;
        setCategories(cats);
        setBudgetId(budget?.id ?? null);
        setCurrency(budget?.currency ?? "NGN");
        setTotal(budget ? (budget.total_limit_minor / 100).toString() : "");
        const next: Record<string, string> = {};
        for (const cap of capRows) next[cap.category_id] = (cap.limit_minor / 100).toString();
        setCaps(next);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load budget setup.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

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
    const { start, end } = nowBounds();
    setBusy(true);
    try {
      if (budgetId) {
        await updateBudget(budgetId, totalMinor, capRows);
      } else {
        await createBudget(totalMinor, currency, start, end, capRows);
      }
      router.replace("/budget");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScaffold
      titleFirst="Set"
      titleSecond="Budget"
      subtitle="Set a monthly total and optional caps per category."
      ctaTitle="Save"
      ctaVariant="secondary"
      onCta={save}
      ctaDisabled={busy || loading}
      ctaLoading={busy}
      testID="budget-setup"
    >
      {loading ? (
        <LoadingState variant="row-list" testID="budget-setup-loading" />
      ) : error && categories.length === 0 ? (
        <ErrorState message={error} onRetry={refresh} testID="budget-setup-error" />
      ) : (
        <View>
          <Input
            label="Monthly total"
            value={total}
            onChangeText={setTotal}
            keyboardType="numeric"
            placeholder="250000"
            error={error}
            testID="budget-setup-total"
          />
          <Text role="small" color="ink" style={{ fontWeight: "600", marginTop: spacing.md }}>
            Category caps (optional)
          </Text>
          {categories.map((c) => (
            <View
              key={c.id}
              style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm }}
            >
              <CategoryCircle category={tintForLabel(c.label)} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Input
                  label={c.label}
                  value={caps[c.id] ?? ""}
                  onChangeText={(v) => setCaps((prev) => ({ ...prev, [c.id]: v }))}
                  keyboardType="numeric"
                  placeholder="0"
                  testID={`budget-setup-cap-${c.id}`}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </FormScaffold>
  );
}
