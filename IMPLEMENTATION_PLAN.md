# Reconcile — Implementation Plan

**Version:** 3 — frontend-first with native verification.
**Supersedes:** v1 (horizontal layers), v2 (web-only verification).
**Method:** one phase at a time. Implement → test → inspect → deploy (web + native) → verify as user → commit → checkpoint → STOP.

---

## 0. Plan shape

The demo is complete and frozen at tag `demo-v1`. The full build extends from it.

The full build is **frontend-first**, per `SKILL_LEAN_DELIVERY.md` §2 Stage 4:

1. Build the design system from `design.md`.
2. Rebuild every screen against it.
3. Deploy and verify visually — **on web and on a real device.**
4. Layer real backend integrations underneath.
5. Harden.
6. Package for Google Play and App Store.

The demo already delivered the working data layer (auth, provider abstraction,
demo provider, sync, review, budget, insights, deterministic Ask). The full
build's frontend phases replace the skeletal UI. The backend phases replace the
demo scaffolding with real providers, real AI, and real payments.

**Verification is dual-surface.** Web (Vercel + Playwright) is fast iteration.
Native (EAS build → installed on a real Android device) is the reality check.
Both are required from Phase 7 onward. Native-specific behavior — safe areas,
keyboard handling, fonts, shadows, touch targets, haptics — cannot be verified
on web.

---

## 1. Completed phases

| Phase | Name | Status |
|---|---|---|
| 0 | Blueprint — source-of-truth docs, skills, design | ✅ Complete |
| 1 | Mobile foundation — Expo shell, tooling | ✅ Complete |
| 2 | Core demo — auth, provider, sync, review, budget, insights, ask | ✅ Complete, tag `demo-v1` |
| 3 | Design tokens | ✅ Complete |
| 4 | Wave 1–3 primitives | ✅ Complete |
| 5 | Wave 4–5: charts, motion, haptics | ✅ Complete |
| 6 | Wave 6–7: rows, states, shells, navigation | ✅ Complete |

Phase 2 was delivered in two slices, deployed to Vercel, and verified by the
operator in a browser. Browser-runtime bugs found and fixed (CORS preflight on
Edge Functions, missing `babel-preset-expo` + whole-object env reads,
per-weight font family mismatch). Learnings recorded in
`SKILL_LEAN_DELIVERY.md` §8.

---

## 2. Full-build phases

### FRONTEND LAYER

#### Phase 7 — Wave 8 feature organisms + native build pipeline
**Status:** In progress. Organisms shipped at `b5a7ff2`. Native build pipeline
landing now to complete the phase.

**Objective:** Complete the frontend component stack with the composite feature
cards, and establish the native build pipeline (EAS) that every phase from
Phase 8 onward will be verified against.

**Deliverable (organisms — done):**
- `HeroSummaryCard` — yellow card, donut, income/expenses legend.
- `BudgetOverviewCard` — mist card, progress bar, "Today" pill.
- `ExpensesBarCard` — yellow card, 4-month bar chart, hatched highlight,
  alert-red starburst callout.
- `SpendTrendCard` — ink card, line chart with dashed projection, paper
  starburst.
- `PositiveMessageCard` — mint card, single reassurance line.
- `InsightCard` — paired numbers with delta indicator.
- `ReviewHeader` — paired title with starburst.

**Deliverable (native pipeline — this completion):**
- `eas.json` with `development`, `preview`, `production` profiles.
- `app.json` updated with `android.package`, `ios.bundleIdentifier`,
  `versionCode`, `buildNumber`, `scheme`.
- `.easignore` preventing secrets from being uploaded to EAS.
- First Android preview build (APK) produced successfully.
- APK URL delivered to the operator for installation on a real device.

**Acceptance:**
- Organisms render in the gallery and match `design.md` §8 (done).
- EAS build succeeds.
- APK downloads and installs on the operator's Android device.
- App launches without crash.
- Welcome → Demo → Home renders correctly on device.
- Safe areas, keyboard behavior, fonts, and touch targets are verified on
  device.
