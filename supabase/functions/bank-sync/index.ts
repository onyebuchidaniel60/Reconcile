// POST /functions/v1/bank-sync
// Manual/initial sync for the demo provider. Authenticates the caller,
// verifies connection ownership server-side, then:
// fetch (demo fixture) → normalize → validate → dedupe → insert unseen →
// create review state → detect internal transfers → write sync_runs row.
// Idempotent: re-running inserts zero new transactions.
import { requireUser } from "../_shared/auth.ts";
import { buildDemoDataset } from "../_shared/demo.ts";
import { errResponse } from "../_shared/envelope.ts";
import {
  categorize,
  findInternalTransferPairs,
  validateNormalized,
  type TransferCandidate,
} from "../_shared/finance.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }
  if (req.method !== "POST") {
    return errResponse(405, "METHOD_NOT_ALLOWED", "Use POST.", false);
  }
  const authed = await requireUser(req);
  if (authed instanceof Response) return authed;
  const { client, userId } = authed;

  let body: { bank_connection_id?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return errResponse(400, "INVALID_INPUT", "Request body must be JSON.", false);
  }
  if (!body.bank_connection_id) {
    return errResponse(400, "INVALID_INPUT", "bank_connection_id is required.", false);
  }
  const mode = body.mode === "initial" ? "initial" : "manual";

  const { data: connection } = await client
    .from("bank_connections")
    .select("id,status")
    .eq("id", body.bank_connection_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) {
    return errResponse(404, "SYNC_NOT_FOUND", "That connection was not found.", false);
  }
  if (connection.status !== "active") {
    return errResponse(
      409,
      "SYNC_CONNECTION_NOT_ACTIVE",
      "That connection is not active.",
      false,
    );
  }

  const { data: run } = await client
    .from("sync_runs")
    .insert({
      user_id: userId,
      bank_connection_id: connection.id,
      mode,
      status: "started",
    })
    .select("id")
    .single();

  const fail = async (code: string, message: string): Promise<Response> => {
    if (run) {
      await client
        .from("sync_runs")
        .update({ status: "failed", completed_at: new Date().toISOString(), error_code: code })
        .eq("id", run.id);
    }
    return errResponse(500, code, message, true);
  };

  const { data: accounts } = await client
    .from("bank_accounts")
    .select("id,provider_account_id")
    .eq("bank_connection_id", connection.id);

  if (!accounts || accounts.length === 0) {
    return await fail("SYNC_NO_ACCOUNTS", "No accounts were found for that connection.");
  }
  const accountIdByProvider: Record<string, string> = {};
  for (const a of accounts) accountIdByProvider[a.provider_account_id] = a.id;

  const dataset = buildDemoDataset(Date.now());
  const seen = dataset.transactions.length;
  const valid = dataset.transactions.filter((t) => {
    if (accountIdByKey(accountIdByProvider, userId, t.accountKey) === undefined) {
      return false;
    }
    return validateNormalized(t).length === 0;
  });

  // Existing keys for dedupe.
  const { data: existingRows } = await client
    .from("transactions")
    .select("bank_account_id,provider_transaction_id")
    .eq("user_id", userId);
  const existing = new Set(
    (existingRows ?? []).map(
      (r) => `demo::${r.bank_account_id}::${r.provider_transaction_id}`,
    ),
  );

  const fresh = valid.filter((t) => {
    const bankAccountId = accountIdByKey(accountIdByProvider, userId, t.accountKey);
    return bankAccountId !== undefined &&
      !existing.has(`demo::${bankAccountId}::${t.providerTransactionId}`);
  });

  let added = 0;
  if (fresh.length > 0) {
    const rows = fresh.map((t) => ({
      user_id: userId,
      bank_account_id: accountIdByKey(accountIdByProvider, userId, t.accountKey),
      provider_id: "demo",
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
    const { data: inserted, error: insertError } = await client
      .from("transactions")
      .upsert(rows, {
        onConflict: "provider_id,bank_account_id,provider_transaction_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (insertError) {
      return await fail("SYNC_INSERT_FAILED", "We could not save the new transactions.");
    }
    added = inserted?.length ?? 0;
  }

  // Ledger snapshot for transfer detection and review backfill.
  const { data: ledger } = await client
    .from("transactions")
    .select(
      "id,bank_account_id,direction,amount_minor,occurred_at,semantic_type,normalized_merchant,narration",
    )
    .eq("user_id", userId);

  // High-confidence internal-transfer detection first, so pair members land
  // reconciled instead of needs_review.
  const ledgerCandidates: TransferCandidate[] = (ledger ?? []).map((r) => ({
    id: r.id,
    bankAccountId: r.bank_account_id,
    direction: r.direction,
    amountMinor: r.amount_minor,
    occurredAtMs: Date.parse(r.occurred_at),
    semanticType: r.semantic_type,
  }));
  const pairs = findInternalTransferPairs(ledgerCandidates);
  for (const [a, b] of pairs) {
    const { error: pairError } = await client
      .from("transactions")
      .update({ semantic_type: "internal_transfer", budget_eligible: false })
      .in("id", [a.id, b.id]);
    if (pairError) {
      return await fail("SYNC_TRANSFER_FAILED", "We could not flag internal transfers.");
    }
    const { error: pairReviewError } = await client.from("transaction_reviews").upsert(
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
    if (pairReviewError) {
      return await fail("SYNC_TRANSFER_FAILED", "We could not flag internal transfers.");
    }
  }

  // Review state for every transaction still missing one. Self-healing:
  // covers fresh inserts and any earlier partial failure.
  const { data: reviewed } = await client
    .from("transaction_reviews")
    .select("transaction_id")
    .eq("user_id", userId);
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.transaction_id));
  const missing = (ledger ?? []).filter((t) => !reviewedIds.has(t.id));
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
      return await fail("SYNC_REVIEWS_FAILED", "We could not create the review queue.");
    }
  }

  if (run) {
    await client
      .from("sync_runs")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        transactions_seen: seen,
        transactions_added: added,
      })
      .eq("id", run.id);
  }

  await client
    .from("bank_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", connection.id);

  return json({ seen, added, internal_transfer_pairs: pairs.length, run_id: run?.id ?? null });
});

function accountIdByKey(
  byProvider: Record<string, string>,
  userId: string,
  key: string,
): string | undefined {
  return byProvider[`demo_${key}_${userId.slice(0, 8)}`];
}

function cors(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: cors() });
}
