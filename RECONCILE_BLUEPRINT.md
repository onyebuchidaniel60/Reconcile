# Reconcile — Complete Implementation Blueprint

This is the consolidated master blueprint for implementation. It combines the product definition, MVP, flows, business rules, data model, architecture, UX/design system, integrations, AI, monetization, security, testing and phased implementation plan.

## Design north star

**Reconcile should feel like a premium finance product, not a spreadsheet.**

Core loop:

```text
Connect
  ↓
Sync
  ↓
Review
  ↓
Confirm
  ↓
Budget updates
  ↓
Understand
```

The supplied visual reference drives the visual language: black/white contrast, signal-yellow hero surfaces, rounded cards, oversized numbers, floating pill navigation, line icons, compact charts and playful accent shapes.

## 1. Product definition

Reconcile is a mobile personal-finance app that unifies supported bank-account transaction data, gives users a lightweight review/reconciliation workflow, and turns the resulting ledger into budgets and understandable insights.

Primary market: Nigeria. Global architecture: provider/country abstraction.

## 2. MVP scope

Must have:
- auth;
- provider abstraction;
- Mono Nigeria integration;
- Demo Mode;
- account linking;
- transaction normalization/deduplication;
- review/categorization;
- learned merchant rules;
- internal transfer handling;
- budgets;
- insights;
- Ask Reconcile;
- RevenueCat Pro;
- privacy/delete;
- E2E;
- store/Shipaton packaging.

Should/Nice/Future/Out-of-scope are documented in `PROJECT_SPEC.md`.

## 3. User roles

Customer and minimal internal operator/admin.

## 4. User flows

### Onboarding
Welcome → privacy explanation → country → Demo/Connect → auth → Home.

### Connect bank
Authenticated user → provider registry → provider connection → consent/authentication → webhook → local connection/account → initial sync → review queue.

### Review transaction
Open review → amount/bank/date/merchant → category suggestion → confirm/change → store user review → learn merchant rule → budget updates.

### Budget
Budget tab → create monthly total → optional category limits → save → derived spend/remaining/forecast.

### Ask Reconcile
Question → safe intent/tool selection → deterministic query → validated result → AI explanation → display basis/context.

### Subscription
Contextual Pro trigger → RevenueCat paywall → trial/purchase → entitlement `pro` → unlock → restore if needed.

### Delete
Settings → privacy → confirmation/reauth → provider disconnect attempt → data deletion → sign out.

## 5. Functional requirements

Functional requirements are centered on user-owned data isolation, provider-neutral transaction ingestion, immutable financial facts, review state, deterministic budgeting, read-only AI and RevenueCat entitlement gating.

## 6. Business logic/state machines

Connection:
`pending → active | error | revoked`
`active → reauth_required | error | revoked`
`reauth_required → active | error`

Review:
`needs_review → reconciled | excluded`
`reconciled ↔ excluded` through explicit user action.

Subscription:
`free → trialing → pro | free`, and `free ↔ pro` as subscription status changes.

## 7. Data model

Core entities:
`users`, `bank_connections`, `bank_accounts`, `transactions`, `transaction_reviews`, `categories`, `merchant_rules`, `budgets`, `budget_categories`, `sync_runs`, `provider_events`, `ai_sessions`, `ai_messages`, `entitlement_cache`, `audit_events`.

Money is integer minor units + ISO currency code.

Transactions are immutable. User-owned category/review state is separate.

## 8. System architecture

```text
Expo/React Native
      ↓
Supabase Auth + RLS
      ↓
Supabase Edge Functions
   ↙      ↓       ↘
Mono    OpenAI   RevenueCat
      ↓
Postgres
```

Financial logic only consumes normalized provider-neutral data.

## 9. Technology stack

Expo + React Native + TypeScript + Expo Router; React Native StyleSheet; Reanimated; SVG; Supabase; Mono; OpenAI; RevenueCat; EAS.

No microservices, Kafka, Kubernetes, custom auth service or unnecessary infrastructure.

## 10. API specification

Privileged Edge Functions:
- `/bank/connect-session`
- `/bank/sync`
- `/bank/disconnect`
- `/ai/categorize`
- `/ai/ask`
- `/mono/webhook`
- `/revenuecat/webhook`
- `/account/delete`
- `/csv/import`

Use stable error codes, ownership checks, schema validation, rate limits and idempotency where relevant.

## 11. Database behavior

Initial/manual sync:
start sync run → fetch/paginate → normalize → validate → dedupe → insert unseen transactions → create review state → finish.

Never use mutable client counters as the financial source of truth.

## 12. Authentication/authorization

Supabase Auth owns authentication. RLS is mandatory. Every server function derives the user from the authenticated session. No client-provided user ID is trusted for ownership.

## 13. Security architecture

Threats covered:
- IDOR;
- RLS bypass;
- secret leakage;
- webhook replay;
- duplicate processing;
- prompt injection;
- rate abuse;
- sensitive logs;
- unauthorized transaction mutation.

Mitigations are encoded in `AGENTS.md` and `ARCHITECTURE.md`.

## 14. UI/UX architecture

