// Mono adapter — implements the frozen FinancialProvider contract
// (ARCHITECTURE.md §3, types in ../types.ts).
//
// This is the ONLY file besides ./client.ts that may know Mono's field names,
// HTTP paths or vocabulary. Everything it returns is already normalised to the
// project's own shapes, so the rest of the codebase never sees a Mono object.
//
// Server-side only. Never import from app/ or src/.

import {
  fetchAccount,
  fetchInstitutions,
  fetchTransactionsPage,
  exchangeCode,
  createConnectLink,
  refreshAccount as monoRefreshAccount,
  unlinkAccount,
  type CreateConnectLinkInput,
} from "./client.ts";
import type {
  ConnectionSession,
  CreateConnectionInput,
  DisconnectInput,
  FinancialProvider,
  GetInstitutionsInput,
  Institution,
  ListAccountsInput,
  ListTransactionsInput,
  ProviderAccount,
  ProviderTransactionPage,
  RefreshAccountInput,
  RefreshResult,
} from "../types.ts";

export const MONO_PROVIDER_ID = "mono";

/**
 * Capabilities reflect what Mono's documented API actually offers. Do not
 * relax these without a documented endpoint behind the change: the sync
 * pipeline and the UI both branch on them.
 */
export const capabilities = {
  realtime: true,
  pagination: true,
  reauth: true,
  multipleAccounts: true,
  disconnect: true,
} as const;

/** Guard against an unbounded page walk if a provider misreports totals. */
const DEFAULT_MAX_PAGES = 10;

export const monoProvider: FinancialProvider = {
  id: MONO_PROVIDER_ID,
  capabilities,

  async getInstitutions(input: GetInstitutionsInput): Promise<Institution[]> {
    return await fetchInstitutions(input.countryCode);
  },

  /**
   * Creates a hosted Mono Connect Link. The returned `connectUrl` is
   * client-safe: it carries no secret, only the public-facing connect token.
   */
  async createConnectionSession(
    input: CreateConnectionInput,
  ): Promise<ConnectionSession> {
    const request: CreateConnectLinkInput = {
      userEmail: input.userEmail,
      userName: input.userName ?? null,
      redirectUrl: input.redirectUrl,
      reference: input.reference ?? crypto.randomUUID(),
    };
    return await createConnectLink(request);
  },

  async refreshAccount(input: RefreshAccountInput): Promise<RefreshResult> {
    return await monoRefreshAccount(input.providerAccountId);
  },

  /**
   * Mono's connect step yields exactly one account id per consent
   * (`POST /v2/accounts/auth` returns a single `id`), so this resolves to a
   * one-element array. It stays an array because the contract is
   * provider-agnostic and `multipleAccounts` is true — Mono's widget does let
   * a user attach several accounts, which arrive as separate account ids.
   */
  async listAccounts(input: ListAccountsInput): Promise<ProviderAccount[]> {
    void input.userId;
    const { account } = await fetchAccount(input.providerConnectionId);
    return [account];
  },

  async listTransactions(
    input: ListTransactionsInput,
  ): Promise<ProviderTransactionPage> {
    // `from`/`to` are accepted on the interface for providers that support a
    // server-side window. Mono's transactions endpoint takes no date filter
    // (its docs describe returning the most recent transactions), so the bound
    // is applied client-side after normalisation instead of being sent.
    const maxPages = normaliseMaxPages(input.maxPages);
    let page = Math.max(1, input.page ?? 1);
    const collected = [];
    let total: number | undefined;
    let hasMore = false;

    for (let walked = 0; walked < maxPages; walked++) {
      const result = await fetchTransactionsPage(input.providerAccountId, page);
      if (total === undefined && result.total !== undefined) total = result.total;
      collected.push(...result.transactions);
      if (!result.hasMore) break;
      hasMore = true;
      page = result.page + 1;
    }

    let transactions = collected;
    if (input.from || input.to) {
      const fromMs = input.from ? Date.parse(input.from) : Number.NEGATIVE_INFINITY;
      const toMs = input.to ? Date.parse(input.to) : Number.POSITIVE_INFINITY;
      transactions = collected.filter((t) => {
        const at = Date.parse(t.occurredAt);
        return at >= fromMs && at < toMs;
      });
    }

    return { transactions, page, total, hasMore };
  },

  async disconnect(input: DisconnectInput): Promise<void> {
    await unlinkAccount(input.providerConnectionId);
  },
};

function normaliseMaxPages(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_MAX_PAGES;
  return Math.min(Math.max(Math.trunc(value), 1), 50);
}

/** Swap the widget's code for Mono's account id. Used by bank-exchange-code. */
export async function exchangeWidgetCode(code: string): Promise<string> {
  return await exchangeCode(code);
}
