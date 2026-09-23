// Reconcile deterministic finance core — pure TypeScript, zero imports.
// Shared by Supabase Edge Functions (Deno) and the mobile app (Metro) and
// unit-tested with jest. No secrets, no I/O, no logging of financial data.

export type Direction = "credit" | "debit";

export type SemanticType =
  | "income"
  | "expense"
  | "external_transfer"
  | "internal_transfer"
  | "refund"
  | "unknown";

export type ReviewStatus = "needs_review" | "reconciled" | "excluded";

export type CategorySource =
  | "user_rule"
  | "pattern"
  | "deterministic"
  | "other";

export interface NormalizedTransaction {
  providerTransactionId: string;
  amountMinor: number;
  currency: string;
  direction: Direction;
  semanticType: SemanticType;
  occurredAt: string;
  merchantName: string;
  narration: string;
  normalizedMerchant: string;
  budgetEligible: boolean;
}

// ------------------------------------------------------------------ money
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
  KES: "KSh",
};

export function isValidMinorAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

/** Integer minor units → display string. Formatting only at this boundary. */
export function formatMinor(amountMinor: number, currency: string): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("formatMinor expects integer minor units.");
  }
  const major = (amountMinor / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${major}`;
}

// ------------------------------------------------------------- normalize
export function normalizeMerchantName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// -------------------------------------------------------------- validate
export function validateNormalized(
  t: NormalizedTransaction,
): string[] {
  const errors: string[] = [];
  if (!t.providerTransactionId) errors.push("providerTransactionId required");
  if (!isValidMinorAmount(t.amountMinor)) errors.push("amountMinor invalid");
  if (!/^[A-Z]{3}$/.test(t.currency)) errors.push("currency invalid");
  if (t.direction !== "credit" && t.direction !== "debit") {
    errors.push("direction invalid");
  }
  if (Number.isNaN(Date.parse(t.occurredAt))) errors.push("occurredAt invalid");
  return errors;
}

// ------------------------------------------------------------ categorize
interface SeedRule {
  match: string;
  category: string;
}

// Ordered: first substring match wins. Nigerian merchant coverage.
const SEED_RULES: SeedRule[] = [
  { match: "salary", category: "income" },
  { match: "freelance", category: "income" },
  { match: "interest", category: "income" },
  { match: "bolt", category: "transport" },
  { match: "uber", category: "transport" },
  { match: "lagride", category: "transport" },
  { match: "dstv", category: "entertainment" },
  { match: "showmax", category: "entertainment" },
  { match: "netflix", category: "entertainment" },
  { match: "spotify", category: "entertainment" },
  { match: "apple music", category: "entertainment" },
  { match: "filmhouse", category: "entertainment" },
  { match: "genesis cinema", category: "entertainment" },
  { match: "mtn", category: "bills" },
  { match: "airtel", category: "bills" },
  { match: "glo", category: "bills" },
  { match: "9mobile", category: "bills" },
  { match: "ikedc", category: "bills" },
  { match: "eko electricity", category: "bills" },
  { match: "ibedc", category: "bills" },
  { match: "lawma", category: "bills" },
  { match: "shoprite", category: "food" },
  { match: "spar", category: "food" },
  { match: "ebeano", category: "food" },
  { match: "chicken republic", category: "food" },
  { match: "domino", category: "food" },
  { match: "kfc", category: "food" },
  { match: "the place", category: "food" },
  { match: "jumia", category: "shopping" },
  { match: "konga", category: "shopping" },
  { match: "zara", category: "shopping" },
  { match: "hospital", category: "health" },
  { match: "pharmacy", category: "health" },
  { match: "medplus", category: "health" },
  { match: "school", category: "education" },
  { match: "university", category: "education" },
  { match: "udemy", category: "education" },
  { match: "transfer", category: "external_transfer" },
];

export interface CategorizeInput {
  merchantKey: string;
  normalizedMerchant: string;
  narration: string;
  userRuleCategoryId?: string;
  priorPatternCategoryId?: string;
}

export function categorize(input: CategorizeInput): {
  categoryId: string;
  source: CategorySource;
} {
  if (input.userRuleCategoryId) {
    return { categoryId: input.userRuleCategoryId, source: "user_rule" };
  }
  if (input.priorPatternCategoryId) {
    return { categoryId: input.priorPatternCategoryId, source: "pattern" };
  }
  const haystack = `${input.normalizedMerchant} ${normalizeMerchantName(input.narration)}`;
  for (const rule of SEED_RULES) {
    if (haystack.includes(rule.match)) {
      return { categoryId: rule.category, source: "deterministic" };
    }
  }
  return { categoryId: "other", source: "other" };
}

// ------------------------------------------------------- transfer match
export interface TransferCandidate {
  id: string;
  bankAccountId: string;
  direction: Direction;
  amountMinor: number;
  occurredAtMs: number;
  semanticType: SemanticType;
}

const TRANSFER_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * High-confidence internal-transfer pairs only: same user (caller filters),
 * two different accounts, opposite directions, equal absolute amounts,
 * occurred within 48h. Each transaction matches at most one pair.
 * Ambiguous cases are left unmatched (stay reviewable).
 */
export function findInternalTransferPairs(
  rows: TransferCandidate[],
): Array<[TransferCandidate, TransferCandidate]> {
  // Defense in depth: ignore malformed rows (e.g. undefined amounts from a
  // bad mapping) rather than matching everything to everything.
  const sane = rows.filter(
    (r) =>
      Number.isInteger(r.amountMinor) &&
      r.amountMinor > 0 &&
      Number.isFinite(r.occurredAtMs),
  );
  const debits = sane
    .filter((r) => r.direction === "debit" && r.semanticType !== "internal_transfer")
    .sort((a, b) => a.occurredAtMs - b.occurredAtMs);
  const credits = rows
    .filter((r) => r.direction === "credit" && r.semanticType !== "internal_transfer")
    .sort((a, b) => a.occurredAtMs - b.occurredAtMs);
  const used = new Set<string>();
  const pairs: Array<[TransferCandidate, TransferCandidate]> = [];
  for (const debit of debits) {
    if (used.has(debit.id)) continue;
    const match = credits.find(
      (credit) =>
        !used.has(credit.id) &&
        credit.bankAccountId !== debit.bankAccountId &&
        credit.amountMinor === debit.amountMinor &&
        Math.abs(credit.occurredAtMs - debit.occurredAtMs) <= TRANSFER_WINDOW_MS,
    );
    if (match) {
      used.add(debit.id);
      used.add(match.id);
      pairs.push([debit, match]);
    }
  }
  return pairs;
}

// ---------------------------------------------------------------- dedupe
export function dedupeKey(
  providerId: string,
  bankAccountId: string,
  providerTransactionId: string,
): string {
  return `${providerId}::${bankAccountId}::${providerTransactionId}`;
}

// ---------------------------------------------------------------- budget
export interface SpendRow {
  semanticType: SemanticType;
  categoryId?: string;
  amountMinor: number;
  occurredAtMs: number;
  budgetEligible: boolean;
}

export interface PeriodSpend {
  expenseMinor: number;
  refundMinor: number;
  netMinor: number;
}

/** Refunds reduce eligible spend. Internal transfers never count. */
export function periodSpend(
  rows: SpendRow[],
  startMs: number,
  endMs: number,
): PeriodSpend {
  let expenseMinor = 0;
  let refundMinor = 0;
  for (const row of rows) {
    if (!row.budgetEligible) continue;
    if (row.occurredAtMs < startMs || row.occurredAtMs >= endMs) continue;
    if (row.semanticType === "expense") expenseMinor += row.amountMinor;
    if (row.semanticType === "refund") refundMinor += row.amountMinor;
  }
  return { expenseMinor, refundMinor, netMinor: expenseMinor - refundMinor };
}

export function remainingBudget(
  totalLimitMinor: number,
  netSpendMinor: number,
): number {
  return totalLimitMinor - netSpendMinor;
}

/**
 * Deterministic spend-pace forecast. Returns null when there is insufficient
 * elapsed-period data (under 15% elapsed) or the period has ended.
 */
export function forecastSpend(
  netSpendMinor: number,
  periodStartMs: number,
  periodEndMs: number,
  nowMs: number,
): number | null {
  if (periodEndMs <= periodStartMs) return null;
  const elapsed = (nowMs - periodStartMs) / (periodEndMs - periodStartMs);
  if (elapsed < 0.15 || elapsed >= 1) return null;
  return Math.round(netSpendMinor / elapsed);
}

export function categorySpend(
  rows: SpendRow[],
  categoryId: string,
  startMs: number,
  endMs: number,
): number {
  let total = 0;
  for (const row of rows) {
    if (!row.budgetEligible) continue;
    if (row.categoryId !== categoryId) continue;
    if (row.occurredAtMs < startMs || row.occurredAtMs >= endMs) continue;
    if (row.semanticType === "expense") total += row.amountMinor;
    if (row.semanticType === "refund") total -= row.amountMinor;
  }
  return total;
}
