// Demo provider adapter — implements the frozen FinancialProvider contract
// (ARCHITECTURE.md §3).
//
// The demo provider has always been synthetic fixture data (`../demo.ts`,
// `_shared/demo.ts`). This adapter puts it behind the same interface as Mono so
// the rest of the codebase cannot tell which provider is running — which is
// the entire point of the abstraction (Phase 11 objective).
//
// It performs no network I/O. That is a capability fact, not a shortcut: the
// sync pipeline branches on `capabilities.realtime` and `capabilities.pagination`
// rather than assuming a provider can do either.

import {
  DEMO_ACCOUNTS,
  DEMO_PROVIDER_ID,
  buildDemoDataset,
  type DemoAccountKey,
} from "../../demo.ts";
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

export { DEMO_PROVIDER_ID };

/** Synthetic accounts are per-user; the id embeds the user so nothing leaks. */
export function demoAccountKeyFor(
  providerAccountId: string,
  userId: string,
): DemoAccountKey | null {
  const suffix = `_${userId.slice(0, 8)}`;
  if (!providerAccountId.startsWith("demo_") || !providerAccountId.endsWith(suffix)) {
    return null;
  }
  const middle = providerAccountId.slice("demo_".length, providerAccountId.length - suffix.length);
  const match = DEMO_ACCOUNTS.find((a) => a.key === middle);
  return match ? match.key : null;
}

/** The demo "connection" is a per-user marker, exactly as before Phase 11. */
export function demoConnectionIdFor(userId: string): string {
  return `demo_${userId}`;
}

function toProviderAccount(
  account: (typeof DEMO_ACCOUNTS)[number],
  userId: string,
): ProviderAccount {
  return {
    providerAccountId: `demo_${account.key}_${userId.slice(0, 8)}`,
    institutionId: account.institutionId,
    institutionName: account.institutionName,
    displayName: account.displayName,
    maskedAccountNumber: account.maskedAccountNumber,
    currency: account.currency,
    currentBalanceMinor: account.openingBalanceMinor,
    availableBalanceMinor: account.openingBalanceMinor,
    status: "active",
    dataStatus: "AVAILABLE",
  };
}

export const demoProvider: FinancialProvider = {
  id: DEMO_PROVIDER_ID,
  capabilities: {
    realtime: false,
    pagination: false,
    reauth: false,
    multipleAccounts: true,
    disconnect: true,
  },

  async getInstitutions(input: GetInstitutionsInput): Promise<Institution[]> {
    void input;
    return DEMO_ACCOUNTS.map((a) => ({
      id: a.institutionId,
      name: a.institutionName,
      countryCode: "NG",
      type: "PERSONAL_BANKING",
      authMethods: [{ id: `${a.institutionId}-internet`, type: "internet_banking", name: "Internet Banking" }],
    }));
  },

  /**
   * Nothing to create: the demo connection exists implicitly for any user, and
   * `bank-connect-session` materialises the rows. Returning a session keeps the
   * shape provider-agnostic without inventing a token that means nothing.
   */
  async createConnectionSession(input: CreateConnectionInput): Promise<ConnectionSession> {
    void input;
    return {
      providerId: DEMO_PROVIDER_ID,
      reference: demoConnectionIdFor(input.userId),
    };
  },

  async refreshAccount(input: RefreshAccountInput): Promise<RefreshResult> {
    void input;
    return {
      status: "ok",
      dataStatus: "AVAILABLE",
      checkedAt: new Date().toISOString(),
    };
  },

  async listAccounts(input: ListAccountsInput): Promise<ProviderAccount[]> {
    // The demo connection id embeds the user id, which is how the fixture
    // scopes its accounts. Verified by the caller; a mismatch yields nothing.
    if (input.providerConnectionId !== demoConnectionIdFor(input.userId)) {
      return [];
    }
    return DEMO_ACCOUNTS.map((a) => toProviderAccount(a, input.userId));
  },

  async listTransactions(input: ListTransactionsInput): Promise<ProviderTransactionPage> {
    void input;
    return { transactions: [], page: 1, hasMore: false };
  },

  async disconnect(input: DisconnectInput): Promise<void> {
    // Local-only: there is no upstream to revoke. The rows are updated by
    // bank-disconnect.
    void input;
  },
};

/** Demo transactions need the user id to scope ids; Mono does not. */
export function buildDemoTransactions(nowMs: number) {
  return buildDemoDataset(nowMs);
}
