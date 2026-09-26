// Transaction display mapping for rebuilt screens (Phase 8). Pure
// presentation helpers over already-fetched demo rows: no queries here.
import type { CategoryTintName } from "../theme/colors";
import type { TransactionDirection } from "../components/TransactionRow";
import type { Category, Transaction } from "./db";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

/** Semantic type → row direction (unknown/external read as expense). */
export function directionFor(txn: Transaction): TransactionDirection {
  if (txn.semantic_type === "income") return "income";
  if (txn.semantic_type === "refund") return "refund";
  if (txn.semantic_type === "internal_transfer") return "internal_transfer";
  return "expense";
}

function isTintName(label: string): label is CategoryTintName {
  return (
    label === "Food" ||
    label === "Transport" ||
    label === "Bills" ||
    label === "Shopping" ||
    label === "Entertainment" ||
    label === "Health" ||
    label === "Personal" ||
    label === "Education" ||
    label === "Family" ||
    label === "Income" ||
    label === "Internal Transfer"
  );
}

/** Canonical label → circle tint, defaulting to Shopping. */
export function tintForLabel(label: string): CategoryTintName {
  return isTintName(label) ? label : "Shopping";
}

/**
 * Review category (or semantic fallback) → tinted circle category.
 * Accepts an explicit suggestion id (review rows carry it outside the
 * transaction embed, which may not include reviews at all). Falls back to
 * Shopping for unknown expense categories.
 */
export function categoryTintFor(
  txn: Transaction,
  categories: Category[],
  explicitCategoryId?: string | null,
): CategoryTintName {
  if (txn.semantic_type === "internal_transfer") return "Internal Transfer";
  const embedded = txn.transaction_reviews?.[0]?.category_id;
  const categoryId = explicitCategoryId ?? embedded ?? null;
  if (categoryId) {
    const label = categories.find((c) => c.id === categoryId)?.label;
    if (label) return tintForLabel(label);
  }
  if (txn.semantic_type === "income") return "Income";
  return "Shopping";
}

/** "2026-09-14T.." → "Sept 14". Used under transaction merchant names. */
export function formatRowDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Month income by semantic type and window. Unlike spend, income ignores the
 * budget-eligibility flag — income rows are marked ineligible because
 * eligibility governs spend, not inflow.
 */
export function periodIncome(
  txns: Transaction[],
  startMs: number,
  endMs: number,
): number {
  let income = 0;
  for (const t of txns) {
    const at = Date.parse(t.occurred_at);
    if (at < startMs || at >= endMs) continue;
    if (t.semantic_type === "income") income += t.amount_minor;
  }
  return income;
}

/** Current month label for hero cards, e.g. "September 2026". */
export function formatPeriodLabel(now: Date): string {
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

/** Month bound label, e.g. "Sept 1, 2026". */
export function formatBoundLabel(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Short month label for chart axes, e.g. "Sept". */
export function formatMonthAbbrev(date: Date): string {
  return SHORT_MONTHS[date.getMonth()];
}
