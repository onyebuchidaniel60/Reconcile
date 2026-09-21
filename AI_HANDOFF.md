# Reconcile — AI Handoff

## Current status
**PHASE 1 COMPLETE.** Mobile foundation committed as
`feat: bootstrap reconcile mobile foundation`. No domain logic exists.

## Phase 1 checkpoint (evidence)
- Expo 57 + React Native + TypeScript shell with Expo Router
  (`app/_layout.tsx`, `index`, `activity`, `budget`, `insights`,
  `+not-found` placeholders; no auth, no providers, no AI, no billing).
- Tooling: `npm run lint` passes (eslint 9 + eslint-config-expo),
  `npm run typecheck` passes (`tsc --noEmit`), `npm test` passes
  (jest-expo, 4/4 smoke tests: theme tokens + env validation).
- Development launch verified: Metro `packager-status:running`; iOS entry
  bundle served over HTTP 200 (6,069,003 chars, contains app screens).
- `npx expo export --platform ios` succeeds (1110 modules, entry.hbc).
- Scope notes: base theme tokens only (`src/theme/tokens.ts`);
  `ErrorBoundary`; client-safe `EXPO_PUBLIC_*` env pattern
  (`src/lib/env.ts`, `.env.example`); server secrets intentionally absent.
- Dependency notes: `react-native-screens ~4.26.0`,
  `react-native-safe-area-context ~5.7.0`, `jest ~29.7.0`,
  `@types/jest 29.5.14` per `expo install --fix` (SDK 57);
  `overrides.react-dom = 19.2.0` to match scaffold-pinned react 19.2.3
  (latest react-dom 19.3.0 requires react ^19.3.0).

## Project
Reconcile is a Nigeria-first mobile personal-finance app focused on cross-bank transaction reconciliation, budgeting and read-only financial insights.

## Locked decisions
- Working name: Reconcile.
- Primary provider: Mono for Nigeria.
- Future countries use provider adapters behind a common interface.
- Read-only bank-data product; no money movement.
- Demo Mode is required for judge/public access without bank credentials.
- CSV is the fallback import path.
- Provider transaction facts are immutable; user review/category is separate state.
- Deterministic calculations; AI provides classification/explanation only.
- RevenueCat entitlement: `pro`.
- 7-day trial plus judge promo fallback.
- Visual identity follows the supplied high-contrast black/white/yellow reference with coral/secondary accents.

## External setup dependencies
- Mono business onboarding/KYB and sandbox/live credentials.
- Current institution coverage must be fetched dynamically.
- Supabase projects and environment secrets.
- RevenueCat project/store products.
- OpenAI API key before AI phase.
- Apple/Google developer accounts and store review.
- Final product-name availability check.

## Privacy posture
Open source is not a zero-knowledge guarantee. The server can process financial data that passes through it. Product copy must say exactly what is true. Minimize stored fields and never store bank credentials.

## Shipaton constraints
Standard submissions require a new public release in the submission period, an eligible store listing, RevenueCat purchase integration, a sub-two-minute demo, 1024×1024 icon, 1179×2556 screenshot without device framing, and either a free trial or judge promo access for premium testing. The app must be accessible in the United States.

## Operating method
Use:
`IMPLEMENT → TEST → INSPECT → FIX → COMMIT → CHECKPOINT → STOP`

## Current phase
Phase 1 — Mobile foundation and tooling complete and committed.

## Next exact task
Implement **Phase 2 — Design system and app shell** from `IMPLEMENTATION_PLAN.md` only.

Before changing code:
1. inspect repository state;
2. read source-of-truth docs;
3. confirm no later phase is already implemented.

After Phase 1:
- run tests;
- inspect diff;
- update this handoff;
- commit;
- STOP.
