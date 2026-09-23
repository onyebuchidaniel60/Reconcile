// Typed data access for screens. Reads go to Supabase under RLS;
// privileged writes go through Edge Functions. No raw SQL, no raw fetch,
// no function URLs outside this module.
import { getSupabase } from "./supabase";

export interface BankConnection {
  id: string;
  provider_id: string;
  status: string;
  last_sync_at: string | null;
}

export interface BankAccount {
  id: string;
  bank_connection_id: string;
  institution_name: string | null;
  display_name: string | null;
  masked_account_number: string | null;
  currency: string;
  current_balance_minor: number;
  available_balance_minor: number;
  status: string;
}

export interface Category {
  id: string;
  label: string;
}

export interface TxnReview {
  status: string;
  category_id: string | null;
  user_note: string | null;
}

export interface Transaction {
  id: string;
  bank_account_id: string;
  amount_minor: number;
  currency: string;
  direction: string;
  semantic_type: string;
  occurred_at: string;
  merchant_name: string | null;
  narration: string | null;
  normalized_merchant: string | null;
  budget_eligible: boolean;
  transaction_reviews: TxnReview[];
  bank_accounts?: { display_name: string | null } | null;
}

export interface ReviewItem {
  id: string;
  transaction_id: string;
  status: string;
  category_id: string | null;
  user_note: string | null;
  transaction: Transaction;
}

export interface Budget {
  id: string;
  period_start: string;
  period_end: string;
  total_limit_minor: number;
  currency: string;
}

export interface BudgetCap {
  category_id: string;
  limit_minor: number;
}

function friendly(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error("Please sign in and try again.");
  return data.user.id;
}

