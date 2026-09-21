# Reconcile — Implementation Plan

**Method:** one small phase at a time. Implement → test → inspect → fix → commit → checkpoint → STOP.

## Phase 1 — Mobile foundation
Objective: create Expo/TypeScript app shell, router, tooling and theme tokens.
Tests: lint, typecheck, unit smoke, development launch.
Acceptance: app launches and navigates; no domain logic.
Commit: `feat: bootstrap reconcile mobile foundation`

## Phase 2 — Design system and app shell
Objective: implement the supplied black/white/yellow visual language as reusable primitives.
Components: Button, Card, IconButton, PillNav, SectionHeader, EmptyState, LoadingState, ErrorState, progress/chart primitives, haptics and motion helpers.
Acceptance: Home/Activity/Budget/Insights placeholders visually match the reference direction.
Commit: `feat: add reconcile design system and app shell`

## Phase 3 — Authentication
Objective: Supabase Auth, session restore, sign up/in/out, protected routes and profile creation.
Security tests: unauthorized access and user-isolation checks.
Commit: `feat: add authentication and protected app shell`

## Phase 4 — Financial provider abstraction
Objective: create provider-neutral account/transaction contracts and registry.
Deliverable: demo provider plus fixtures.
Acceptance: no product-domain code depends on Mono-specific fields.
Commit: `feat: add financial provider abstraction`

## Phase 5 — Demo mode and trust onboarding
Objective: Welcome, privacy explanation, country selection, Demo Mode and first review experience.
Acceptance: judges can experience the core loop without bank credentials; all demo data is clearly labeled synthetic.
Commit: `feat: add demo mode and onboarding flow`

## Phase 6 — Mono sandbox integration
Objective: Mono Connect connection, institution discovery, account persistence, webhooks and data status.
Dependency: Mono sandbox account/keys.
Acceptance: sandbox connection works; secret key is server-only; webhooks are idempotent.
Commit: `feat: integrate mono financial data provider`

## Phase 7 — Transaction sync and reconciliation
Objective: pagination, normalization, dedupe, review queue, categorization, merchant rules and internal-transfer matching.
Tests: duplicate sync, concurrent webhook, immutable facts, transfer double-count prevention.
Commit: `feat: add transaction sync and reconciliation`

## Phase 8 — Budget engine
Objective: monthly budgets, category caps, deterministic spending totals, refunds, internal-transfer exclusion, remaining budget and forecast.
Commit: `feat: add budgeting engine and budget experience`

## Phase 9 — Insights and Ask Reconcile
Objective: deterministic insight queries, recurring candidates, AI categorization fallback and read-only Q&A.
Tests: structured outputs, prompt injection, data grounding, no arbitrary SQL.
Commit: `feat: add insights and ask reconcile`

## Phase 10 — RevenueCat monetization
Objective: RevenueCat SDK, `pro` entitlement, monthly/annual products, 7-day trial, contextual paywall, restore, webhook cache and analytics events.
Acceptance: premium features unlock only with active entitlement; trial/promo path is testable.
Commit: `feat: add RevenueCat subscriptions and paywall`

## Phase 11 — Privacy and security hardening
Objective: Accounts, privacy controls, disconnect/delete, logging redaction, rate limits, webhook verification, dependency review and security tests.
Commit: `feat: add privacy controls and security hardening`

## Phase 12 — E2E and Shipaton release
Objective: E2E critical journeys, store packaging, icon, screenshot, demo video, US download verification and Devpost submission.
Acceptance: new public release is within the Shipaton submission period; app is fully published; premium can be tested; demo is under two minutes.
Commit: `chore: ship reconcile for hackathon submission`

## Per-phase protocol

1. Inspect current repository state.
2. Read source-of-truth docs.
3. Implement only the assigned phase.
4. Run targeted tests plus the project's standard checks.
5. Inspect the complete diff.
6. Fix verified problems only.
7. Update `AI_HANDOFF.md`.
8. Commit one logical checkpoint.
9. Verify commit.
10. STOP.

## Definition of MVP complete

Auth works; demo mode works; supported bank connection works in the configured environment; transactions sync idempotently; review/categorization works; budget is correct; insights and read-only AI work; RevenueCat Pro unlocks; privacy/delete controls work; critical E2E tests pass; store and Shipaton submission assets are ready.
