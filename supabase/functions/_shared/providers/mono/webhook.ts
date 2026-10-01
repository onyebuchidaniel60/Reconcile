// Mono webhook parsing, authenticity and auditing — PURE. No Deno, no I/O.
//
// Separated from client.ts for the same reason as normalize.ts: these rules are
// security-relevant and must be unit-testable without a Deno runtime, and
// separating them keeps client.ts as pure I/O.
//
// AUTHENTICITY. Mono Connect — the Nigeria bank-data product this app uses —
// has NO request signature. Mono's own documentation states only: "Always verify
// webhooks using the `mono-webhook-secret` header", against the secret Mono
// generates for that webhook URL in the dashboard. The HMAC scheme
// (`Mono-Signature: t=...,v1=...`) published on docs.mono.la belongs to a
// different Mono product and is deliberately NOT implemented here: an
// unimplemented scheme cannot be mistaken for a working one.

import { toDataStatus } from "./normalize.ts";
import type { DataStatus } from "../types.ts";

export { toDataStatus };

/** Stable, user-safe Mono failure codes. Mono's own text never reaches a client. */
export type MonoErrorCode =
  | "MONO_NOT_CONFIGURED"
  | "MONO_UNREACHABLE"
  | "MONO_RATE_LIMITED"
  | "MONO_REJECTED"
  | "MONO_UNAVAILABLE"
  | "MONO_INVALID_RESPONSE";

export class MonoError extends Error {
  readonly code: MonoErrorCode;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(
    code: MonoErrorCode,
    message: string,
    opts: { retryable: boolean; status?: number | null },
  ) {
    super(message);
    this.name = "MonoError";
    this.code = code;
    this.retryable = opts.retryable;
    this.status = opts.status ?? null;
  }
}

export interface MonoWebhookEvent {
  event: string;
  eventId: string;
  accountId: string | null;
  /**
   * `meta.ref` — the caller's own reference, echoed back by Mono.
   *
   * This is how Connect Link resolves ownership: bank-connect-session issues an
   * opaque reference and reserves a `pending` bank_connections row under it;
   * account_connected carries it back so the row can be claimed and rewritten
   * with the real Mono account id.
   */
  reference: string | null;
  customerId: string | null;
  dataStatus: DataStatus | null;
  /** Which data Mono actually retrieved, comma-joined; null when absent. */
  retrievedData: string | null;
}

/**
 * Parse a webhook body into the fields the handlers are allowed to act on.
 *
 * Returns null without a usable `event`/`event_id` — those two are the
 * idempotency key, so an event lacking them cannot be recorded and must not be
 * processed.
 *
 * Note Mono's own casing inconsistency: account_connected delivers `data.id`
 * while account_updated delivers `data.account._id`. Both are accepted.
 */
export function parseWebhookEvent(body: unknown): MonoWebhookEvent | null {
  const root = asRecord(body);
  if (!root) return null;

  const event = asString(root.event);
  const eventId = asString(root.event_id);
  if (!event || !eventId) return null;

  const data = asRecord(root.data) ?? {};
  // account_updated nests the account and puts meta beside it; some payloads
  // put meta inside the account-keyed object. Accept both.
  const accountRec = asRecord(data.account) ?? data;
  const metaRec = asRecord(data.meta) ?? asRecord(accountRec.meta) ?? {};

  const retrieved = Array.isArray(metaRec.retrieved_data)
    ? (metaRec.retrieved_data as unknown[]).filter(
        (v): v is string => typeof v === "string",
      )
    : [];

  return {
    event,
    eventId,
    accountId: asString(data.id) ?? asString(accountRec.id) ?? asString(accountRec._id),
    reference: asString(metaRec.ref),
    customerId: asString(data.customer) ?? asString(root.customer),
    dataStatus: toDataStatus(metaRec.data_status),
    retrievedData: retrieved.length > 0 ? retrieved.join(",") : null,
  };
}

export type WebhookVerificationFailure =
  | "not_configured"
  | "missing_header"
  | "mismatch";

/**
 * Verify a Mono Connect webhook request by comparing the `mono-webhook-secret`
 * header against the server-side secret.
 *
 * Fails closed when the server has no secret configured, so a misconfigured
 * deployment rejects everything rather than accepting everything.
 *
 * The comparison is constant-time (after the unavoidable length check) so a
 * mismatch leaks no timing information about the secret.
 */
export function verifyWebhookSecret(
  headerValue: string | null,
  expectedSecret: string | null,
): { ok: true } | { ok: false; reason: WebhookVerificationFailure } {
  if (!expectedSecret || expectedSecret.length === 0) {
    return { ok: false, reason: "not_configured" };
  }
  if (!headerValue || headerValue.length === 0) {
    return { ok: false, reason: "missing_header" };
  }
  if (!constantTimeEqual(headerValue, expectedSecret)) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Stable, non-reversible fingerprint of a webhook body, for audit only. */
export async function hashPayload(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------- helpers

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
