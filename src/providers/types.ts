// Client-side view of the provider contract.
//
// Re-exports the canonical definitions from
// `supabase/functions/_shared/providers/types.ts` rather than restating them.
// This matches the repo's existing convention: `finance.ts` is already
// imported by app screens directly (`app/budget.tsx`, `src/lib/db.ts`), so a
// second hand-maintained copy would only create drift.
//
// The client does NOT implement `FinancialProvider` and never calls a
// provider directly. It calls Edge Functions. These types exist so the UI can
// reason about which providers are available in a country and what they
// support — see `./capabilities.ts` and `./registry.ts`.

export type {
  AccountStatus,
  AuthMethod,
  AuthMethodType,
  ConnectionSession,
  CreateConnectionInput,
  DataStatus,
  Direction,
  DisconnectInput,
  FinancialProvider,
  GetInstitutionsInput,
  Institution,
  ListAccountsInput,
  ListTransactionsInput,
  NormalizedTransaction,
  ProviderAccount,
  ProviderCapabilities,
  ProviderTransaction,
  ProviderTransactionPage,
  RefreshAccountInput,
  RefreshResult,
} from "../../supabase/functions/_shared/providers/types";
