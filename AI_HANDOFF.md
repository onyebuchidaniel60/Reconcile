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
  `@types/jest 29.5.14` per `expo install --fix` (SDK 57).
  (The `overrides.react-dom` pin from the original Phase 1 commit was
  removed again in the Phase 1 follow-up below.)

## Phase 1 follow-up checkpoint (review items, before Phase 2)
- Docs commit: `a75352a docs: add reconcile source-of-truth documentation`
  (PROJECT_SPEC, ARCHITECTURE, IMPLEMENTATION_PLAN, AGENTS,
  RECONCILE_BLUEPRINT; README was already tracked).
- Cleanup commit: `e449a67 chore: phase 1 cleanup — env scope, dependency
  verification, minimal placeholders`.
- Env cleanup: `.env.example` and `src/lib/env.ts` now expose only
  `EXPO_PUBLIC_APP_ENV`. The future-phase `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` declarations (and their test) were
  removed. Secret grep over the repo (excluding node_modules/.git) matches
  only the server-only key list documented in RECONCILE_BLUEPRINT.md —
  no server secret is referenced in the mobile codebase.
- react-dom override decision: REMOVED. Evidence: `npm view
  react-dom@19.3.0 peerDependencies` → `{ react: '^19.3.0' }`, but a fresh
  `npm install` with no lockfile and no override succeeds (1000 packages,
  benign worklets warnings only); `npm install --package-lock-only`
  without the override keeps a working lock; `npx expo install --check`
  and `npx expo install --fix` both report "Dependencies are up to date".
  The override was pinning a transitive optional peer, not masking a stale
  lock or wrong dependency, so it was unnecessary.
- Placeholders: `app/index.tsx`, `app/activity.tsx`, `app/budget.tsx`,
  `app/insights.tsx` render plain-text labels only (unstyled `Link`s kept
  so the Expo Router structure stays navigable). No styled cards/colors.
- ErrorBoundary: used only in `app/_layout.tsx` at the root, wrapping the
  Stack. No per-route usage.
- Raw check outputs on the final tree:
  - `npx tsc --noEmit` → exit 0, no output.
  - `npx eslint .` → exit 0, no output.
  - `npx jest` → `PASS tests/smoke.test.ts`, 3/3 tests passed
    (theme tokens, default env, known/rejected env values).

## Slice 1 deployment checkpoint (Vercel, demo loop live)
- Merge commit: `ccd6247 fix: inline EXPO_PUBLIC_* env vars via babel-preset-expo
  and member reads` (merged origin/main operator commits; kept working
  vercel.json with schema/build/output/framework/install fields).
- Deploy: Vercel project `reconcile`, production
  `https://reconcile-hlc8b8400-uhhh2.vercel.app`
  (alias `https://reconcile-two-tau.vercel.app`), readyState READY.
- Root causes for env values missing from the first bundle: (1) the repo had
  no `babel.config.js` and no `babel-preset-expo` dependency, so Expo's
  inline-env-vars babel plugin never ran; (2) `src/lib/env.ts` read
  `process.env` as a whole object via `globalThis`, but the plugin only
  inlines direct `process.env.EXPO_PUBLIC_*` member expressions. Fixed with
  the preset dep, an explicit babel config, and member-access reads.
- Verification: `curl -sIL` → HTTP 200 with Expo root div; deployed JS bundle
  contains exactly one match equal to the Supabase project URL (not a
  wildcard); secret scans (access token, service role) return zero matches
  in `dist/` and in `app/`+`src/`.
- Live backend proven earlier: migrations applied, 3 Edge Functions deployed,
  live jest E2E green (sync idempotency, RLS isolation, review confirm,
  internal-transfer exclusion, budget math).
- Deployment Protection: SSO wall found ON by default and disabled via the
  project API (`ssoProtection: null`, auditable, no dashboard use); verified
  still OFF after redeploy, URL publicly reachable.
- Status: Slice 1 deployed and verified by HTTP/bundle checks, NOT verified
  by agent-as-user (no browser tools).
