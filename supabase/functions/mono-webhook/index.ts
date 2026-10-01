// POST /functions/v1/mono-webhook
//
// NOTE on the path: ARCHITECTURE.md §8 names this `POST /functions/v1/mono/webhook`,
// but the Supabase CLI rejects a nested slug
// (InvalidFunctionDeploySlugError: slugs must match ^[A-Za-z][A-Za-z0-9_-]*$).
// The deployed URL is therefore /functions/v1/mono-webhook. Register that in
// the Mono dashboard.
//
// Phase 11. Receives Mono Connect webhooks.
//
// AUTHENTICITY. Mono Connect has no request signature. The documented check is
// a shared secret sent in the `mono-webhook-secret` header, compared against
// the value Mono generated for this webhook URL in the dashboard. That secret
// arrives as the MONO_WEBHOOK_SECRET function secret. Until the operator sets
// it, every request is refused — fail-closed, which is correct.
//
// IDEMPOTENCY. provider_events has a unique (provider_id, provider_event_id).
// The row is inserted BEFORE any work; a conflict means Mono retried a
// delivery we already handled, so we return 200 and do nothing. That ordering
// is what makes a redelivery safe: we never process before recording.
//
// TRUST. The body is not parsed as an event until the secret matches.
//
// RESPONSES. 200 on success and on duplicate. 401 on verification failure.
// 404 while the feature flag is off. 500 on an internal error, so Mono retries.
//
// Documented events handled:
//   mono.events.account_connected     -> persist account + refresh balance
//   mono.events.account_linked         -> alias, accepted (not a Mono name)
//   mono.events.account_updated        -> refresh balance; sync when new data
//   mono.events.account_reauthorized   -> clear reauth_required
//   mono.events.account_unlinked       -> mark revoked

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";
import { isMonoEnabled } from "../_shared/flags.ts";
import { ingestTransactions } from "../_shared/ingest.ts";
import {
  fetchAccount,
  hashPayload,
  parseWebhookEvent,
  verifyWebhookSecret,
  MonoError,
} from "../_shared/providers/mono/client.ts";
import { upsertAccounts } from "../_shared/providers/persist.ts";
import { getProvider, MONO_PROVIDER_ID } from "../_shared/providers/registry.ts";

const PROVIDER_ID = MONO_PROVIDER_ID;
/** Page budget for a webhook-driven sync. Kept small: this runs on Mono's clock. */
const WEBHOOK_SYNC_MAX_PAGES = 3;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return errResponse(405, "METHOD_NOT_ALLOWED", "Use POST.", false);
  }

  // Flag off => the endpoint does not exist as far as the outside is concerned.
  if (!isMonoEnabled()) {
    return errResponse(404, "NOT_FOUND", "Not found.", false);
  }

  // ---- 1. Verify before parsing -----------------------------------------
  const verification = verifyWebhookSecret(
    req.headers.get("mono-webhook-secret"),
    Deno.env.get("MONO_WEBHOOK_SECRET"),
  );
  if (!verification.ok) {
    // "not configured" is an operator action and retryable; "mismatch" or
    // "missing header" is a rejected caller and is not.
    const unconfigured = verification.reason === "not_configured";
    if (unconfigured) {
      console.error(
        JSON.stringify({
          provider: PROVIDER_ID,
          event: "webhook_secret_not_configured",
          hint: "set MONO_WEBHOOK_SECRET from the Mono dashboard webhook config",
        }),
      );
    }
    return errResponse(
      unconfigured ? 503 : 401,
      unconfigured ? "WEBHOOK_NOT_CONFIGURED" : "WEBHOOK_UNVERIFIED",
      "Webhook rejected.",
      unconfigured,
    );
  }

  // ---- 2. Raw body, then parse -----------------------------------------
  const raw = await req.text();
  const payloadHash = await hashPayload(raw);
  const event = parseWebhookEvent(safeJson(raw));
  if (!event) {
    return errResponse(400, "INVALID_INPUT", "Unrecognised webhook payload.", false);
  }

  let client: SupabaseClient;
  try {
    client = serviceClient();
  } catch {
    return errResponse(
      500,
      "SERVER_MISCONFIGURED",
      "The service is not configured. Please try again later.",
      true,
    );
  }

  // ---- 3. Claim the event (idempotency) ---------------------------------
  const claim = await client
    .from("provider_events")
    .insert({
      provider_id: PROVIDER_ID,
      provider_event_id: event.eventId,
      event_type: event.event,
      payload_hash: payloadHash,
      status: "received",
    })
    .select("id")
    .single();

  if (claim.error) {
    // 23505 = unique violation => this delivery was already handled.
    if (claim.error.code === "23505") {
      return json({ ok: true, duplicate: true });
    }
    return errResponse(500, "WEBHOOK_STORE_FAILED", "Webhook failed.", true);
  }
  const eventRowId = claim.data?.id as string | undefined;

  // ---- 4. Process -------------------------------------------------------
  try {
    const outcome = await handleEvent(client, event);
    await client
      .from("provider_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", eventRowId);
    return json({ ok: true, duplicate: false, ...outcome });
  } catch (error) {
    const code =
      error instanceof MonoError
        ? error.code
        : error instanceof Error
          ? error.message
          : "WEBHOOK_PROCESS_FAILED";
    if (eventRowId) {
      await client
        .from("provider_events")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          error_code: code,
        })
        .eq("id", eventRowId);
    }
    console.error(JSON.stringify({ provider: PROVIDER_ID, event: "handler_failed", code }));
    // 500 asks Mono to retry. The claim row already exists, so the retry is
    // treated as a duplicate and skipped; a failed row is left visible for an
    // operator rather than silently retried forever.
    return errResponse(500, "WEBHOOK_PROCESS_FAILED", "Webhook failed.", true);
  }
});

