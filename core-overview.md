# core-overview.md — Reconcile Core Demo Foundation

**Status:** Active working document for the initial demo build.
**Relationship to source-of-truth docs:** This file does NOT replace or override
PROJECT_SPEC.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, AGENTS.md, AI_HANDOFF.md,
or RECONCILE_BLUEPRINT.md. Those remain authoritative for the full product.
This file defines a subset built first as the working foundation.

---

## 1. Purpose

Build the core functional loop of Reconcile as a working, deployable, unpolished,
correct foundation. It must be real — real auth, real DB, real RLS, real sync,
real budget math — not a mockup. Visual polish is deferred. The full product
builds on top of this.

## 2. Core loop delivered

Connect → Sync → Review → Categorize → Budget → Understand

## 3. Non-negotiables (inherited, not renegotiable)

- Money stored as integer minor units + ISO currency code.
- Transaction facts immutable; user category/review state separate.
- No bank credentials stored anywhere.
- No server secrets in the mobile/web bundle.
- User identity derived from the authenticated session only.
- RLS on every customer-owned row.
- Sync idempotent; unique key = (provider_id, bank_account_id, provider_transaction_id).
- No transaction data in logs or analytics.
- Internal transfers must not inflate spending.
- No AI in this demo. All numbers are deterministic.

## 4. In scope

- Supabase auth: email/password, session restore, protected routes, sign out.
- Supabase schema + RLS per ARCHITECTURE.md §6, plus seed categories.
- Provider interface + registry + Demo provider.
- Edge Functions: bank/connect-session (demo), bank/sync, bank/disconnect.
- Demo provider with synthetic Nigerian bank data:
  GTBank, UBA, Sterling; ~40–60 synthetic transactions across ~60 days;
  expenses, income, refunds; at least one internal transfer pair
  (-₦50,000 from UBA, +₦50,000 to GTBank, same day);
  realistic Nigerian merchant names (Bolt, Uber, Shoprite, DSTV, MTN, Airtel, etc.).
  All demo data clearly labeled synthetic in the UI.
- Sync pipeline: fetch → normalize → validate → dedupe → insert → create review state.
- Review queue with one-tap category confirm/change.
- Deterministic categorization rules.
- Learned merchant rules from confirmed choices.
- High-confidence internal transfer detection.
- Budget engine: monthly total, optional category caps, deterministic forecast.
- Read-only Ask Reconcile using deterministic tools only (no LLM).
- All core screens, plain styling.

## 5. Out of scope for this demo

- Design system, motion, haptics, custom charts.
- Real Mono integration.
- Any LLM / OpenAI call.
- RevenueCat / paywall / trial.
- Webhooks.
- CSV import.
- Recurring-charge detection.
- Advanced insights beyond simple month-over-month comparison.
- Account deletion flow.
- Rate limiting, webhook verification, non-baseline hardening.

Added later using IMPLEMENTATION_PLAN.md and the other source-of-truth docs.

## 6. Screens (plain, functional)

Welcome, Privacy, Country (NG default), Sign up, Sign in, Demo entry,
Home, Review Transactions, Transaction Detail, Activity, Budget Setup, Budget,
Insights, Ask Reconcile, Settings.

## 7. Infrastructure

Reuse existing infrastructure. Create only what does not exist. Report required keys.

### Supabase
- Check if a Supabase project is already linked or configured
  (config files, existing env, linked CLI project).
- If it exists: use it. Do not create a new one.
- If it does not exist: create it using the Supabase CLI and report back
  exactly which keys the operator must provide. Do not invent fake keys.
- Apply migrations to the project.
- Deploy Edge Functions to the project.
- Required keys (client-safe, go into EXPO_PUBLIC_*):
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY
- Required secrets (server-only, set as Supabase Edge Function secrets,
  never in the web bundle, never committed):
  - SUPABASE_SERVICE_ROLE_KEY
  - (future: MONO_SECRET_KEY, OPENAI_API_KEY — not needed for this demo)

### Vercel (auto-deploy from GitHub — operator owns this)
- Do NOT create a Vercel project.
- Do NOT run `vercel deploy`.
- Do NOT set Vercel env vars.
- Only ensure the repo is deployable by Vercel on push:
  - Expo web is configured;
  - a build script exists in package.json;
  - vercel.json is present if Vercel needs explicit build settings;
  - no secrets are committed.

### What must be committed to make Vercel deploy work
- Expo web deps installed via `npx expo install react-native-web react-dom`.
- `app.json` configured with `"web": { "output": "static" }` (or "single" if static
  export fails for a reason, with the reason documented).
- `package.json` script: `"build:web": "expo export -p web"`.
- `vercel.json` (if needed) pointing Vercel at that build command and the export output.
- `.env.example` updated with placeholder names only — no values.

## 8. Two slices

### Slice 1 — Foundation + Demo Loop + deployable web build
- Supabase auth + session restore + protected routes.
- Schema migrations + RLS + seed categories.
- Provider interface + registry.
- Demo provider.
- Edge Functions: bank/connect-session (demo), bank/sync, bank/disconnect.
- Sync pipeline with idempotency.
- Review queue UI.
- Budget engine + Budget UI.
- Home, Activity, Transaction Detail, Settings.
- Welcome / Privacy / Country / Sign up / Sign in / Demo entry.
- Expo web build configured and produces a Vercel-deployable output.
- Repo pushed so Vercel auto-deploys.
- Report the deployed URL once Vercel finishes.

Acceptance (Slice 1):
- Sign up → Demo Mode → sync → transactions appear in Review.
- Confirm categories → Budget and Home update immediately.
- Internal transfer pair excluded from spending.
- Running sync twice does not duplicate transactions.
- Second user cannot read first user's data (RLS proof test).
- `npx tsc --noEmit`, `npx eslint .`, `npx jest` all pass.
- `npx expo export -p web` succeeds and produces a deployable directory.
- No server secrets in the built web bundle.
- Repo is pushed; the operator confirms Vercel deployed successfully.

Commit: `feat: core demo slice 1 — auth, demo provider, sync, review, budget`

### Slice 2 — Complete the core loop
- Insights screen (deterministic only).
- Ask Reconcile (deterministic tools, no LLM).
- Learned merchant rules surfaced in review.
- Ambiguous transfer handling (remains reviewable).
- Loading / empty / error states on every screen.
- Unit tests: currency, budget, refund, transfer matching, dedupe.
- E2E: full demo loop.
- Redeploy via push; operator confirms Vercel deployed.

Acceptance (Slice 2):
- Full core loop works with zero external credentials.
- All tests pass.
- Web build still deploys cleanly.

Commit: `feat: core demo slice 2 — insights, ask reconcile, rules, tests`

## 9. Definition of done

A new user can:
1. Sign up.
2. Enter Demo Mode.
3. See synthetic accounts and transactions.
4. Review and categorize transactions one tap at a time.
5. Watch their budget update immediately.
6. See the internal transfer correctly excluded from spending.
7. Browse activity with filters.
8. Ask simple financial questions and get correct, data-grounded answers.
9. Sign out and sign back in without losing state.
10. Do all of this at a public Vercel URL on desktop and mobile browser.

The app is visually unpolished but functionally correct, and it is the foundation
the full product is built on.