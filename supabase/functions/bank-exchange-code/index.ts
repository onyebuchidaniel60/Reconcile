// POST /functions/v1/bank-exchange-code
//
// Phase 11. Completes a Mono connection: the client hands back the code the
// Connect widget produced, and this function exchanges it server-side
// (`POST /v2/accounts/auth`) for Mono's account id, then persists
// bank_connections + bank_accounts.
//
// The code is exchanged with the SECRET key and never leaves the server. The
// client never sees an account id it could tamper with.
//
// Idempotent: re-running with the same code resolves to the same connection
// row and the same account row.

import { requireUser } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";
import { isMonoEnabled } from "../_shared/flags.ts";
import { getProvider, MONO_PROVIDER_ID } from "../_shared/providers/registry.ts";
import { upsertAccounts, upsertConnection } from "../_shared/providers/persist.ts";
import { exchangeWidgetCode } from "../_shared/providers/mono/adapter.ts";
import { MonoError } from "../_shared/providers/mono/client.ts";

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

  if (!isMonoEnabled()) {
    return errResponse(
      404,
      "CONNECT_PROVIDER_DISABLED",
      "Real bank connections are not available yet.",
      false,
    );
  }

  let body: { code?: string; reference?: string };
  try {
    body = await req.json();
  } catch {
    return errResponse(400, "INVALID_INPUT", "Request body must be JSON.", false);
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (code.length === 0 || code.length > 4096) {
    return errResponse(400, "INVALID_INPUT", "code is required.", false);
  }

  const provider = getProvider(MONO_PROVIDER_ID);
  if (!provider) {
    return errResponse(
      500,
      "SERVER_MISCONFIGURED",
      "The service is not configured. Please try again later.",
      false,
    );
  }

  let accountId: string;
  try {
    accountId = await exchangeWidgetCode(code);
  } catch (error) {
    if (error instanceof MonoError) {
      // A rejected/expired code is the user's to retry, not a server fault.
      const clientFault = !error.retryable;
      return errResponse(
        clientFault ? 400 : 502,
        clientFault ? "CONNECT_CODE_INVALID" : error.code,
        clientFault
          ? "That bank connection could not be completed. Please try again."
          : "We could not complete the bank connection. Please try again.",
        !clientFault,
      );
    }
    return errResponse(
      502,
      "CONNECT_FAILED",
      "We could not complete the bank connection. Please try again.",
      true,
    );
  }

  // Fetch the account immediately so the connection is never persisted without
  // its account row: the UI should not have to poll a second endpoint.
  let accounts;
  try {
    accounts = await provider.listAccounts({
      providerConnectionId: accountId,
      userId,
    });
  } catch (error) {
    if (error instanceof MonoError && error.code === "MONO_UNAVAILABLE") {
      return errResponse(
        409,
        "CONNECT_ACCOUNT_UNAVAILABLE",
        "We could not read that bank account yet. Please try again in a moment.",
        true,
      );
    }
    if (error instanceof MonoError) {
      return errResponse(502, error.code, "We could not read that bank account.", error.retryable);
    }
    return errResponse(
      502,
      "CONNECT_FAILED",
      "We could not read that bank account.",
      true,
    );
  }

  if (accounts.length === 0) {
    return errResponse(
      409,
      "CONNECT_ACCOUNT_UNAVAILABLE",
      "We could not read that bank account yet. Please try again in a moment.",
      true,
    );
  }

  const { row: connection, error: connError } = await upsertConnection(client, {
    userId,
    providerId: MONO_PROVIDER_ID,
    providerConnectionId: accountId,
    status: "active",
  });
  if (connError || !connection) {
    return errResponse(
      500,
      "CONNECT_FAILED",
      "We could not save your bank connection. Please try again.",
      true,
    );
  }

  const { error: acctError } = await upsertAccounts(client, {
    userId,
    providerId: MONO_PROVIDER_ID,
    bankConnectionId: connection.id,
    accounts,
  });
  if (acctError) {
    return errResponse(
      500,
      "CONNECT_FAILED",
      "We could not save your bank accounts. Please try again.",
      true,
    );
  }

  const { data: persisted } = await client
    .from("bank_accounts")
    .select("*")
    .eq("bank_connection_id", connection.id)
    .order("display_name");

  return json({
    connection,
    accounts: persisted ?? [],
    provider_id: MONO_PROVIDER_ID,
  });
});