export async function getActiveConnection(): Promise<BankConnection | null> {
  const { data, error } = await getSupabase()
    .from("bank_connections")
    .select("id,provider_id,status,last_sync_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(friendly(error, "Could not load connection."));
  return data;
}

export async function getAccounts(): Promise<BankAccount[]> {
  const { data, error } = await getSupabase()
    .from("bank_accounts")
    .select(
      "id,bank_connection_id,institution_name,display_name,masked_account_number,currency,current_balance_minor,available_balance_minor,status",
    )
    .order("display_name");
  if (error) throw new Error(friendly(error, "Could not load accounts."));
  return data ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("id,label")
    .order("label");
  if (error) throw new Error(friendly(error, "Could not load categories."));
  return data ?? [];
}

export async function connectDemo(): Promise<{
  connection: BankConnection;
  accounts: BankAccount[];
  created: boolean;
}> {
  const { data, error } = await getSupabase().functions.invoke(
    "bank-connect-session",
    { body: { provider_id: "demo" } },
  );
  if (error) throw new Error(friendly(error, "Demo setup failed."));
  return data as { connection: BankConnection; accounts: BankAccount[]; created: boolean };
}

export async function syncConnection(
  connectionId: string,
  mode: "initial" | "manual" = "manual",
): Promise<{ seen: number; added: number; internal_transfer_pairs: number }> {
  const { data, error } = await getSupabase().functions.invoke("bank-sync", {
    body: { bank_connection_id: connectionId, mode },
  });
  if (error) throw new Error(friendly(error, "Sync failed."));
  return data as { seen: number; added: number; internal_transfer_pairs: number };
}

export async function disconnectConnection(connectionId: string): Promise<void> {
  const { error } = await getSupabase().functions.invoke("bank-disconnect", {
    body: { bank_connection_id: connectionId },
  });
  if (error) throw new Error(friendly(error, "Disconnect failed."));
}

export async function getPendingReviews(): Promise<ReviewItem[]> {
  const { data, error } = await getSupabase()
    .from("transaction_reviews")
    .select(
      "id,transaction_id,status,category_id,user_note,transaction:transactions(id,bank_account_id,amount_minor,currency,direction,semantic_type,occurred_at,merchant_name,narration,normalized_merchant,budget_eligible,bank_accounts(display_name))",
    )
    .eq("status", "needs_review")
    .order("created_at");
  if (error) throw new Error(friendly(error, "Could not load review queue."));
  return (data ?? []) as unknown as ReviewItem[];
}

export async function getReviewCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("transaction_reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "needs_review");
  if (error) throw new Error(friendly(error, "Could not count reviews."));
  return count ?? 0;
}

export async function getTransactions(limit = 200): Promise<Transaction[]> {
  const { data, error } = await getSupabase()
    .from("transactions")
    .select(
      "id,bank_account_id,amount_minor,currency,direction,semantic_type,occurred_at,merchant_name,narration,normalized_merchant,budget_eligible,transaction_reviews(status,category_id,user_note),bank_accounts(display_name)",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(friendly(error, "Could not load transactions."));
  return (data ?? []) as unknown as Transaction[];
}

export async function getTransaction(
  id: string,
): Promise<{ txn: Transaction; review: TxnReview | null }> {
  const { data, error } = await getSupabase()
    .from("transactions")
    .select(
      "id,bank_account_id,amount_minor,currency,direction,semantic_type,occurred_at,merchant_name,narration,normalized_merchant,budget_eligible,transaction_reviews(status,category_id,user_note),bank_accounts(display_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(friendly(error, "Could not load transaction."));
  if (!data) throw new Error("Transaction not found.");
  const row = data as unknown as Transaction;
  return { txn: row, review: row.transaction_reviews[0] ?? null };
}

export async function confirmReview(
  transactionId: string,
  categoryId: string,
  userNote?: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("transaction_reviews")
    .update({
      status: "reconciled",
      category_id: categoryId,
      user_note: userNote ?? null,
      confirmed_at: new Date().toISOString(),
      source: "user:confirm",
    })
    .eq("transaction_id", transactionId);
  if (error) throw new Error(friendly(error, "Could not confirm review."));
}

export async function excludeReview(transactionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("transaction_reviews")
    .update({
      status: "excluded",
      confirmed_at: new Date().toISOString(),
      source: "user:exclude",
    })
    .eq("transaction_id", transactionId);
  if (error) throw new Error(friendly(error, "Could not exclude transaction."));
}

export async function getCurrentMonthBudget(): Promise<{
  budget: Budget | null;
  caps: BudgetCap[];
}> {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data, error } = await getSupabase()
    .from("budgets")
    .select("id,period_start,period_end,total_limit_minor,currency")
    .eq("period_type", "monthly")
    .eq("period_start", start)
    .maybeSingle();
  if (error) throw new Error(friendly(error, "Could not load budget."));
  if (!data) return { budget: null, caps: [] };
  const { data: caps, error: capError } = await getSupabase()
    .from("budget_categories")
    .select("category_id,limit_minor")
    .eq("budget_id", (data as Budget).id);
  if (capError) throw new Error(friendly(capError, "Could not load budget caps."));
  return { budget: data as Budget, caps: (caps ?? []) as BudgetCap[] };
}

export async function createBudget(
  totalLimitMinor: number,
  currency: string,
  periodStart: string,
  periodEnd: string,
  caps: BudgetCap[],
): Promise<void> {
  const supabase = getSupabase();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: userId,
      period_type: "monthly",
      period_start: periodStart,
      period_end: periodEnd,
      total_limit_minor: totalLimitMinor,
      currency,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(friendly(error, "Could not save budget. It may already exist."));
  }
  if (caps.length > 0) {
    const { error: capError } = await supabase.from("budget_categories").insert(
      caps.map((c) => ({
        budget_id: (data as { id: string }).id,
        category_id: c.category_id,
        limit_minor: c.limit_minor,
      })),
    );
    if (capError) throw new Error(friendly(capError, "Budget saved, but caps failed."));
  }
}

/** "1500.50" (major units) → integer minor units. Throws on invalid input. */
export function parseMajorToMinor(raw: string): number {
  const value = Number.parseFloat(raw.replace(/[,₦\s]/g, ""));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Enter a valid non-negative amount.");
  }
  return Math.round(value * 100);
}
