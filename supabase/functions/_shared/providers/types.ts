// The frozen FinancialProvider contract (ARCHITECTURE.md §3) and its
// supporting value types.
//
// CANONICAL LOCATION. Client code re-exports this file from
// `src/providers/types.ts` rather than duplicating it, matching how
// `finance.ts` is already shared between the app and Edge Functions. Only
// dependency-free modules live in `_shared/` for this reason — modules that
// import Deno- or Supabase-JS-specific specifiers (`./auth.ts`) must stay
// server-side.
//
// FROZEN for Phase 11. The method signatures below are transcribed verbatim
// from ARCHITECTURE.md §3 and must not change. Adding a method is a
// Phase-14-or-later decision and requires an architecture amendment.

import type {
  Direction,
  NormalizedTransaction,
} from "../finance.ts";

// ------------------------------------------------------------ capabilities

/**
 * What a provider actually supports. Reported, never assumed: a provider
 * that cannot do realtime must not claim it (ARCHITECTURE.md §5 — provider
 * real-time/background refresh is optional and never promised when
 * unsupported).
 */
export interface ProviderCapabilities {
  /** Push updates from provider webhooks without a user-initiated refresh. */
  realtime: boolean;
  /** Transactions can be read page by page. */
  pagination: boolean;
  /** A stale/consent-expired link can be re-authorised in place. */
  reauth: boolean;
  /** One connection can yield more than one account. */
  multipleAccounts: boolean;
  /** Server-side unlink/revoke is supported. */
  disconnect: boolean;
}

// ------------------------------------------------------------- institutions

export type AuthMethodType = "internet_banking" | "mobile_banking" | string;

export interface AuthMethod {
  id: string;
  type: AuthMethodType;
  name: string;
}

/** A bank Mono (or any provider) can connect. Discovered, never hard-coded. */
export interface Institution {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, lowercase as the provider returns it. */
  countryCode: string;
  /** Provider-specific grouping, e.g. PERSONAL_BANKING. */
  type?: string;
  authMethods: AuthMethod[];
  bankCode?: string | null;
  nipCode?: string | null;
}

// ---------------------------------------------------------------- accounts

/** Mono's data_status, as documented. Drives whether we can read data yet. */
export type DataStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "UNAVAILABLE"
  | "FAILED"
  | "PROCESSING";

/** Bank-facing account lifecycle, distinct from the connection's status. */
export type AccountStatus = "active" | "reauth_required" | "unavailable" | "revoked";

/** Provider account, normalised. No provider-specific field names. */
export interface ProviderAccount {
  providerAccountId: string;
  institutionId: string | null;
  institutionName: string;
  displayName: string;
  maskedAccountNumber: string;
  /** ISO 4217. Amounts are always integer minor units of this currency. */
  currency: string;
  currentBalanceMinor: number;
  availableBalanceMinor: number;
  status: AccountStatus;
  /** Whether balance/transactions have been fetched from the bank yet. */
  dataStatus: DataStatus | null;
}

// ------------------------------------------------------------ transactions

/**
 * Provider transaction, normalised. Structurally identical to
 * `NormalizedTransaction` in `../../finance.ts`; it is re-declared here so the
 * provider contract is readable in one place. Adapters must produce values
 * that pass `validateNormalized`.
 */
export type ProviderTransaction = NormalizedTransaction;

export interface ProviderTransactionPage {
  transactions: ProviderTransaction[];
  /** 1-based. Mono returns `meta.page`. */
  page: number;
  /** Total available, when the provider reports one. */
  total?: number;
  hasMore: boolean;
}

// ----------------------------------------------------------------- session

/**
 * Everything the client needs to open the provider's connect UI. Every field
 * here is client-safe by construction: an adapter must never put a secret key
 * in this object.
 */
export interface ConnectionSession {
  providerId: string;
  /** Unique per attempt. Echoed back by the provider on completion. */
  reference: string;
  /** Opaque handle the provider's UI requires, if any. */
  sessionToken?: string;
  /** Client-safe public key, when the provider's widget requires one. */
  publicKey?: string;
  /** Hosted provider UI to open. */
  connectUrl?: string;
  /** ISO timestamp; the session must not be used after this. */
  expiresAt?: string;
}

// ----------------------------------------------------------------- refresh

/**
 * Result of asking the provider for a fresher view of one account.
 * `reauth_required` is a first-class outcome, not an error: the user must
 * re-consent, and the connection is moved to `reauth_required`.
 */
export interface RefreshResult {
  status: "ok" | "stale" | "unavailable" | "reauth_required";
  dataStatus: DataStatus | null;
  /** ISO timestamp of the check. */
  checkedAt: string;
}

// ------------------------------------------------------------------ inputs

export interface GetInstitutionsInput {
  /** ISO 3166-1 alpha-2. Uppercase. */
  countryCode: string;
}

export interface CreateConnectionInput {
  /**
   * The authenticated user's id, resolved server-side from the JWT. Adapters
   * must never accept a client-asserted user id (ARCHITECTURE.md §7).
   */
  userId: string;
  userEmail: string;
  userName?: string | null;
  /** Where the provider should send the user back to. */
  redirectUrl: string;
  /** Optional caller-supplied reference; adapters default to a fresh uuid. */
  reference?: string;
}

export interface RefreshAccountInput {
  providerAccountId: string;
}

export interface ListAccountsInput {
  /** Mono's account id is both the connection and the account identity. */
  providerConnectionId: string;
  /**
   * The authenticated user's id, resolved from the JWT server-side. Adapters
   * that scope their accounts per user (the demo fixture does) need it; it is
   * never accepted from a client request body.
   */
  userId: string;
}

export interface ListTransactionsInput {
  providerAccountId: string;
  /** ISO date/datetime lower bound, inclusive. */
  from?: string;
  /** ISO date/datetime upper bound, exclusive. */
  to?: string;
  /** 1-based. */
  page?: number;
  /** Cap pages walked per call so one sync cannot run unbounded. */
  maxPages?: number;
}

export interface DisconnectInput {
  providerConnectionId: string;
}

// -------------------------------------------------------------- interface

/** FROZEN. See the note at the top of this file. */
export interface FinancialProvider {
  id: string;
  capabilities: ProviderCapabilities;
  getInstitutions(input: GetInstitutionsInput): Promise<Institution[]>;
  createConnectionSession(input: CreateConnectionInput): Promise<ConnectionSession>;
  refreshAccount(input: RefreshAccountInput): Promise<RefreshResult>;
  listAccounts(input: ListAccountsInput): Promise<ProviderAccount[]>;
  listTransactions(
    input: ListTransactionsInput,
  ): Promise<ProviderTransactionPage>;
  disconnect(input: DisconnectInput): Promise<void>;
}

export type { Direction, NormalizedTransaction };
