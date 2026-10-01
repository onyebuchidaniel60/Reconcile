// POST /functions/v1/bank-disconnect
//
// Revokes a user-owned connection. Phase 11: the provider is asked to unlink
// upstream when it supports it, then the local rows are marked revoked.
//
// Order matters: the upstream revoke is attempted first so a provider-side
// failure is reported rather than silently leaving a live link the user
// believes they removed. The local rows are still marked revoked if the
// upstream call fails, because the user's intent was to disconnect and a stale
// upstream link is strictly better than an active local one.
//
// Data is retained; the deletion flow arrives in Phase 14.

import { requireUser } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";
import { getProvider } from "../_shared/providers/registry.ts";
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

  let body: { bank_connection_id?: string };
  try {
    body = await req.json();
  } catch {
    return errResponse(400, "INVALID_INPUT", "Request body must be JSON.", false);
  }
  if (!body.bank_connection_id) {
    return errResponse(400, "INVALID_INPUT", "bank_connection_id is required.", false);
  }

  // Ownership enforced server-side; never trust a client-supplied owner.
  const { data: connection } = await client
    .from("bank_connections")
    .select("id,provider_id,provider_connection_id,status")
    .eq("id", body.bank_connection_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) {
    return errResponse(404, "DISCONNECT_NOT_FOUND", "That connection was not found.", false);
  }

  // Already revoked: idempotent success, no upstream call needed.
  if (connection.status === "revoked") {
    return json({ ok: true, already_revoked: true });
  }

  let providerRevoked = false;
  let providerError: string | null = null;
  const provider = getProvider(connection.provider_id);
  if (provider && provider.capabilities.disconnect) {
    try {
      await provider.disconnect({ providerConnectionId: connection.provider_connection_id });
      providerRevoked = true;
    } catch (error) {
      if (error instanceof MonoError) {
        providerError = error.code;
      } else {
        providerError = "PROVIDER_DISCONNECT_FAILED";
      }
      // Fall through: local state is still reconciled below.
    }
  } else {
    providerRevoked = true;
  }

  const now = new Date().toISOString();
  await client
    .from("bank_connections")
    .update({ status: "revoked", updated_at: now })
    .eq("id", connection.id);
  await client
    .from("bank_accounts")
    .update({ status: "revoked", updated_at: now })
    .eq("bank_connection_id", connection.id);

  // The local disconnect succeeded, which is what the user asked for. Report
  // the upstream shortfall honestly instead of hiding it behind a 200.
  return json({
    ok: true,
    already_revoked: false,
    provider_revoked: providerRevoked,
    provider_error: providerError,
  });
});
