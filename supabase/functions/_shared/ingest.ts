// Post-fetch ingestion: persist normalised transactions, detect internal
// transfers, and create review state.
//
// Extracted from bank-sync so the demo and Mono providers run byte-identical
// logic after normalisation. Business rules stay deterministic and are
// unchanged from the demo phase (AGENTS.md: financial rules deterministic,
// provider transaction facts immutable, ambiguous cases stay reviewable).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  categorize,
  findInternalTransferPairs,
  validateNormalized,
  type NormalizedTransaction,
  type TransferCandidate,
} from "./finance.ts";

export interface IngestResult {
  seen: number;
  /** Rows that failed `validateNormalized` and were refused. */
  rejected: number;
  inserted: number;
  internalTransferPairs: number;
  reviewsCreated: number;
}

export interface TaggedTransaction {
  /** The provider account this transaction was fetched for. */
  providerAccountId: string;
  transaction: NormalizedTransaction;
}

export interface IngestInput {
  userId: string;
  providerId: string;
  /** provider account id -> local bank_accounts row id */
  accountIdByProvider: Record<string, string>;
  transactions: TaggedTransaction[];
}

/**
 * Idempotent by construction. Every step upserts on an existing unique key:
 *   transactions       (provider_id, bank_account_id, provider_transaction_id)
 *   transaction_reviews(transaction_id)
 * so re-running a sync inserts zero new rows.
 */
export async function ingestTransactions(
  client: SupabaseClient,
  input: IngestInput,
): Promise<IngestResult> {
  const { userId, providerId } = input;
  const seen = input.transactions.length;

  // Resolve and validate before anything is written. A transaction that fails
  // validation, or that names an account we do not hold, is dropped here and
  // never reaches the ledger.
  const valid: Array<NormalizedTransaction & { bankAccountId: string }> = [];
  let rejected = 0;
  for (const tagged of input.transactions) {
    const bankAccountId = input.accountIdByProvider[tagged.providerAccountId];
    if (bankAccountId === undefined) {
      rejected++;
      continue;
    }
    if (validateNormalized(tagged.transaction).length > 0) {
      rejected++;
      continue;
    }
    valid.push({ ...tagged.transaction, bankAccountId });
  }

  let inserted = 0;
  if (valid.length > 0) {
    const rows = valid.map((t) => ({
      user_id: userId,
      bank_account_id: t.bankAccountId,
      provider_id: providerId,
      provider_transaction_id: t.providerTransactionId,
      amount_minor: t.amountMinor,
      currency: t.currency,
      direction: t.direction,
      semantic_type: t.semanticType,
      occurred_at: t.occurredAt,
      merchant_name: t.merchantName,
      narration: t.narration,
      normalized_merchant: t.normalizedMerchant,
      budget_eligible: t.budgetEligible,
    }));
    const { data, error } = await client
      .from("transactions")
      .upsert(rows, {
        onConflict: "provider_id,bank_account_id,provider_transaction_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      throw new Error("SYNC_INSERT_FAILED");
    }
    inserted = data?.length ?? 0;
  }

  // Full ledger snapshot for transfer detection and review backfill. Reading
  // the whole ledger is acceptable here because it is scoped to one user and
  // the demo/Mono volumes per user are small; a large product would page this.
  const { data: ledger, error: ledgerError } = await client
    .from("transactions")
    .select(
      "id,bank_account_id,direction,amount_minor,occurred_at,semantic_type,normalized_merchant,narration",
    )
    .eq("user_id", userId);
  if (ledgerError) {
    throw new Error("SYNC_LEDGER_FAILED");
  }

  // High-confidence internal-transfer pairs first, so both members land
  // reconciled rather than needs_review.
  const candidates: TransferCandidate[] = (ledger ?? []).map((r) => ({
    id: r.id,
    bankAccountId: r.bank_account_id,
    direction: r.direction,
    amountMinor: Number(r.amount_minor),
    occurredAtMs: Date.parse(r.occurred_at),
    semanticType: r.semantic_type,
  }));
  const pairs = findInternalTransferPairs(candidates);
  for (const [a, b] of pairs) {
    const { error: pairError } = await client
      .from("transactions")
      .update({ semantic_type: "internal_transfer", budget_eligible: false })
      .in("id", [a.id, b.id]);
    if (pairError) {
      throw new Error("SYNC_TRANSFER_FAILED");
    }
    const { error: reviewError } = await client.from("transaction_reviews").upsert(
      [a.id, b.id].map((id) => ({
        transaction_id: id,
        user_id: userId,
        status: "reconciled",
        category_id: "internal_transfer",
        source: "system:internal_transfer",
        confirmed_at: new Date().toISOString(),
      })),
      { onConflict: "transaction_id", ignoreDuplicates: true },
    );
    if (reviewError) {
      throw new Error("SYNC_TRANSFER_FAILED");
    }
  }

  // Review state for every transaction still missing one. Self-healing: covers
  // fresh inserts and any earlier partial failure.
  const { data: reviewed } = await client
    .from("transaction_reviews")
    .select("transaction_id")
    .eq("user_id", userId);
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.transaction_id));
  const missing = (ledger ?? []).filter((t) => !reviewedIds.has(t.id));
  let reviewsCreated = 0;
  if (missing.length > 0) {
    const { data: rules } = await client
      .from("merchant_rules")
      .select("merchant_key,category_id")
      .eq("user_id", userId);
    const ruleMap = new Map((rules ?? []).map((r) => [r.merchant_key, r.category_id]));
    const reviews = missing.map((t) => {
      const suggestion = categorize({
        merchantKey: t.normalized_merchant ?? "",
        normalizedMerchant: t.normalized_merchant ?? "",
        narration: t.narration ?? "",
        userRuleCategoryId: ruleMap.get(t.normalized_merchant ?? ""),
      });
      return {
        transaction_id: t.id,
        user_id: userId,
        status: "needs_review",
        category_id: suggestion.categoryId,
        source: `suggestion:${suggestion.source}`,
      };
    });
    const { error: reviewError } = await client.from("transaction_reviews").upsert(reviews, {
      onConflict: "transaction_id",
      ignoreDuplicates: true,
    });
    if (reviewError) {
      throw new Error("SYNC_REVIEWS_FAILED");
    }
    reviewsCreated = missing.length;
  }

  return {
    seen,
    rejected,
    inserted,
    internalTransferPairs: pairs.length,
    reviewsCreated,
  };
}
