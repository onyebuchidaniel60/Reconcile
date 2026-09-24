# Reconcile — Implementation Plan

**Version:** 2 — frontend-first, per SKILL_LEAN_DELIVERY.md Stage 4.
**Supersedes:** v1 horizontal-layer plan.
**Method:** one phase at a time. Implement → test → inspect → deploy → verify as user → commit → checkpoint → STOP.

---

## 0. Plan shape

The demo is complete and frozen at tag `demo-v1`. The full build extends from it.

The full build is **frontend-first**, per `SKILL_LEAN_DELIVERY.md` §2 Stage 4:

1. Build the design system from `design.md`.
2. Rebuild every screen against it.
3. Deploy and verify visually.
4. Layer real backend integrations underneath.
5. Harden.
6. Package for Shipaton.

The demo already delivered the working data layer (auth, provider abstraction,
demo provider, sync, review, budget, insights, deterministic Ask). The full
build's frontend phases replace the skeletal UI. The backend phases replace the
demo scaffolding with real providers, real AI, and real payments.

---

## 1. Completed phases

| Phase | Name | Status |
|---|---|---|
| 0 | Blueprint — source-of-truth docs, skills, design | ✅ Complete |
| 1 | Mobile foundation — Expo shell, tooling | ✅ Complete (folded into demo) |
| 2 | Core demo — auth, demo provider, sync, review, budget, insights, ask | ✅ Complete, tagged `demo-v1` |

Phase 2 was delivered in two slices (Slice 1: auth + sync + review + budget;
Slice 2: insights + ask + learned rules + ambiguous transfers), deployed to
Vercel, and verified by the operator in a browser. Two browser-runtime bugs were
found and fixed (CORS preflight on Edge Functions; missing
`babel-preset-expo` + whole-object env reads breaking client-side env inlining).
Learnings are recorded in `SKILL_LEAN_DELIVERY.md` §8.

---

## 2. Full-build phases

### FRONTEND LAYER

#### Phase 3 — Design tokens
**Objective:** Replace the demo's minimal theme with the full token system from
`design.md` §3–§5 and §9.
**Deliverable:** `src/theme/` with `colors.ts`, `type.ts`, `spacing.ts`,
`radius.ts`, `motion.ts`, `index.ts`. Inter font installed and loaded. Token-check
script (`scripts/check-tokens.mjs`) wired into the standard checks.
**Acceptance:** All tokens exist and are tested; no visual change to screens yet.
**Commit:** `feat: add design token system (Phase 3)`

#### Phase 4 — Wave 1–3 primitives
**Objective:** Build the primitive layer from `frontend-implementation-plan.md` §4
Waves 1–3.
**Deliverable:** `Text` (with role variants), `PairedTitle`, `Button` (primary,
secondary, ghost), `IconButton`, `Input`, `Chip`, `Card` (all 6 surface variants),
`Divider`, `SectionHeader`, `Skeleton`.
**Acceptance:** Every primitive renders in a browser; every color/spacing/radius
comes from tokens; no hard-coded values; accessibility labels present.
**Commit:** `feat: add core and container primitives (Phase 4)`

#### Phase 5 — Wave 4–5: charts, accent, motion, haptics
**Objective:** Build the visual signature layer.
**Deliverable:** `CategoryCircle`, `Starburst` (3 colors), `ProgressBar`,
`PillBadge`, `ChartAxis`, `ChartLegend`, `Donut`, `BarChart`, `LineChart`,
`ChartTextEquivalent` (a11y). Motion helpers under `src/lib/motion/`:
`useMotion`, `usePressScale`, `useCardEntrance`, `useConfirmPulse`, `useChartReveal`.
Haptics helpers under `src/lib/haptics/`.
**Acceptance:** Every chart matches `design.md` §7; hatched fills work; animation
respects reduced motion; every chart has a text equivalent.
**Commit:** `feat: add charts, starburst, motion, and haptics (Phase 5)`

#### Phase 6 — Wave 6–7: rows, states, shells, navigation
**Objective:** Build the composition and layout layer.
**Deliverable:** `TransactionRow`, `EmptyState`, `ErrorState`, `LoadingState`,
`Avatar`, `ScreenScaffold`, `DarkScreenScaffold`, `FormScaffold`, `PillNav`.
**Acceptance:** `PillNav` matches `design.md` §7 (floating, yellow selected
circle, 4 items). Shells respect safe areas on iOS-like viewports.
**Commit:** `feat: add rows, states, shells, and navigation (Phase 6)`

#### Phase 7 — Wave 8: feature organisms
**Objective:** Build the composite cards that appear on Home, Budget, and Insights.
**Deliverable:** `HeroSummaryCard` (yellow + donut + legend),
`BudgetOverviewCard` (mist + progress + "Today" pill),
`ExpensesBarCard` (yellow + bar chart + alert-red starburst),
`SpendTrendCard` (ink + line chart + paper starburst),
`PositiveMessageCard` (mint), `InsightCard`, `ReviewHeader` (paired title + starburst).
**Acceptance:** Every organism renders with fixture data and matches the
corresponding reference image for feel (not layout).
**Commit:** `feat: add feature organisms (Phase 7)`

#### Phase 8 — Screen rebuild: onboarding, auth, Home, Review
**Objective:** Replace the demo's skeletal versions of these screens with the
real design system.
**Screens:** Welcome, Privacy, Country, Sign up, Sign in, Demo entry, Home,
Review Transactions.
**Acceptance:** Each screen uses only primitives from Phases 4–7. Every screen
has empty, loading, error states. Reduced-motion fallback. Passing `design.md` §15
adoption checklist. Screenshots captured.
**Commit:** `feat: rebuild onboarding, auth, Home, and Review (Phase 8)`

