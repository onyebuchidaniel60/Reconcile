// POST /functions/v1/bank-connect-session
// Demo path: creates a demo bank_connection + 3 demo bank_accounts.
// Idempotent: an existing active demo connection is returned as-is.
import { DEMO_ACCOUNTS, DEMO_PROVIDER_ID } from "../_shared/demo.ts";
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

  let body: { provider_id?: string };
  try {
    body = await req.json();
  } catch {
    return errResponse(400, "INVALID_INPUT", "Request body must be JSON.", false);
  }
  if (body.provider_id !== DEMO_PROVIDER_ID) {
    return errResponse(
      400,
      "CONNECT_PROVIDER_UNSUPPORTED",
      "Only the demo provider is available in this build.",
      false,
    );
  }

  const providerConnectionId = `demo_${userId}`;

  const { data: existing } = await client
    .from("bank_connections")
    .select("id,status")
    .eq("user_id", userId)
    .eq("provider_id", DEMO_PROVIDER_ID)
    .eq("provider_connection_id", providerConnectionId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { data: accounts } = await client
      .from("bank_accounts")
      .select("*")
      .eq("bank_connection_id", existing.id)
      .order("display_name");
    return json({ connection: existing, accounts: accounts ?? [], created: false });
  }

  const { data: connection, error: connError } = await client
    .from("bank_connections")
    .upsert(
      {
        user_id: userId,
        provider_id: DEMO_PROVIDER_ID,
        provider_connection_id: providerConnectionId,
        status: "active",
        consented_at: new Date().toISOString(),
      },
      { onConflict: "provider_id,provider_connection_id" },
    )
    .select("id,status")
    .single();

  if (connError || !connection) {
    return errResponse(
      500,
      "CONNECT_FAILED",
      "We could not set up Demo Mode. Please try again.",
      true,
    );
  }

  const accountRows = DEMO_ACCOUNTS.map((a) => ({
    user_id: userId,
    bank_connection_id: connection.id,
    provider_id: DEMO_PROVIDER_ID,
    provider_account_id: `demo_${a.key}_${userId.slice(0, 8)}`,
    institution_id: a.institutionId,
    institution_name: a.institutionName,
    display_name: `${a.displayName} (Demo)`,
    masked_account_number: a.maskedAccountNumber,
    currency: a.currency,
    current_balance_minor: a.openingBalanceMinor,
    available_balance_minor: a.openingBalanceMinor,
    status: "active",
  }));

  const { data: accounts, error: acctError } = await client
    .from("bank_accounts")
    .upsert(accountRows, {
      onConflict: "provider_id,provider_account_id",
      ignoreDuplicates: true,
    })
    .select("*")
    .order("display_name");

  if (acctError) {
    return errResponse(
      500,
      "CONNECT_FAILED",
      "We could not set up Demo Mode. Please try again.",
      true,
    );
  }

  return json({ connection, accounts: accounts ?? [], created: true });
});