### Primary nav
Home · Activity · Budget · Insights.

Ask Reconcile is contextual rather than a fifth tab. Accounts and privacy live in Settings.

### Home
Greeting → yellow financial summary → budget card → review/new transaction card → recent activity → Ask Reconcile.

### Review Transactions
Dark surface; large transaction amount; bank/merchant/date; category suggestion; one-tap confirmation; swipe between items; haptic/animation.

### Activity
Clean timeline of category icon, merchant, account, amount, date.

### Budget
Monthly spend/budget/remaining; category bars; deterministic forecast.

### Insights
Total spend, month comparison, biggest changes, recurring candidates, Ask Reconcile CTA.

### Ask Reconcile
Conversational interface with suggested prompts and a visible data-basis context.

## 15. Design system

Palette:
- Ink #070707
- Paper #F6F6F1
- Signal Yellow #F2F50A
- Soft Coral #FFB0A8
- Mint #79DE72
- Lavender #A49BFF
- Line #DADAD2

Component style:
- 20–28px card radii;
- 56px primary buttons;
- floating pill navigation;
- heavy numeric typography;
- outline icons;
- signal-yellow primary actions;
- restrained accent colors.

Interaction craft:
- transaction confirmation animation;
- progress interpolation;
- chart transitions;
- haptic feedback;
- reduced-motion support.

## 16. Third-party integrations

### Mandatory
Supabase, Mono, RevenueCat, OpenAI.

### Optional
CSV helper, OneSignal, analytics.

Mono must stay server-side for secret operations. Current Mono docs provide a React Native SDK and an API/webhook integration path.

## 17. AI architecture

Deterministic tools first. AI second.

Tools:
- spend summary;
- category spend;
- merchant spend;
- period comparison;
- budget status;
- recurring candidates;
- transaction search.

No arbitrary SQL, no money-moving tools, no authoritative financial arithmetic.

## 18. Payment architecture

RevenueCat entitlement: `pro`.

Products:
- monthly;
- annual.

Paywall is contextual and remotely configurable via RevenueCat Offering. Launch with 7-day trial and judge promo fallback. Initial target pricing is ₦1,500/month or ₦12,000/year in Nigeria.

## 19. Admin/operations

No broad admin UI in MVP. Use secure operational logging and minimal audited support actions.

## 20. Edge-case matrix

Must handle:
- expired auth;
- unsupported bank;
- reauthorization;
- provider timeout;
- duplicate webhook;
- duplicate transaction;
- refund;
- internal transfer;
- ambiguous transfer;
- empty budget;
- no history;
- malformed AI output;
- prompt injection;
- failed purchase;
- restore;
- delete during sync;
- offline network;
- long merchant names;
- large text/accessibility settings.

## 21. Testing strategy

Unit: money, periods, categorization, transfer matching, budget, entitlement rules.

Integration: RLS, sync, Mono adapter, webhook idempotency, RevenueCat webhook, AI tool contracts.

E2E: onboarding, demo flow, review, budget, insights, AI, purchase/trial, restore, sandbox bank connection and deletion.

Security: IDOR, user-ID substitution, RLS, webhook replay, prompt injection, secret exposure.

## 22. Repository structure

```text
reconcile/
├── app/
├── src/
│   ├── components/
│   ├── features/
│   ├── providers/
│   ├── theme/
│   └── lib/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed/
├── tests/
├── assets/
├── PROJECT_SPEC.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── AGENTS.md
└── AI_HANDOFF.md
```

## 23. Environment configuration

Client-safe:
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, `EXPO_PUBLIC_APP_ENV`.

Server-only:
`SUPABASE_SERVICE_ROLE_KEY`, `MONO_SECRET_KEY`, `MONO_PUBLIC_KEY`, `MONO_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`.

## 24. Phased implementation plan

1. Mobile foundation.
2. Design system/app shell.
3. Authentication.
4. Provider abstraction.
5. Demo/trust onboarding.
6. Mono sandbox.
7. Transaction sync/reconciliation.
8. Budget engine.
9. Insights/AI.
10. RevenueCat.
11. Privacy/security hardening.
12. E2E/store/Shipaton release.

Every phase stops after verification and commit.

## 25–29. Handoff documents

The exact source-of-truth documents are delivered beside this master file:
- `PROJECT_SPEC.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- `AGENTS.md`
- `AI_HANDOFF.md`

## 30. Final pre-implementation audit

Resolved before implementation:
- transaction immutability;
- transfer double-counting;
- duplicate prevention;
- low-confidence AI confirmation;
- subscription source of truth;
- privacy copy boundary;
- provider abstraction;
- demo/judge path;
- scope control;
- E2E/security coverage.

Remaining external decisions are explicitly external: provider/KYB approval, live coverage, store approvals, final product-name availability and production pricing validation.

# CODING AGENT START POINT

Implement **Phase 1 — Mobile foundation and tooling** only.

Read the five source-of-truth documents and repository state first. Do not implement authentication, Mono, AI, RevenueCat, transaction logic, budgets or later UI flows in Phase 1.

After implementation: test → inspect diff → update `AI_HANDOFF.md` → commit → STOP.