#### Phase 9 — Screen rebuild: Activity, Detail, Budget, Insights, Ask, Settings
**Objective:** Same as Phase 8 for the remaining screens.
**Screens:** Activity, Transaction Detail, Budget Setup, Budget, Insights,
Ask Reconcile, Settings, Error/offline/not-found.
**Acceptance:** Same as Phase 8.
**Commit:** `feat: rebuild Activity, Detail, Budget, Insights, Ask, and Settings (Phase 9)`

#### Phase 10 — Browser agent-as-user pass + SKILL_FRONTEND_DESIGN.md v1
**Objective:** Complete the visual verification cycle and codify what was learned.
**Deliverable:**
- Agent opens the deployed URL, walks every screen at 375×812 and 1280×800,
  screenshots each, compares against `design.md`, fixes what fails, re-deploys.
- After at least one screen completes the full cycle (`build → deploy → visual
  pass → fix → re-deploy → clean second pass`), write
  `SKILL_FRONTEND_DESIGN.md` v1 per `frontend-implementation-plan.md` §16.
**Acceptance:** Second-pass screenshots clean against `design.md`; skill v1
committed.
**Commit:** `feat: complete frontend visual pass and write frontend skill v1 (Phase 10)`

### BACKEND LAYER

#### Phase 11 — Mono integration
**Objective:** Replace the demo provider with the real Mono adapter behind the
same `FinancialProvider` interface.
**Deliverable:** Mono client in Edge Functions; `MONO_SECRET_KEY` as a server
secret; institution discovery; connection session; account persistence; webhook
with authenticity + idempotency; reauth handling.
**Acceptance:** Sandbox connection works end to end; secret is server-only;
webhook is verified and idempotent; live test proves the full loop against
Mono sandbox.
**Commit:** `feat: add mono financial data provider (Phase 11)`

#### Phase 12 — RevenueCat monetization
**Objective:** Add subscriptions, entitlement gating, paywall, trial, restore.
**Deliverable:** SDK installed; products `reconcile_pro_monthly` and
`reconcile_pro_annual`; offering `default`; entitlement `pro`; 7-day trial;
contextual paywall; restore purchases; webhook with idempotency; entitlement
cache.
**Acceptance:** Premium features unlock only with active entitlement; trial and
restore paths testable; store products configured.
**Commit:** `feat: add revenuecat subscriptions and paywall (Phase 12)`

#### Phase 13 — Real AI (OpenAI categorization + Ask Reconcile upgrade)
**Objective:** Add server-side OpenAI for categorization fallback and upgrade
Ask Reconcile from deterministic-only to tool-driven LLM.
**Deliverable:** `ai/categorize` Edge Function with structured output validation;
`ai/ask` Edge Function with allow-listed read-only tools; prompt-injection
defense; caching of confirmed merchant patterns.
**Acceptance:** Low-confidence AI is a suggestion, never authoritative; tools
resolve user ownership server-side; no arbitrary SQL; injection tests pass.
**Commit:** `feat: add openai categorization and tool-driven ask (Phase 13)`

#### Phase 14 — Security hardening and deletion
**Objective:** Close the security and lifecycle gaps the demo deferred.
**Deliverable:** Rate limits on sync and AI; logging redaction; a full deletion
flow (`account/delete` disconnecting provider + purging app data); security
tests (IDOR, user-ID substitution, webhook replay, prompt injection, secret scan).
**Acceptance:** All security tests pass; no secrets in any built bundle;
deletion leaves no user data.
**Commit:** `feat: add security hardening and account deletion (Phase 14)`

### RELEASE

#### Phase 15 — E2E, store packaging, Shipaton release
**Objective:** Final packaging for the Shipaton submission.
**Deliverable:** E2E tests on the full build; App Store and Google Play listings;
1024×1024 icon; 1179×2556 screenshot without device framing; sub-two-minute
demo video; judge promo access path; US download verification; Devpost submission.
**Acceptance:** New public release within the Shipaton submission period; the app
is fully published; premium can be tested end to end; demo is under two minutes.
**Commit:** `chore: ship reconcile for hackathon submission (Phase 15)`

---

## 3. Per-phase protocol

1. Inspect current repository state.
2. Read source-of-truth docs relevant to the phase.
3. Implement only the assigned phase.
4. Run targeted tests plus the project's standard checks.
5. Inspect the complete diff.
6. Deploy.
7. Run the agent-as-user pass (browser tools required from Phase 3 onward).
8. Fix only verified problems.
9. Update `AI_HANDOFF.md`.
10. Commit one logical checkpoint.
11. Verify commit.
12. STOP.

---

## 4. Definition of full product complete

- Design system fully implemented per `design.md`.
- Every screen rebuilt against it.
- Agent-as-user pass completed per screen.
- Mono integration live and verified.
- RevenueCat entitlement live and testable.
- AI categorization and Ask Reconcile working under the allow-listed tool model.
- Security hardening complete.
- Account deletion and disconnect flows work.
- E2E critical journeys pass.
- Store listings published.
- Shipaton submission package complete.

---

## 5. External dependencies

- Mono business onboarding / KYB and live credentials.
- Current Mono institution coverage must be fetched dynamically.
- Supabase project and Edge Function secrets.
- RevenueCat project and store products.
- OpenAI API key.
- Apple and Google developer accounts and store review.
- Final product-name availability check.

---

## 6. Skill relationship

- `SKILL_LEAN_DELIVERY.md` governs sequencing and deployment for every phase.
- `SKILL_FRONTEND_DESIGN.md` is earned at Phase 10, not before.
- `frontend-implementation-plan.md` governs the frontend build order within
  Phases 3–10.
- `design.md` wins on visual conflicts.
- This file wins on phase sequencing, subject to the above.
