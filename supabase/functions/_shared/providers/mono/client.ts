// Mono Connect HTTP client. Server-side only (Supabase Edge Functions, Deno).
//
// NEVER import this from app/ or src/ — it reads MONO_SECRET_KEY and that key
// must not reach a client bundle.
//
// Endpoints below were verified against Mono's current API reference (its
// llms.txt index plus per-endpoint pages) and confirmed with a live
// authenticated request. Not from memory:
//
//   POST /v2/accounts/initiate                -> Connect Link (mono_url)
//   POST /v2/accounts/auth                     -> exchange widget code for account id
//   GET  /v2/accounts/{id}                     -> account details + meta.data_status
//   GET  /v2/accounts/{id}/transactions        -> paged transactions (start, end, page)
//   GET  /v3/institutions?scope=financial_data -> institution list
//   POST /v2/accounts/{id}/unlink              -> disconnect
//
// ENVIRONMENT. Mono's own index states it directly: "Sandbox and Production
// share the same base URL; the key type (test vs live) determines the
// environment." There is no separate sandbox hostname. MONO_API_BASE_URL is an
// escape hatch only and defaults to the single host.
//
// PAYLOAD HYGIENE. Mono payloads are untrusted input. Every response is
// normalised in ./normalize.ts before use, so no raw Mono object is ever
// returned to a caller. Logs carry no amounts, narrations, account numbers or
// BVN.

import { normalizeAccount, normalizeTransactions } from "./normalize.ts";
import { MonoError } from "./webhook.ts";
import type {
  ConnectionSession,
  ProviderAccount,
  ProviderTransactionPage,
  RefreshResult,
} from "../types.ts";
import type { DataStatus } from "../types.ts";

// The pure helpers live in ./normalize.ts and ./webhook.ts so they can be unit
// tested without a Deno runtime. Re-exported here so callers have one import
// site per provider.
export {
  MonoError,
  parseWebhookEvent,
  verifyWebhookSecret,
  hashPayload,
  toDataStatus,
  type MonoErrorCode,
  type MonoWebhookEvent,
  type WebhookVerificationFailure,
} from "./webhook.ts";

const DEFAULT_BASE_URL = "https://api.withmono.com";

function baseUrl(): string {
  const override = Deno.env.get("MONO_API_BASE_URL");
  return (override && override.length > 0 ? override : DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function secretKey(): string {
  const key = Deno.env.get("MONO_SECRET_KEY");
  if (!key || key.length === 0) {
    throw new MonoError("MONO_NOT_CONFIGURED", "The Mono provider is not configured.", {
      retryable: false,
    });
  }
  return key;
}

/**
 * Structured warn. Only booleans and counts are allowed through, which makes it
 * impossible to leak an amount, a narration or an account number by accident.
 */
function logWarn(event: string, detail: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    if (typeof v === "number" || typeof v === "boolean") safe[k] = v;
  }
  console.warn(JSON.stringify({ provider: "mono", event, ...safe }));
}

interface MonoRequestOptions {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

interface MonoEnvelope {
  data?: unknown;
  meta?: Record<string, unknown>;
}

async function monoFetch(
  options: MonoRequestOptions,
): Promise<{ data: unknown; meta: Record<string, unknown> }> {
  const url = new URL(baseUrl() + options.path);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        // Documented auth header on every Mono endpoint.
        "mono-sec-key": secretKey(),
        accept: "application/json",
        "content-type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    logWarn("transport_failure", { method: options.method });
    throw new MonoError(
      "MONO_UNREACHABLE",
      "Could not reach the bank data provider.",
      { retryable: true },
    );
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      logWarn("rate_limited", { status });
      throw new MonoError(
        "MONO_RATE_LIMITED",
        "The bank data provider is busy. Please try again shortly.",
        { retryable: true, status },
      );
    }
    if (status === 401 || status === 403) {
      logWarn("credentials_rejected", { status });
      throw new MonoError(
        "MONO_REJECTED",
        "The bank data provider rejected our credentials.",
        { retryable: false, status },
      );
    }
    if (status === 404) {
      logWarn("not_found", { status });
      throw new MonoError(
        "MONO_UNAVAILABLE",
        "That bank connection is no longer available.",
        { retryable: false, status },
      );
    }
    logWarn("http_error", { status });
    throw new MonoError(
      "MONO_UNREACHABLE",
      "Could not reach the bank data provider.",
      { retryable: true, status },
    );
  }

  let envelope: MonoEnvelope;
  try {
    envelope = (await response.json()) as MonoEnvelope;
  } catch {
    logWarn("unparseable_response", { status: response.status });
    throw new MonoError(
      "MONO_INVALID_RESPONSE",
      "The bank data provider returned an unexpected response.",
      { retryable: true },
    );
  }

  return { data: envelope.data, meta: envelope.meta ?? {} };
}

