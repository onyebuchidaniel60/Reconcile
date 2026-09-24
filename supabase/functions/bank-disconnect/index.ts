// POST /functions/v1/bank-disconnect
// Revokes a user-owned connection and its accounts. Data is retained;
// deletion flows arrive in a later phase.
import { requireUser } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";

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

  const { data: connection } = await client
    .from("bank_connections")
    .select("id")
    .eq("id", body.bank_connection_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) {
    return errResponse(404, "DISCONNECT_NOT_FOUND", "That connection was not found.", false);
  }

  await client
    .from("bank_connections")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", connection.id);
  await client
    .from("bank_accounts")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("bank_connection_id", connection.id);

  return json({ ok: true });
});
