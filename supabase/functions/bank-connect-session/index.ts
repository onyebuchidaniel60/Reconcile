// POST /functions/v1/bank-connect-session
//
// Two providers, one entry point (ARCHITECTURE.md §8).
//
//   { provider_id: "demo" }  -> unchanged since Phase 2. Materialises the demo
//                               connection + 3 accounts and returns
//                               { connection, accounts, created }.
//   { provider_id: "mono" }  -> Phase 11. Returns a hosted Mono Connect Link
//                               for the client to open in a WebView:
//                               { provider_id, reference, connect_url, ... }.
//
// Backward compatibility: the demo response shape is unchanged, so the existing
// client call in src/lib/db.ts keeps working untouched.
import { requireUser } from "../_shared/auth.ts";
import { json, preflight } from "../_shared/cors.ts";
import { errResponse } from "../_shared/envelope.ts";
import { isMonoEnabled } from "../_shared/flags.ts";
import { getProvider, DEMO_PROVIDER_ID, MONO_PROVIDER_ID } from "../_shared/providers/registry.ts";
import { upsertAccounts, upsertConnection } from "../_shared/providers/persist.ts";
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

  let body: {
    provider_id?: string;
    country_code?: string;
    redirect_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return errResponse(400, "INVALID_INPUT", "Request body must be JSON.", false);
  }

  const providerId = body.provider_id ?? DEMO_PROVIDER_ID;
  const provider = getProvider(providerId);
  if (!provider) {
    return errResponse(
      400,
      "CONNECT_PROVIDER_UNSUPPORTED",
      "That bank provider is not available.",
      false,
    );
  }

  // ---- Mono ------------------------------------------------------------
  if (providerId === MONO_PROVIDER_ID) {
    if (!isMonoEnabled()) {
      return errResponse(
        404,
        "CONNECT_PROVIDER_DISABLED",
        "Real bank connections are not available yet.",
        false,
      );
    }
    // The redirect target is where Mono returns the user after the widget.
    // It must be a URL we control; the client supplies its own origin.
    const redirectUrl = body.redirect_url;
    if (!redirectUrl || !isAllowedRedirect(redirectUrl)) {
      return errResponse(
        400,
        "INVALID_INPUT",
        "redirect_url is required and must be an http(s) URL.",
        false,
      );
    }

    const account = await client.auth.admin.getUserById(userId);
    const email = account.data?.user?.email ?? "";
    if (!email) {
      return errResponse(
        400,
        "INVALID_INPUT",
        "Your account needs an email address before connecting a bank.",
        false,
      );
    }

    try {
      const session = await provider.createConnectionSession({
        userId,
        userEmail: email,
        userName:
          typeof account.data?.user?.user_metadata?.full_name === "string"
            ? (account.data.user.user_metadata.full_name as string)
            : null,
        redirectUrl,
      });

      // Reserve a `pending` connection row keyed by the opaque reference we
      // just sent as `meta.ref`.
      //
      // This is how ownership survives the Connect Link round-trip. Mono's
      // documented flow is: take the `mono_url`, let the user finish, and the
      // `account_connected` webhook hands back both the account id and our
      // `meta.ref`. The webhook then claims this row and rewrites it with the
      // real account id. Without this row there would be nothing to claim, and
      // the webhook would have to guess which user the account belongs to —
      // which it must never do.
      const { error: reserveError } = await upsertConnection(client, {
        userId,
        providerId: MONO_PROVIDER_ID,
        providerConnectionId: session.reference,
        status: "pending",
        consentedAt: null,
      });
      if (reserveError) {
        return errResponse(
          502,
          "CONNECT_FAILED",
          "We could not start the bank connection. Please try again.",
          true,
        );
      }

      return json({
        provider_id: session.providerId,
        reference: session.reference,
        connect_url: session.connectUrl ?? null,
        session_token: session.sessionToken ?? null,
        public_key: session.publicKey ?? null,
        expires_at: session.expiresAt ?? null,
      });
    } catch (error) {
      if (error instanceof MonoError) {
        return errResponse(
          error.retryable ? 503 : 502,
          error.code,
          "We could not start the bank connection. Please try again.",
          error.retryable,
        );
      }
      return errResponse(
        500,
        "CONNECT_FAILED",
        "We could not start the bank connection. Please try again.",
        true,
      );
    }
  }

  // ---- Demo (unchanged behaviour, now via the adapter) ------------------
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

  const { row: connection, error: connError } = await upsertConnection(client, {
    userId,
    providerId: DEMO_PROVIDER_ID,
    providerConnectionId,
    status: "active",
  });
  if (connError || !connection) {
    return errResponse(
      500,
      "CONNECT_FAILED",
      "We could not set up Demo Mode. Please try again.",
      true,
    );
  }

  const demoAccounts = await provider.listAccounts({
    providerConnectionId,
    userId,
  });
  // Preserve the historical "(Demo)" suffix on display names.
  const { error: acctError } = await upsertAccounts(
    client,
    {
      userId,
      providerId: DEMO_PROVIDER_ID,
      bankConnectionId: connection.id,
      accounts: demoAccounts.map((a) => ({
        ...a,
        displayName: `${a.displayName} (Demo)`,
      })),
    },
  );
  if (acctError) {
    return errResponse(
      500,
      "CONNECT_FAILED",
      "We could not set up Demo Mode. Please try again.",
      true,
    );
  }

  const { data: accounts } = await client
    .from("bank_accounts")
    .select("*")
    .eq("bank_connection_id", connection.id)
    .order("display_name");

  return json({ connection, accounts: accounts ?? [], created: true });
});

/**
 * Only http(s) redirects are accepted. The value is echoed to Mono, so a
 * `javascript:` or `data:` URL must never reach it.
 */
function isAllowedRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