- Any native-only defect is fixed in-phase or explicitly logged with a plan.
- No secret is included in the EAS upload.

**Commits:** `feat: add wave 8 feature organisms (Phase 7)` (done at `b5a7ff2`),
`chore: configure eas build and produce first android apk (Phase 7)`
(this completion).

#### Phase 8 — Screen rebuild: onboarding, auth, Home, Review
**Objective:** Replace the demo's skeletal versions of these screens with the
real design system.

**Screens:** Welcome, Privacy, Country, Sign up, Sign in, Demo entry, Home,
Review Transactions.

**Acceptance:**
- Each screen uses only primitives from Phases 4–7.
- Every screen has empty, loading, error states.
- Reduced-motion fallback present.
- `PillNav` wired to Expo Router (first time); Home active on Home; hidden on
  Review Transactions.
- Every screen passes the `design.md` §15 adoption checklist.
- **Agent-as-user pass on web:** screenshots at 375×812 and 1280×800, console
  and network clean, second pass clean.
- **Native smoke test:** EAS build succeeds; APK installs on the operator's
  Android device; app launches; the phase's screens render and the primary flow
  works on device. Report findings.
- Any native-only defect (safe area, keyboard, touch target, font rendering)
  fixed in-phase or explicitly logged with a plan.

**Commit:** `feat: rebuild onboarding, auth, Home, and Review (Phase 8)`

#### Phase 9 — Screen rebuild: Activity, Detail, Budget, Insights, Ask, Settings
**Objective:** Same as Phase 8 for the remaining screens.

**Screens:** Activity, Transaction Detail, Budget Setup, Budget, Insights,
Ask Reconcile, Settings, Error/offline/not-found.

**Acceptance:** Same as Phase 8, including native smoke test.

**Commit:** `feat: rebuild Activity, Detail, Budget, Insights, Ask, and Settings (Phase 9)`

#### Phase 10 — Dual-surface agent-as-user pass + `SKILL_FRONTEND_DESIGN.md` v1
**Objective:** Complete the visual verification cycle on both surfaces and
codify what was learned.