// ------------------------------------------------------------ institutions

/**
 * GET /v3/institutions?scope=financial_data — discovered, never hard-coded.
 */
export async function fetchInstitutions(
  countryCode: string,
): Promise<Array<{
  id: string;
  name: string;
  countryCode: string;
  type?: string;
  authMethods: Array<{ id: string; type: string; name: string }>;
  bankCode: string | null;
  nipCode: string | null;
}>> {
  const { data } = await monoFetch({
    method: "GET",
    path: "/v3/institutions",
    query: { scope: "financial_data" },
  });
  const list = Array.isArray(data) ? (data as unknown[]) : [];
  const wanted = countryCode.toLowerCase();
  const out: Array<{
    id: string;
    name: string;
    countryCode: string;
    type?: string;
    authMethods: Array<{ id: string; type: string; name: string }>;
    bankCode: string | null;
    nipCode: string | null;
  }> = [];

  for (const row of list) {
    const rec = row as Record<string, unknown> | null;
    if (!rec || typeof rec !== "object") continue;
    const id = typeof rec.id === "string" && rec.id ? rec.id : null;
    const name = typeof rec.institution === "string" && rec.institution ? rec.institution : null;
    const country = typeof rec.country === "string" ? rec.country : null;
    if (!id || !name || !country) continue;
    if (country.toLowerCase() !== wanted) continue;

    const authMethods: Array<{ id: string; type: string; name: string }> = [];
    if (Array.isArray(rec.auth_methods)) {
      for (const m of rec.auth_methods as unknown[]) {
        const mr = m as Record<string, unknown> | null;
        if (!mr || typeof mr !== "object") continue;
        const mid =
          (typeof mr._id === "string" && mr._id) ||
          (typeof mr.id === "string" ? mr.id : null);
        const mtype = typeof mr.type === "string" && mr.type ? mr.type : null;
        if (!mid || !mtype) continue;
        authMethods.push({
          id: mid,
          type: mtype,
          name: typeof mr.name === "string" && mr.name ? mr.name : mtype,
        });
      }
    }

    out.push({
      id,
      name,
      countryCode: country.toUpperCase(),
      type: typeof rec.type === "string" ? rec.type : undefined,
      authMethods,
      bankCode: typeof rec.bank_code === "string" ? rec.bank_code : null,
      nipCode: typeof rec.nip_code === "string" ? rec.nip_code : null,
    });
  }
  return out;
}

// --------------------------------------------------------- connect session

export interface CreateConnectLinkInput {
  userEmail: string;
  userName: string | null;
  redirectUrl: string;
  reference: string;
}

/**
 * POST /v2/accounts/initiate — creates a hosted Mono Connect Link.
 *
 * Mono requires a customer name; a user with no display name is sent as their
 * email local-part so the request stays well-formed without inventing a name.
 */