interface NormalizedEvent {
  event: string;
  eventId: string;
  accountId: string | null;
  reference: string | null;
  customerId: string | null;
  dataStatus: string | null;
}

interface Outcome {
  handled: string;
}

async function handleEvent(
  client: SupabaseClient,
  event: NormalizedEvent,
): Promise<Outcome> {
  switch (event.event) {
    case "mono.events.account_connected":
    // Not a Mono event name; accepted as an alias for account_connected so a
    // dashboard misconfiguration is not silently dropped.
    case "mono.events.account_linked":
      return await handleConnected(client, event);
    case "mono.events.account_updated":
      return await handleUpdated(client, event);
    case "mono.events.account_reauthorized":
      return await handleReauthorized(client, event.accountId);
    case "mono.events.account_unlinked":
      return await handleUnlinked(client, event.accountId);
    default:
      // Unknown event: recorded and acknowledged. 200 stops Mono redelivering
      // something we will never understand.
      return { handled: "ignored" };
  }
}

/** Locate the owning user for a Mono account id. Ownership is server-side. */
async function findOwnerByAccount(
  client: SupabaseClient,
  accountId: string,
): Promise<{ connectionId: string; userId: string } | null> {
  const { data } = await client
    .from("bank_connections")
    .select("id,user_id")
    .eq("provider_id", PROVIDER_ID)
    .eq("provider_connection_id", accountId)
    .maybeSingle();
  if (!data) return null;
  return { connectionId: data.id as string, userId: data.user_id as string };
}

/**
 * Connect Link completion.
 *
 * bank-connect-session wrote a `pending` row whose provider_connection_id is
 * the opaque reference it sent as `meta.ref`. Mono echoes that reference back,
 * so the row is claimed here and rewritten with the real Mono account id.
 *
 * The reference is opaque and was minted server-side for an already
 * authenticated user, so it is safe to use as the ownership proof — an
 * attacker who guessed it would still need the webhook secret. A reference we
 * do not recognise is ignored, never attached to a guessed user.
 */
