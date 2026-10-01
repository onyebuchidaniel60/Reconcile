// POST /functions/v1/bank-sync
//
// Manual/initial sync, routed through the provider registry so this function
// does not know which provider is running (Phase 11 objective).
//
// Pipeline (ARCHITECTURE.md §5):
//   authenticate -> verify connection ownership -> rate limit -> record run ->
//   provider fetch (paged) -> normalise + validate -> dedupe on the unique key
//   -> persist immutable ledger -> detect internal transfers -> review state ->
//   record run result -> stamp last_sync_at
//
// Idempotent: re-running inserts zero new transactions. Rate limited: 10
// attempts per user per minute, enforced against sync_runs so the limit holds
// across concurrent function instances.
//
// The client supplies only a connection id. Everything about the provider —
// which adapter, which upstream ids — is resolved server-side from the
// connection row, and the row is filtered by user_id so a client cannot sync
// someone else's connection.

import { requireUser } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";
import { checkSyncRateLimit, SYNC_RATE_LIMIT } from "../_shared/rateLimit.ts";
import { isMonoEnabled } from "../_shared/flags.ts";
import { ingestTransactions, type TaggedTransaction } from "../_shared/ingest.ts";
import { getProvider, DEMO_PROVIDER_ID } from "../_shared/providers/registry.ts";
import { buildDemoDataset, type DemoTransaction } from "../_shared/demo.ts";
import { MonoError } from "../_shared/providers/mono/client.ts";

/** Page budget per account per sync. Bounds both cost and runtime. */
const MAX_PAGES_PER_ACCOUNT = 5;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return preflight();
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

  // Ownership is enforced here: the row must belong to the caller.
  const { data: connection } = await client
    .from("bank_connections")
    .select("id,status,provider_id,provider_connection_id")
    .eq("id", body.bank_connection_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) {
    return errResponse(404, "SYNC_NOT_FOUND", "That connection was not found.", false);
  }
  if (connection.status !== "active") {
    // reauth_required gets its own code so the client can prompt to reconnect
    // rather than showing a generic failure.
    if (connection.status === "reauth_required") {
      return errResponse(
        409,
        "SYNC_REAUTH_REQUIRED",
        "Please reconnect this bank to keep it up to date.",
        false,
      );
    }
    return errResponse(
      409,
      "SYNC_CONNECTION_NOT_ACTIVE",
      "That connection is not active.",
      false,
    );
  }

  const isMono = connection.provider_id !== DEMO_PROVIDER_ID;
  if (isMono && !isMonoEnabled()) {
    return errResponse(
      404,
      "SYNC_PROVIDER_DISABLED",
      "Real bank connections are not available yet.",
      false,
    );
  }

  const limit = await checkSyncRateLimit(client, userId, SYNC_RATE_LIMIT);
  if (!limit.allowed) {
    return errResponse(
      429,
      "SYNC_RATE_LIMITED",
      "You're syncing too often. Please wait a moment and try again.",
      true,
    );
  }

  const provider = getProvider(connection.provider_id);
  if (!provider) {
    return errResponse(
      500,
      "SERVER_MISCONFIGURED",
      "The service is not configured. Please try again later.",
      false,
    );
  }

  const { data: accounts } = await client
    .from("bank_accounts")
    .select("id,provider_account_id,status")
    .eq("bank_connection_id", connection.id);

  if (!accounts || accounts.length === 0) {
    return errResponse(
      500,
      "SYNC_NO_ACCOUNTS",
      "No accounts were found for that connection.",
      true,
    );
  }
  const accountIdByProvider: Record<string, string> = {};
  for (const a of accounts) accountIdByProvider[a.provider_account_id] = a.id;

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

  const fail = async (code: string, message: string, retryable = true): Promise<Response> => {
    if (run) {
      await client
        .from("sync_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_code: code,
        })
        .eq("id", run.id);
    }
    return errResponse(500, code, message, retryable);
  };

  // ---- fetch + normalise -------------------------------------------------
  let tagged: TaggedTransaction[];
  try {
    if (isMono) {
      tagged = [];
      for (const account of accounts) {
        const page = await provider.listTransactions({
          providerAccountId: account.provider_account_id,
          maxPages: MAX_PAGES_PER_ACCOUNT,
        });
        for (const transaction of page.transactions) {
          tagged.push({
            providerAccountId: account.provider_account_id,
            transaction,
          });
        }
      }
    } else {
      // The demo fixture is synthetic and deterministic; it is not paged.
      const dataset = buildDemoDataset(Date.now());
      tagged = (dataset.transactions as DemoTransaction[]).map((t) => ({
        providerAccountId: demoProviderAccountId(t.accountKey, userId),
        transaction: t,
      }));
    }
  } catch (error) {
    if (error instanceof MonoError) {
      await fail(error.code, "We could not refresh this bank right now.", error.retryable);
      return errResponse(
        error.retryable ? 503 : 502,
        error.code,
        "We could not refresh this bank right now.",
        error.retryable,
      );
    }
    return await fail("SYNC_FETCH_FAILED", "We could not refresh this bank right now.");
  }

  // ---- ingest ------------------------------------------------------------
  let result;
  try {
    result = await ingestTransactions(client, {
      userId,
      providerId: connection.provider_id,
      accountIdByProvider,
      transactions: tagged,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "SYNC_INGEST_FAILED";
    return await fail(code, "We could not save the new transactions.");
  }

  if (run) {
    await client
      .from("sync_runs")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        transactions_seen: result.seen,
        transactions_added: result.inserted,
      })
      .eq("id", run.id);
  }

  await client
    .from("bank_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", connection.id);

  return json({
    seen: result.seen,
    added: result.inserted,
    rejected: result.rejected,
    internal_transfer_pairs: result.internalTransferPairs,
    run_id: run?.id ?? null,
  });
});

/** Mirrors the demo fixture's provider account id scheme. */
function demoProviderAccountId(accountKey: string, userId: string): string {
  return `demo_${accountKey}_${userId.slice(0, 8)}`;
}