export async function createConnectLink(
  input: CreateConnectLinkInput,
): Promise<ConnectionSession> {
  const fallbackName =
    (input.userName ?? "").trim() || input.userEmail.split("@")[0] || "Reconcile user";

  const { data } = await monoFetch({
    method: "POST",
    path: "/v2/accounts/initiate",
    body: {
      customer: { name: fallbackName, email: input.userEmail },
      meta: { ref: input.reference },
      scope: "auth",
      redirect_url: input.redirectUrl,
    },
  });

  const rec = data as Record<string, unknown> | null;
  const connectUrl =
    rec && typeof rec === "object" && typeof rec.mono_url === "string" ? rec.mono_url : null;
  if (!connectUrl) {
    throw new MonoError(
      "MONO_INVALID_RESPONSE",
      "The bank data provider did not return a connect link.",
      { retryable: true },
    );
  }

  return {
    providerId: "mono",
    reference: input.reference,
    connectUrl,
    // Connect Links are short-lived by design; 15 minutes is generous and
    // bounds how long a reserved `pending` row is meaningful.
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

// ------------------------------------------------------------ exchange code

/** POST /v2/accounts/auth — exchange the widget's code for an account id. */
export async function exchangeCode(code: string): Promise<string> {
  const { data } = await monoFetch({
    method: "POST",
    path: "/v2/accounts/auth",
    body: { code },
  });
  const rec = data as Record<string, unknown> | null;
  const nested =
    rec && typeof rec === "object" ? (rec.account as Record<string, unknown> | null) : null;
  const accountId =
    rec && typeof rec === "object" && typeof rec.id === "string" && rec.id
      ? rec.id
      : nested && typeof nested.id === "string"
        ? nested.id
        : null;
  if (!accountId) {
    throw new MonoError(
      "MONO_INVALID_RESPONSE",
      "The bank data provider did not return an account reference.",
      { retryable: true },
    );
  }
  return accountId;
}

// ---------------------------------------------------------- account details

export interface FetchedAccount {
  account: ProviderAccount;
  customerId: string | null;
  dataStatus: DataStatus | null;
}

/** GET /v2/accounts/{id} */
export async function fetchAccount(accountId: string): Promise<FetchedAccount> {
  const { data, meta } = await monoFetch({
    method: "GET",
    path: `/v2/accounts/${encodeURIComponent(accountId)}`,
  });

  const account = normalizeAccount({ data }, accountId);
  // Prefer the envelope's own meta over anything nested in the account.
  const envelopeMeta = (data as Record<string, unknown> | null)?.meta;
  const metaDataStatus =
    envelopeMeta && typeof envelopeMeta === "object"
      ? (envelopeMeta as Record<string, unknown>).data_status
      : meta.data_status;
  const dataStatus = account.dataStatus ?? normalizeDataStatusLoose(metaDataStatus);

  const customer = (data as Record<string, unknown> | null)?.customer as
    | Record<string, unknown>
    | null;

  return {
    account: { ...account, dataStatus },
    customerId:
      customer && typeof customer.id === "string" && customer.id ? customer.id : null,
    dataStatus,
  };
}

function normalizeDataStatusLoose(raw: unknown): DataStatus | null {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  const known: DataStatus[] = ["AVAILABLE", "PARTIAL", "UNAVAILABLE", "FAILED", "PROCESSING"];
  return (known as string[]).includes(upper) ? (upper as DataStatus) : null;
}

/** refreshAccount(): a freshness check without pulling transactions. */
export async function refreshAccount(accountId: string): Promise<RefreshResult> {
  const { dataStatus } = await fetchAccount(accountId);
  const checkedAt = new Date().toISOString();
  let status: RefreshResult["status"];
  if (dataStatus === "AVAILABLE") status = "ok";
  else if (dataStatus === "PARTIAL" || dataStatus === "PROCESSING") status = "stale";
  else status = "unavailable";
  return { status, dataStatus, checkedAt };
}

// ------------------------------------------------------------ transactions

/**
 * GET /v2/accounts/{id}/transactions
 *
 * Paged with an explicit `page` rather than by following Mono's `next` URL: the
 * documented example for `next` is malformed (it drops the `/accounts` path
 * segment), so following it would 404 on page two.
 *
 * `start`/`end` are documented query params but their format is not
 * documented, so they are sent through when supplied and the same bound is
 * re-applied locally. A format mismatch must not silently widen or narrow a
 * user's window.
 */
export async function fetchTransactionsPage(
  accountId: string,
  page: number,
  window?: { from?: string; to?: string },
): Promise<ProviderTransactionPage> {
  const { data, meta } = await monoFetch({
    method: "GET",
    path: `/v2/accounts/${encodeURIComponent(accountId)}/transactions`,
    query: { page, start: window?.from, end: window?.to },
  });

  const result = normalizeTransactions({ data, meta });

  let transactions = result.transactions;
  if (window?.from || window?.to) {
    const fromMs = window.from ? Date.parse(window.from) : Number.NEGATIVE_INFINITY;
    const toMs = window.to ? Date.parse(window.to) : Number.POSITIVE_INFINITY;
    transactions = transactions.filter((t) => {
      const at = Date.parse(t.occurredAt);
      return at >= fromMs && at < toMs;
    });
  }

  return { ...result, transactions };
}

// ----------------------------------------------------------------- unlink

/**
 * POST /v2/accounts/{id}/unlink — server-side revoke. The account id is a PATH
 * segment, not a body field.
 */
export async function unlinkAccount(accountId: string): Promise<void> {
  await monoFetch({
    method: "POST",
    path: `/v2/accounts/${encodeURIComponent(accountId)}/unlink`,
  });
}

// Webhook parsing, authenticity and hashing live in ./webhook.ts (pure, unit
// tested) and are re-exported above.

export const MONO_BASE_URL_DEFAULT = DEFAULT_BASE_URL;
