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

export interface DisplayNameSource {
  merchant_name?: string | null;
  normalized_merchant?: string | null;
  narration?: string | null;
}

/**
 * Row title resolution (Phase 10A.5, operator-decided order): the
 * user-confirmed display name wins; otherwise the raw provider merchant
 * name (casing preserved); then the lowercase normalized merchant (kept
 * for deterministic matching, not display); then the narration.
 */
export function resolveDisplayName(
  review: { display_name?: string | null } | null | undefined,
  txn: DisplayNameSource,
): string {
  const candidates = [
    review?.display_name,
    txn.merchant_name,
    txn.normalized_merchant,
    txn.narration,
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) return candidate;
  }
  return "Unknown";
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

/** Local calendar-month bounds for a Date: [first day, first of next). */
export function monthBoundsFor(now: Date): { startMs: number; endMs: number } {
  return {
    startMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    endMs: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
  };
}

/**
 * Subtract `back` calendar months, clamping the day to the target month's
 * length so Jan 31 minus one month is Feb 28/29, never Mar 2/3. Naive
 * `new Date(y, m - back, d)` silently rolls over, which would shift the
 * period label by a month on the 29th–31st.
 */
export function monthOffset(now: Date, back: number): Date {
  const targetMonth = now.getMonth() - back;
  const lastDay = new Date(now.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(
    now.getFullYear(),
    targetMonth,
    Math.min(now.getDate(), lastDay),
  );
}

/** The last `count` calendar months, newest first. */
export function recentMonths(now: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => monthOffset(now, i));
}

/**
 * "2026-09-01" → a local Date in that month. Budgets store `period_start`
 * as an ISO date string; parsing it with `Date.parse` yields UTC midnight,
 * which is the wrong instant in UTC+X and was one source of the Home/Budget
 * mismatch. Only the year and month are read.
 */
export function monthFromIso(iso: string): Date {
  const [year, month] = iso.split("-").map(Number);
  if (!year || !month) return new Date();
  return new Date(year, month - 1, 1);
}

export interface MonthlySpend {
  /** Budget-eligible expenses only, refunds subtracted. Never negative. */
  netMinor: number;
  /** Eligible expenses before refunds — the "gross" figure. */
  expenseMinor: number;
  /** Eligible refunds in the window. */
  refundMinor: number;
  /** Month income, regardless of budget eligibility. */
  incomeMinor: number;
  startMs: number;
  endMs: number;
}

/**
 * THE definition of "money spent in a month" (Phase 10B.5, Fix A).
 *
 * Home's hero card and the Budget screen previously computed this
 * separately and disagreed: Home used `periodSpend(...).expenseMinor`
 * (gross, refunds ignored) while Budget used `.netMinor` (refunds
 * subtracted). Budget's reading is the correct one — a refund is money that
 * came back and must not still count as spent — so this helper adopts it
 * and both screens now call it. No financial rule changed; one definition
 * is now shared instead of two.
 *
 * Rules, unchanged from the Budget engine:
 *  - only `budget_eligible` rows count;
 *  - `expense` adds, `refund` subtracts;
 *  - `internal_transfer` and `external_transfer` are never spend (the
 *    transfer pair cannot double-count);
 *  - income is summed separately and never reduced by refunds;
 *  - the window is half-open, [start, end), so boundary instants cannot
 *    land in two months.
 *
 * `month` is any date inside the wanted month; only its year/month are read.
 */
export function getMonthlySpend(
  txns: Transaction[],
  month: Date,
): MonthlySpend {
  const { startMs, endMs } = monthBoundsFor(month);
  let expenseMinor = 0;
  let refundMinor = 0;
  let incomeMinor = 0;
  for (const t of txns) {
    const at = Date.parse(t.occurred_at);
    if (at < startMs || at >= endMs) continue;
    if (t.semantic_type === "income") {
      // Income ignores budget eligibility by design: eligibility governs
      // spend, not inflow.
      incomeMinor += t.amount_minor;
      continue;
    }
    if (!t.budget_eligible) continue;
    if (t.semantic_type === "expense") expenseMinor += t.amount_minor;
    else if (t.semantic_type === "refund") refundMinor += t.amount_minor;
  }
  return {
    netMinor: Math.max(expenseMinor - refundMinor, 0),
    expenseMinor,
    refundMinor,
    incomeMinor,
    startMs,
    endMs,
  };
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

/**
 * Sample days for the monthly trend chart, e.g. [1, 10, 20, 30].
 * Parses the YYYY-MM-DD period start directly: the old
 * `new Date(monthEndMs - 1).getDate()` collapses to day 1 in UTC+X
 * timezones (Sept 30 23:59 UTC is Oct 1 locally), which stacked every
 * trend point onto a single dot. Local month-length math is exact.
 */
export function monthSampleDays(periodStartIso: string): number[] {
  const [year, month] = periodStartIso.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return [
    1,
    Math.ceil(daysInMonth / 3),
    Math.ceil((2 * daysInMonth) / 3),
    daysInMonth,
  ];
}
