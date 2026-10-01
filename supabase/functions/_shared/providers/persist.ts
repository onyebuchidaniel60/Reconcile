// Persisting provider accounts into Reconcile's schema.
//
// Shared by bank-exchange-code, bank-connect-session (demo path) and the
// webhook, so the row shape and the idempotent upsert live in one place.
// Adapters return normalised ProviderAccounts; this module is the only place
// that knows the column names.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ProviderAccount } from "./types.ts";

/** Bank connection lifecycle, matching the 000001 check constraint. */
export type ConnectionStatus =
  | "pending"
  | "active"
  | "reauth_required"
  | "error"
  | "revoked";

export interface ConnectionRow {
  id: string;
  status: ConnectionStatus;
  provider_id: string;
}

/**
 * Insert or update the bank_connections row for a provider connection.
 *
 * Idempotent on (provider_id, provider_connection_id), which is the schema's
 * unique key — re-running after a webhook retry reuses the same row rather
 * than creating a second connection for the same upstream link.
 *
 * Ownership: user_id comes from the caller's JWT, never from a request body.
 */
export async function upsertConnection(
  client: SupabaseClient,
  input: {
    userId: string;
    providerId: string;
    providerConnectionId: string;
    providerCustomerId?: string | null;
    status: ConnectionStatus;
    consentedAt?: string | null;
  },
): Promise<{ row: ConnectionRow | null; error: string | null }> {
  // `undefined` means "stamp it now"; an explicit `null` means "not yet", which
  // a `pending` connection needs — it is reserved before the user consents.
  const consentedAt =
    input.consentedAt === undefined ? new Date().toISOString() : input.consentedAt;

  const { data, error } = await client
    .from("bank_connections")
    .upsert(
      {
        user_id: input.userId,
        provider_id: input.providerId,
        provider_connection_id: input.providerConnectionId,
        provider_customer_id: input.providerCustomerId ?? null,
        status: input.status,
        consented_at: consentedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_id,provider_connection_id" },
    )
    .select("id,status,provider_id")
    .single();
  if (error || !data) {
    return { row: null, error: "connection upsert failed" };
  }
  return { row: data as ConnectionRow, error: null };
}

/**
 * Upsert normalised provider accounts onto a connection.
 *
 * Idempotent on (provider_id, provider_account_id). Balances are refreshed on
 * every sync — a balance is mutable state, unlike the transaction ledger — but
 * ownership fields are re-asserted each time so a row cannot be silently
 * re-pointed at a different user.
 */
export async function upsertAccounts(
  client: SupabaseClient,
  input: {
    userId: string;
    providerId: string;
    bankConnectionId: string;
    accounts: ProviderAccount[];
  },
): Promise<{ inserted: number; error: string | null }> {
  if (input.accounts.length === 0) {
    return { inserted: 0, error: null };
  }
  const now = new Date().toISOString();
  const rows = input.accounts.map((account) => ({
    user_id: input.userId,
    bank_connection_id: input.bankConnectionId,
    provider_id: input.providerId,
    provider_account_id: account.providerAccountId,
    institution_id: account.institutionId,
    institution_name: account.institutionName,
    display_name: account.displayName,
    masked_account_number: account.maskedAccountNumber,
    currency: account.currency,
    current_balance_minor: account.currentBalanceMinor,
    available_balance_minor: account.availableBalanceMinor,
    status: account.status,
    updated_at: now,
  }));

  const { data, error } = await client
    .from("bank_accounts")
    .upsert(rows, { onConflict: "provider_id,provider_account_id" })
    .select("id");
  if (error) {
    return { inserted: 0, error: "account upsert failed" };
  }
  return { inserted: data?.length ?? 0, error: null };
}

/**
 * Move a connection into `reauth_required`.
 *
 * Used when the provider reports that consent has lapsed. Also flips its
 * accounts so the client can show one consistent state rather than a live
 * connection over unusable accounts.
 */
export async function markReauthRequired(
  client: SupabaseClient,
  bankConnectionId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await client
    .from("bank_connections")
    .update({ status: "reauth_required", updated_at: now })
    .eq("id", bankConnectionId);
  await client
    .from("bank_accounts")
    .update({ status: "reauth_required", updated_at: now })
    .eq("bank_connection_id", bankConnectionId);
}