**Deliverable:**
- Agent walks every screen on web (Playwright) and on device (via EAS preview
  build installed on the operator's Android device).
- Screenshots on both surfaces.
- Fixes what fails.
- After at least one screen completes the full cycle (`build → deploy → visual
  pass on web and native → fix → re-deploy → clean second pass`), rewrite
  `SKILL_FRONTEND_DESIGN.md` v1 per `frontend-implementation-plan.md` §16.
  The file pre-exists from the blueprint; Phase 10 **rewrites** it with what
  the browser and native passes actually taught.

**Acceptance:** Second-pass screenshots clean against `design.md` on both
surfaces. Skill v1 committed.

**Commit:** `feat: complete dual-surface visual pass and write frontend skill v1 (Phase 10)`

### BACKEND LAYER

#### Phase 11 — Mono integration
**Objective:** Replace the demo provider with the real Mono adapter behind the
same `FinancialProvider` interface.

**Deliverable:** Mono client in Edge Functions; `MONO_SECRET_KEY` as a server
secret; institution discovery; connection session; account persistence;
webhook with authenticity + idempotency; reauth handling.

**Acceptance:** Sandbox connection works end to end on both web and native;
secret is server-only; webhook is verified and idempotent; live test proves the
full loop against Mono sandbox.

**Commit:** `feat: add mono financial data provider (Phase 11)`

#### Phase 12 — RevenueCat monetization
**Objective:** Add subscriptions, entitlement gating, paywall, trial, restore.

**Deliverable:** SDK installed; products `reconcile_pro_monthly` and
`reconcile_pro_annual`; offering `default`; entitlement `pro`; 7-day trial;
contextual paywall; restore purchases; webhook with idempotency; entitlement
cache.

**Acceptance:** Premium features unlock only with active entitlement; trial and
restore paths testable on both web (RevenueCat Test Store) and native (Google
Play sandbox); store products configured.

**Commit:** `feat: add revenuecat subscriptions and paywall (Phase 12)`

#### Phase 13 — Real AI (OpenAI categorization + Ask Reconcile upgrade)
**Objective:** Add server-side OpenAI for categorization fallback and upgrade
Ask Reconcile from deterministic-only to tool-driven LLM.

**Deliverable:** `ai/categorize` Edge Function with structured output
validation; `ai/ask` Edge Function with allow-listed read-only tools;
prompt-injection defense; caching of confirmed merchant patterns.

**Acceptance:** Low-confidence AI is a suggestion, never authoritative; tools
resolve user ownership server-side; no arbitrary SQL; injection tests pass.
Verified on web and native.

**Commit:** `feat: add openai categorization and tool-driven ask (Phase 13)`

#### Phase 14 — Security hardening and deletion
**Objective:** Close the security and lifecycle gaps the demo deferred.

**Deliverable:** Rate limits on sync and AI; logging redaction; a full deletion
flow (`account/delete` disconnecting provider + purging app data); security
tests (IDOR, user-ID substitution, webhook replay, prompt injection, secret
scan).

**Acceptance:** All security tests pass; no secrets in any built bundle (web or
native); deletion leaves no user data.

**Commit:** `feat: add security hardening and account deletion (Phase 14)`

### RELEASE

#### Phase 15 — E2E, store packaging, Shipaton release
**Objective:** Final packaging for the Shipaton submission.

**Deliverable:**
- E2E tests on the full build (web + native).
- EAS production build (Android AAB, iOS IPA if in scope) uploaded to Google
  Play (internal testing track at minimum) and App Store Connect (if in scope).
- 1024×1024 icon.
- 1179×2556 screenshot without device framing.
- Sub-two-minute demo video.
- Judge promo access path.
- US download verification.
- Devpost submission.

**Acceptance:**
- New public release within the Shipaton submission period.
- The app is fully published on Google Play (required) and the App Store (if in
  scope).
- Premium can be tested end to end.
- Demo is under two minutes.

**Commit:** `chore: ship reconcile for hackathon submission (Phase 15)`

---

## 3. Per-phase protocol

1. Inspect current repository state.
2. Read source-of-truth docs relevant to the phase.
3. Implement only the assigned phase.
4. Run targeted tests plus the project's standard checks.
5. Inspect the complete diff.
6. Deploy to web.
7. Run the agent-as-user pass on web (Playwright). Screenshots at 375×812 and
   1280×800.
8. From Phase 7 onward: deploy to native (EAS preview build), install on the
   operator's Android device, run the native smoke test.
9. Fix only verified problems on either surface.
10. Update `AI_HANDOFF.md`.
11. Commit one logical checkpoint.
12. Verify commit.
13. STOP.

---

## 4. Definition of full product complete

- Design system fully implemented per `design.md`.
- Every screen rebuilt against it.
- Agent-as-user pass completed on web and native for every screen.
- Native build (Android APK/AAB) installs and runs on a real device without
  crash.
- Mono integration live and verified on both surfaces.
- RevenueCat entitlement live and testable on both surfaces.
- AI categorization and Ask Reconcile working under the allow-listed tool model.
- Security hardening complete.
- Account deletion and disconnect flows work.
- E2E critical journeys pass on web and native.
- Google Play listing published. App Store listing published if iOS is in scope.
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
- **Expo account** (free) — required for EAS build.
- **EAS CLI** (installed locally) — required for native builds from Phase 7.
- **Google Play developer account** — $25 one-time fee. Required for Phase 15.
- **Apple Developer account** — $99/year. Required if iOS is in scope for
  Phase 15.

---

## 6. Skill relationship

- `SKILL_LEAN_DELIVERY.md` governs sequencing and deployment for every phase.
- `SKILL_FRONTEND_DESIGN.md` is earned at Phase 10, not before. The file
  pre-exists from the blueprint commit; Phase 10 rewrites it based on what the
  dual-surface pass taught.
- `frontend-implementation-plan.md` governs the frontend build order within
  Phases 3–10.
- `design.md` wins on visual conflicts.
- This file wins on phase sequencing, subject to the above.