async function handleConnected(
  client: SupabaseClient,
  event: NormalizedEvent,
): Promise<Outcome> {
  if (!event.accountId) return { handled: "connected_no_account" };

  const now = new Date().toISOString();
  let owner: { connectionId: string; userId: string } | null = null;

  if (event.reference) {
    const { data: pending } = await client
      .from("bank_connections")
      .select("id,user_id,status")
      .eq("provider_id", PROVIDER_ID)
      .eq("provider_connection_id", event.reference)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      // Rewrite the row from the opaque reference to Mono's account id. The
      // unique (provider_id, provider_connection_id) key makes this
      // idempotent: a redelivered event conflicts instead of duplicating.
      const { error } = await client
        .from("bank_connections")
        .update({
          provider_connection_id: event.accountId,
          provider_customer_id: event.customerId ?? null,
          status: "active",
          updated_at: now,
        })
        .eq("id", pending.id);
      if (error) {
        throw new Error("CONNECTED_UPDATE_FAILED");
      }
      owner = { connectionId: pending.id as string, userId: pending.user_id as string };
    }
  }

  if (!owner) {
    // Either the client already exchanged a code (bank-exchange-code), or this
    // is an event for an account we have never issued a reference for.
    owner = await findOwnerByAccount(client, event.accountId);
  }
  if (!owner) return { handled: "connected_unowned" };

  const { account } = await fetchAccount(event.accountId);
  await upsertAccounts(client, {
    userId: owner.userId,
    providerId: PROVIDER_ID,
    bankConnectionId: owner.connectionId,
    accounts: [account],
  });

  return { handled: "connected" };
}

async function handleUpdated(
  client: SupabaseClient,
  event: NormalizedEvent,
): Promise<Outcome> {
  const accountId = event.accountId;
  if (!accountId) return { handled: "updated_no_account" };
  const owner = await findOwnerByAccount(client, accountId);
  if (!owner) return { handled: "updated_unowned" };

  // Refresh the mutable balance first; that is useful even when no new
  // transactions can be read.
  const { account } = await fetchAccount(accountId);
  await upsertAccounts(client, {
    userId: owner.userId,
    providerId: PROVIDER_ID,
    bankConnectionId: owner.connectionId,
    accounts: [account],
  });

  // Pull transactions only when the provider says they are available. Calling
  // the transactions endpoint while data_status is PROCESSING returns an empty
  // payload and still costs a metered page.
  const dataStatus = event.dataStatus;
  if (dataStatus !== "AVAILABLE" && dataStatus !== "PARTIAL") {
    return { handled: "updated_balance_only" };
  }

  const provider = getProvider(PROVIDER_ID);
  if (!provider) return { handled: "updated_no_provider" };

  const { data: accountRow } = await client
    .from("bank_accounts")
    .select("id,provider_account_id")
    .eq("bank_connection_id", owner.connectionId)
    .eq("provider_account_id", accountId)
    .maybeSingle();
  if (!accountRow) return { handled: "updated_no_account_row" };

  const page = await provider.listTransactions({
    providerAccountId: accountId,
    maxPages: WEBHOOK_SYNC_MAX_PAGES,
  });

  await ingestTransactions(client, {
    userId: owner.userId,
    providerId: PROVIDER_ID,
    accountIdByProvider: { [accountId]: accountRow.id as string },
    transactions: page.transactions.map((transaction) => ({
      providerAccountId: accountId,
      transaction,
    })),
  });

  await client
    .from("bank_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", owner.connectionId);

  return { handled: "updated_synced" };
}

async function handleReauthorized(
  client: SupabaseClient,
  accountId: string | null,
): Promise<Outcome> {
  if (!accountId) return { handled: "reauthorized_no_account" };
  const owner = await findOwnerByAccount(client, accountId);
  if (!owner) return { handled: "reauthorized_unowned" };
  const now = new Date().toISOString();
  await client
    .from("bank_connections")
    .update({ status: "active", updated_at: now })
    .eq("id", owner.connectionId);
  await client
    .from("bank_accounts")
    .update({ status: "active", updated_at: now })
    .eq("bank_connection_id", owner.connectionId);
  return { handled: "reauthorized" };
}

async function handleUnlinked(
  client: SupabaseClient,
  accountId: string | null,
): Promise<Outcome> {
  if (!accountId) return { handled: "unlinked_no_account" };
  const owner = await findOwnerByAccount(client, accountId);
  if (!owner) return { handled: "unlinked_unowned" };
  const now = new Date().toISOString();
  await client
    .from("bank_connections")
    .update({ status: "revoked", updated_at: now })
    .eq("id", owner.connectionId);
  await client
    .from("bank_accounts")
    .update({ status: "revoked", updated_at: now })
    .eq("bank_connection_id", owner.connectionId);
  return { handled: "unlinked" };
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