- Manual verification checklist for the operator: sign up → Demo Mode →
  sync (55 synthetic txns) → review queue → change/confirm a category →
  Home and Budget update → sync again (added 0) → ₦50,000 internal-transfer
  pair excluded from spend → activity filters → budget setup with caps →
  disconnect → sign out → sign back in (state persists) → second user sees
  none of the first user's rows; check 375px and 1280px layouts and a clean
  console/network tab on each screen.

## Slice 2 checkpoint (core demo complete)
- Fix commit: `74010ed fix: repair demo-mode edge function connectivity`.
  Root cause: browsers preflight supabase-js calls with `authorization,
  apikey, content-type, x-client-info`, but functions answered OPTIONS with
  only `authorization, content-type` and no `Access-Control-Allow-Methods`,
  so every browser call died as "Failed to send a request to the Edge
  Function" (native fetch has no CORS, which is why tests passed). Fix: a
  shared `_shared/cors.ts` helper used by all functions including the error
  envelope. Verified by curl preflight + an authenticated throwaway-user
  connect call returning connection + 3 accounts.
- Slice 2 commit: `9a02e6e feat: core demo slice 2 — insights, ask
  reconcile, rules, ambiguous transfers`.
- Scope delivered: deterministic Insights (month compare, biggest category
  change, top merchant, first-month state); Ask Reconcile via new `ai-ask`
  Edge Function (five fixed patterns + unsupported state, session-scoped
  tools, grounding "based on" line, no LLM); learned merchant rules (second
  same-merchant/category confirm creates a `merchant_rules` row; next sync
  auto-suggests via `suggestion:user_rule`); ambiguous near-miss transfers
  stay in review with a visible flag; loading/empty/error + retry states on
  all screens including Insights and Ask.
- Live-test bugs caught and fixed: invalid `refund` suggestion category
  silently voiding review batches (removed; merchant rules win); snake_case
  `amount_minor` misread as camelCase causing 6 bogus transfer pairs (plus a
  matcher malformed-row guard); budget insert RLS failure (migration 000002
  defaults + explicit id); jest-expo stubbed fetch (node:http fetch shim).
- Checks on the final tree: `tsc` 0, `eslint` 0, `jest` 10 suites 41/41
  (both live tests green), `expo export -p web` 18 routes, secret scans zero.
- Deploy: production `https://reconcile-jhmath5cq-uhhh2.vercel.app`
  (alias `reconcile-two-tau.vercel.app`), READY; HTTP 200 with Expo root;
  deployed bundle contains exactly one match equal to the project URL;
  Deployment Protection verified OFF.
- Stubbed/deferred: interactive agent-as-user pass (no browser tools —
  HTTP/bundle checks + live E2E instead); visual design system, charts,
  motion, Mono/OpenAI/RevenueCat/webhooks/CSV (later phases).
- Status: core demo loop deployed and verified as far as automation allows;
  NOT verified by agent-as-user (no browser tools).

## Demo phase closed (2026-09-24, operator-verified)
- Working deployed URL: `https://reconcile-two-tau.vercel.app`.
- The operator verified the full loop in a browser: Enter Demo Mode works,
  sync → review → confirm → budget updates, Insights renders, Ask Reconcile
  answers grounded questions, no console errors.
- Two bugs found during browser verification and fixed: (1) incomplete CORS
  preflight on Edge Functions blocked every browser function call;
  (2) missing babel-preset-expo plus whole-object `process.env` reads left
  `EXPO_PUBLIC_*` values out of web bundles. Both are recorded with root
  causes in the SKILL_LEAN_DELIVERY.md §8 evolution log.
- This demo is now the frozen foundation for the full build (tag `demo-v1`).
  Extend it; do not restart from scratch.
- Deliberately NOT included: design system, charts, motion, haptics, pill
  navigation, Mono integration, OpenAI/LLM, RevenueCat/paywall, webhooks,
  CSV import, recurring detection, account deletion, and an interactive
  agent-as-user pass by the agent (no browser tools; HTTP/bundle/live-E2E
  verification instead).
- SKILL_FRONTEND_DESIGN.md is intentionally unwritten. It will be earned
  from the full frontend phase, per frontend-implementation-plan.md §16.

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
