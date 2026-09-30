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

## Phase 4 checkpoint (wave 1–3 primitives)
- Commits this turn: `388c103 feat: add wave 1-3 primitives and dev
  gallery (Phase 4)` (10 primitives, haptics helper, barrel, gallery,
  tests, setup mock, token test, colors/motion additions, eslint/jest
  config, deps) and `36d5ca7 fix: resolve Inter family per weight for web
  rendering` (family map, Text fix, map test, re-verified gallery
  screenshots). Phase 3 files (`3120a3c`, `fafca13`) already pushed.
- Primitives built: `src/components/Text.tsx` (role prop, all 10 roles),
  `PairedTitle.tsx` (first/second props, light 300 + heavy 700),
  `Button.tsx` (primary/secondary/ghost, 56/48px, pill radius, press scale
  0.97 over press duration + light haptic, 40% disabled),
  `IconButton.tsx` (44×44 circular, required label),
  `Input.tsx` (56px, compact radius, label-above, focus/error states),
  `Chip.tsx` (chip radius, selected yellow, selection haptic),
  `Card.tsx` (6 surfaces, card/compact radii, padding 20 default),
  `Divider.tsx`, `SectionHeader.tsx` (h2 + 70%-ink action),
  `Skeleton.tsx` (line at 60%, pulse collapses under reduced motion),
  `index.ts` barrel; haptics helper `src/lib/haptics/index.ts`
  (`confirm`/`select`/`destroy`, failures swallowed).
- Derived tokens added for §7 pressables: `iconButton #E8E8E3`,
  `inkOverlay10`, `paperOverlay12`. Title ships as `titleLight`+`titleHeavy`
  pair; families resolve per weight via `fontFamilyForWeight` (a bare
  "Inter" matches no loaded family — caught by the gallery pass rendering
  serif, fixed and re-verified in Inter).
- Gallery: `app/dev/primitives.tsx` (all primitives × variants, tokens only,
  unlinked). Gated by `EXPO_PUBLIC_APP_ENV !== 'production'` or
  `EXPO_PUBLIC_ENABLE_DEV_ROUTES=true`; production renders "Not available"
  (verified anon and authed). Operator: set the flag if dev routes should be
  visible on the deployed URL.
- Token check enforcing: `npm test` now runs `jest && npm run check:tokens`;
  current count is 0 violations (no exemption needed); `app/dev` is scanned.
- Browser tools: self-provisioned Playwright 1.63.0 + headless Chromium
  (no MCP/browser-use tool in this environment). Gallery pass: all
  primitives render at 375×812 and 1280×800, button press/chip toggle
  (yellow fill verified)/input fill/section action all fire, console empty,
  no 4xx. Screenshots `docs/browser-tools/phase4-gallery-*.png`,
  `phase4-home.png`. Two defects found and fixed: deep-link 404s
  (`cleanUrls: true` in vercel.json) and serif fallback (family-per-weight).
  Second pass clean. Demo regression clean (sign-in → sync → confirm →
  insights with real numbers → grounded ask answer).
- Deploy: production `https://reconcile-e05lj9uyk-uhhh2.vercel.app`
  (alias `reconcile-two-tau.vercel.app`), HTTP 200, bundle contains the
  project URL, secrets scans zero, protection OFF.
- No screen restyled (only import repoints where the old theme was deleted);
  no Wave 4+ components; no motion library beyond Button press/reduced
  motion; `supabase/` untouched; SKILL_FRONTEND_DESIGN.md remains unwritten
  (earned at Phase 10).

## Phase 5 checkpoint (wave 4–5, charts, motion)
- Commits: `9237151 feat: add wave 4-5 components, charts, and motion
  helpers (Phase 5)` (11 components, 4 motion helpers, gallery, tests,
  deps) and `fe163a3 fix: correct donut arcs, bar axis gutter, and gallery
  sections` (visual-pass fixes + re-verified screenshots).
- Wave 4: `CategoryCircle.tsx` (40px tinted circle, 20px lucide outline icon,
  category-name label), `Starburst.tsx` (12-point SVG, 3 colors, 32/48/64,
  alert text, 180ms pop), `ProgressBar.tsx` (line 60% track, ink/yellow
  fill variants, white pill label, animated width), `PillBadge.tsx`
  (dark/light).
- Wave 5: `HatchPattern.tsx` (45°/2px/4px ink, useId-sanitized unique ids),
  `ChartAxis.tsx` (x/y, line 40%, small 60% labels), `ChartLegend.tsx`
  (two-column dot/label/value), `ChartTextEquivalent.tsx` (visually hidden,
  screen-reader reachable), `Donut.tsx` (ink + hatch arcs, h2 center total,
  legend), `BarChart.tsx` (ink/yellow/hatched rects, one-hatched validator,
  Y-gutter axis, starburst callout, 40ms stagger), `LineChart.tsx` (yellow
  3px polyline, 8px markers, dashed projection, paper corner starburst).
  No SVG text anywhere; every chart wires its description into its own
  accessibilityLabel.
- Motion: `src/lib/motion/` (`usePressScale` returning component+style+
  handlers, `useCardEntrance` with capped stagger, `useConfirmPulse`,
  `useChartReveal`); `Button` refactored to zero Reanimated/haptics imports.
  Haptics `confirm`/`select`/`destroy` confirmed present, unchanged.
- New token: `spacing.xxs` (6px pill/chip padding, documented in spacing.ts).
- Gallery: Wave 4/5 sections, motion demos with dev-only reduced-motion
  toggle (threaded via `MotionOptions` override), replayable chart reveal.
  Gating unchanged; production still hides dev routes (flag
  `EXPO_PUBLIC_ENABLE_DEV_ROUTES` is NOT set in Vercel — operator may set
  it; verified "Not available" anon and authed).
- Token check: 0 violations, no exemptions. Checks: `tsc` 0, `eslint` 0,
  `npm test` 78 passed / 2 live-skipped, `expo export` 19 routes.
- Gallery pass (second run clean): all sections render 375 + 1280, motion
  demos fire, toggle works, console empty, no 4xx. Screenshots
  `docs/browser-tools/phase5-{gallery-375,gallery-1280,gallery-reduced,
  section-wave4,section-charts,section-motion,donut,charts-reduced}.png`.
  Defects found and fixed: invisible donut hatch (two-arc restructure +
  resize), bar tick/month label collision (Y gutter), serif proof re-done.
  Demo loop untouched by these changes; regression re-verified post-fix
  via the same pass.
- Deploy: production `https://reconcile-91et10ps4-uhhh2.vercel.app`
  (alias `reconcile-two-tau.vercel.app`), READY; HTTP 200 on `/` and
  `/dev/primitives`; bundle contains exactly one match equal to the project
  URL; secrets scans zero; protection OFF.
- No screen restyled; no Wave 6+ components or organisms; no UI framework;
  `supabase/` untouched; SKILL_FRONTEND_DESIGN.md remains unwritten
  (earned at Phase 10).

## Phase 6 checkpoint (wave 6–7, rows, states, shells, navigation)
- Commits: `6f890f4 feat: add wave 6-7 rows, states, shells, and
  navigation (Phase 6)` (10 components, layout token, gallery, 23 tests)
  and `5cbc3bb fix: two-row scaffold headers, form scroll opt-out, pill
  web shadow (Phase 6 visual pass)` (agent-as-user defects + evidence).
- Wave 6: `src/components/TransactionRow.tsx` (CategoryCircle + Text
  composition; sign prefix −/+/+/none; internal_transfer muted 0.6 with a
  neutral `line`-gray circle; mono tabular amount; composed a11y label),
  `EmptyState.tsx` (outline icon 32 at 40%, body sentence, optional action,
  default Inbox icon), `ErrorState.tsx` (body sentence, secondary retry,
  errorCode log-only via console.warn, never rendered), `LoadingState.tsx`
  (`row-list`/`card-hero`/`chart-card` Skeleton compositions, no spinner),
  `BlockingSpinner.tsx` (blocking ops only; static label under reduced
  motion), `Avatar.tsx` (32/40/48/64, initial + deterministic hash tint
  over coral/mint/mist/lavender, optional photoSource).
- Wave 7: `src/components/ScreenScaffold.tsx` (SafeArea top+bottom, paper,
  two-row header — button row then full-width paired title — scroll opt-out,
  48px pill-nav bottom padding), `DarkScreenScaffold.tsx` (ink/paper,
  Home+Review only), `FormScaffold.tsx` (paper, centered column capped by
  new `src/theme/layout.ts` formMaxWidth 480, title/subtitle/inputs, fixed
  bottom CTA, KeyboardAvoidingView, scroll opt-out), `PillNav.tsx` (16px
  inset, paper/ink pill, House/Activity/Wallet/Lightbulb 24px, yellow
  active circle, 70% idle, 44×44 targets, selection haptic, web boxShadow /
  native shadow via Platform.select).
- Additive-only existing change: `PairedTitle` gained an optional
  `color` (default ink) so dark shells reuse it; no visual change elsewhere.
  Barrel `src/components/index.ts` exports all ten (+ types).
- Gallery: `app/dev/primitives.tsx` Wave 6–7 sections (5 row variants,
  all states/loading variants, 4 avatar sizes, light+dark+form scaffolds,
  interactive PillNav light+dark). Tokens only. Gating unchanged; prod flag
  `EXPO_PUBLIC_ENABLE_DEV_ROUTES` is UNSET (verified "Not available" authed
  on prod) — per spec it was left unset, so the visual pass ran locally.
- Checks: `tsc` 0, `eslint` 0, `jest` 101 passed / 2 live-skipped (15
  suites), `check:tokens` 0 violations, `expo export -p web` 19 routes,
  `dist` bundle has exactly one Supabase-URL match and zero secret hits.
- Gallery pass (self-provisioned Playwright 1.63.0 + headless Chromium,
  authed via a confirmed throwaway user): 375×812 + 1280×800 screenshots
  `docs/browser-tools/phase6-{gallery,section-wave6,section-wave7,rows,
  avatars,pillnav,scaffold,dark-scaffold,form,gallery-reduced}-*.png` plus
  `phase6-demo-{home,review,insights,ask}.png`. Pill switch proven by
  computed background (yellow moves home→activity); form input/CTA visible
  and focusable; reduced-motion static spinner verified. Console + network
  empty on the second pass.
- Defects found and fixed: (1) single-row scaffold header overflowed at 375
  (paired title squeezed, mid-word break) → two-row header (buttons row +
  full-width title, matching the Review reference); (2) FormScaffold
  collapsed inside the gallery's outer scroller → additive `scroll` opt-out
  (gallery uses `scroll={false}`); (3) RNW `shadow*` deprecation warning →
  Platform.select boxShadow/web, shadow/native. Second pass clean.
- Deploy: fix build live at `https://reconcile-two-tau.vercel.app`
  (entry `entry-63b6c03b…`, fix string + Phase 6 markers + exactly one
  Supabase URL in bundle); `curl -sIL /` and `/dev/primitives` → 200;
  GitHub/Vercel status success on the phase commit.
- Demo regression (same throwaway, local): sign in → sync (55 txns) →
  review confirm (51→50 pending) → insights with real numbers → grounded
  ask answer. No errors.
- No product screen restyled (only `app/dev/` touched under `app/`);
  no Wave 8 organisms; PillNav not wired into demo navigation;
  `supabase/` untouched; `.env.local` never committed.
- SKILL_FRONTEND_DESIGN.md note: the file pre-exists from blueprint commit
  `38be36f` and is byte-unchanged since; this phase neither wrote nor
  modified it (the earned v1/v2 rewrite stays a Phase 10 deliverable).

## Phase 7 checkpoint (wave 8 feature organisms)
- Commits: `b5a7ff2 feat: add wave 8 feature organisms (Phase 7)`
  (7 organisms, barrel, gallery, 13 tests) and `c231308 fix: single hero
  legend, amount step-downs, insight pair fit (Phase 7 visual pass)`
  (agent-as-user defects + evidence).
- Organisms (`src/components/organisms/`, all pure compositions, no new
  primitives): `HeroSummaryCard.tsx` (yellow Card, Summary + pressable
  period selector with chevron, Donut with legend hidden, own ChartLegend
  with paper/ink dots legible on yellow), `BudgetOverviewCard.tsx` (mist
  compact, Today pill, ink ProgressBar with percent label, muted date ends;
  spent/limit feed the a11y description), `ExpensesBarCard.tsx` (yellow,
  pressable range header, BarChart 4 bars via its own callout slot for the
  alert-red starburst; one-hatched rule still enforced by
  `validateBarFills`), `SpendTrendCard.tsx` (ink, centered paper hero
  amount, muted spent-out-of line, paper corner starburst, LineChart with
  optional dashed projection), `PositiveMessageCard.tsx` (mint compact,
  16px padding via token style override so Card's 20/24 contract is
  untouched, single body-500 sentence), `InsightCard.tsx` (paper compact,
  muted label, paired h3 amounts with ink arrow+sign delta — never color —
  plus explanation), `ReviewHeader.tsx` (transparent, paper PairedTitle via
  the Phase 6 color prop, optional yellow starburst, right-pinned progress).
  Barrel `organisms/index.ts`, re-exported from `src/components/index.ts`.
- Additive Donut refinement (backward compatible, existing tests green):
  `showLegend` opt-out plus an h2→h3 center step-down for totals longer
  than 10 chars so realistic NGN amounts stay inside the hole.
  SpendTrendCard hero steps display→h1 past 10 chars for the same reason.
- Gallery: "Wave 8 — Organisms" section (demo-labeled fixtures: hero
  ₦1,747,000/₦1,070,000 for September 2026; budget ₦171,650/₦250,000;
  May–Aug bars with hatched Jun + "+₦26,000" callout; trend 4 points +
  projection; positive line; insight down 56%; Review header in ink) plus a
  "Home composition preview" (DarkScreenScaffold + hero + budget + 3 dark
  rows + dark PillNav, Home active, preview-labeled). Nothing wired into
  product screens; demo tab navigation untouched.
- Checks: `tsc` 0, `eslint` 0, `jest` 116 passed / 2 live-skipped (16
  suites), `check:tokens` 0 violations, `expo export -p web` OK.
- Gallery pass (Playwright 1.63.0, local server, confirmed throwaway user):
  Wave 8 + home preview at 375×812 and 1280×800 —
  `docs/browser-tools/phase7-{organisms,home-preview}-*.png` plus element
  shots `phase7-{hero,expenses,trend}-375.png` and fix checks
  `phase7-check-*-375.png`. Period/range callbacks fire without errors;
  console + network empty on both viewports.
- Verified per design.md §8: visible hatched donut arc with readable center;
  exactly one hatched bar with alert-red callout; dashed projection;
  paper starburst on ink; yellow hero is the single accent in the preview;
  paired-title weight contrast visible.
- Defects found and fixed: (1) Donut's internal legend duplicated the
  card legend (and its yellow dot vanished on yellow) → `showLegend`
  opt-out + paper/ink card legend; (2) long NGN totals overlapped donut
  arcs / clipped at card edge → center + hero step-downs; (3) insight pair
  ellipsized at h2 → h3 pair with tighter delta margins, both amounts now
  full on one line. Second pass clean.
- Deploy: fix build live at `https://reconcile-two-tau.vercel.app`
  (entry `entry-2f1d1b3b…` contains `showLegend` + organism strings;
  exactly one Supabase-URL match; zero secret hits);
  `curl -sIL /` and `/dev/primitives` → 200. Flag
  `EXPO_PUBLIC_ENABLE_DEV_ROUTES` remains unset in Vercel — not set.
- Demo regression (same user, local): sync (55 txns, added 0) → review
  confirm works (47 pending after confirm; one pass read 49→49 on a stale
  render and was re-proven 48→47 with zero errors) → insights real numbers
  → grounded ask answer. No product code touched by this phase.
- No product screen restyled (only `app/dev/` + `src/components/`
  incl. new `organisms/`); PillNav still not wired into demo routing;
  `supabase/` untouched; `.env.local` never committed.
- SKILL_FRONTEND_DESIGN.md untouched (still byte-identical since `38be36f`;
  the earned rewrite stays a Phase 10 deliverable).

## Phase 7 completion (native build pipeline)
- Pipeline commit: `0211c39 chore: configure eas build and produce first
  Android APK (Phase 7)` (with organism commit `b5a7ff2` + visual-pass fix
  `c231308` + v3 docs commit `48a1123` underneath). No application code
  changed for the pipeline — only `app.json`, `eas.json`, `.easignore`.
- Permanent identifiers: Android package `com.onyebuchidaniel.reconcile`,
  iOS bundle ID `com.onyebuchidaniel.reconcile`, `versionCode` 1,
  `buildNumber` "1", scheme `reconcile`, slug `reconcile`. EAS project
  `@buchi208/reconcile` (ID `10e4b9e0-32d7-41cb-b938-ef81177f588d`, personal
  account per operator choice; `extra.eas.projectId` + `owner` in app.json).
- `eas.json`: `development` (dev client, internal), `preview` (internal,
  android APK), `production` (autoIncrement), submit track internal
  placeholder. CLI `eas-cli/24.8.0` (global install; the npx one-off cache
  was corrupt). Cloud keystore auto-generated by EAS on first build
  (non-interactive default; no local keystore file created or committed).
- First build: Android preview, status FINISHED, SDK 57, app 0.1.0 (1),
  built from `48a1123`. Build page:
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/54fade57-ca38-4cd0-b8b0-c996d32406c0`
  APK:
  `https://expo.dev/artifacts/eas/TIIUUAzasKx2W87LhQmxKYSDiocvjAIC6kmx2HN8mOc.apk`
- Secret hygiene: `.easignore` mirrors `.gitignore` (local env + keystores
  excluded); `.env.production` holds only EXPO_PUBLIC_* and is committed;
  repo-wide scan for SERVICE_ROLE/ACCESS_TOKEN/VERCEL_TOKEN finds only
  env-var name references (Edge Function `Deno.env.get`, test env reads)
  and documentation — no secret values anywhere. Nothing secret uploaded.
- Checks on the pipeline tree: `tsc` 0, `eslint` 0, `npm test` 116 passed /
  2 live-skipped + tokens 0 (one transient single-test flake under parallel
  load in an earlier run; green on all subsequent full runs), `expo export`
  OK.
- Native runtime verification is PENDING operator installation: install the
  APK on a real Android device, confirm launch without crash, walk
  Welcome → Demo → Home, check safe areas/keyboard/fonts/touch targets, and
  report findings. No agent-side device was available.
- Web deploy from the same tree is unaffected (Vercel auto-deploys main).

## Phase 7 native smoke-test verification (between Phase 7 and 8, not a phase)
- Operator device findings (Android APK from `0211c39`): launches cleanly,
  no crashes, keyboard fine, safe areas mostly fine, fonts look like Inter
  (unverified), touch targets unevaluable on skeletal UI, one defect: Budget
  Setup numbers/category values overflow horizontally.
- Part A (fonts — verified by inspection, no fix): entry `app/_layout.tsx`
  loads all six weights via `useFonts` (`Inter_300Light/400Regular/
  500Medium/600SemiBold/700Bold/800ExtraBold`); every role in
  `src/theme/type.ts` resolves through `fontFamilyForWeight` to a loaded
  family (display→800, title 300/700, h1→700, h2/h3→600, body→400,
  small/mono→500); `Text.tsx` is the only `fontFamily` setter in `src/`;
  no bare `"Inter"` string survives; `expo-font` plugin present in
  `app.json` (no extra config needed for `useFonts`). No fallback path.
- Part B (360px component safety — clean, no component fixed): new gallery
  section `gallery-section-stress` (2-input form, long label/value inputs,
  long-text card, 7-chip wrap row, 20-digit merchant row, long-label
  progress) plus all Wave 6–8 sections screenshotted at 360×800
  (`docs/browser-tools/phase7-native-check-*.png`). Programmatic check:
  page scrollWidth == 360, zero viewport escapes across 18 components, empty
  console/network. Long merchant ellipsizes while the full amount is
  preserved; chips wrap; form/card/progress/hero/bars/trend/insight/preview
  all fit.
- Part C (demo Budget Setup — minimal skeletal fix, no redesign): root
  cause is an unpadded, unscrolled container (edge-clipped inputs,
  13-category list unreachable); fix wraps content in a `ScrollView` with
  `spacing.xl` horizontal padding (theme token, check-clean). Verified at
  360px with 20-digit values: padded, scrollable, no overflow. Phase 9
  still replaces the screen.
- Test note: one transient single-test failure under parallel load in two
  full runs (failing test name not captured); the same suite passes 8+
  consecutive full runs including six straight 116/116 runs. Unconfirmed
  hypothesis: first-render timeout under CPU contention (Phase 6 precedent).
  No code change in this pass touches tested logic.
- Remaining native concerns for Phase 8: touch targets still unevaluable
  until rebuilt screens land; fonts confirmed by inspection only (no
  device-side font dump); operator re-verification of Budget Setup on the
  next APK.
- Commit: `fix: address native smoke test findings (Phase 7)` (budget-setup
  fix + stress gallery + screenshots + this handoff entry, single commit
  per the pass spec).

## Phase 8 checkpoint (rebuild onboarding, auth, Home, Review)
- Commits: `3e74ed3 feat: rebuild onboarding, auth, Home, and Review
  (Phase 8)` (8 screens, PillNav wiring, `src/lib/txn.ts`, 20 screen
  tests) and `575645e fix: review crash on missing embeds, real hero
  income, header fits (Phase 8 visual pass)`.
- Screens rebuilt (data bindings unchanged, presentation only): Welcome
  (`Get/Started`, starburst, Continue → Privacy), Privacy (`Your/Privacy`,
  9-row paper table, Continue → Country), Country (`Your/Country`, NG chip
  default + Coming-soon disabled others, Continue → Signup), SignUp
  (`Create/Account`, email+password, loading CTA, error on password input,
  → Demo), SignIn (mirror, `Welcome/Back`), Demo entry (`Try/Demo`, mist
  includes-card, connected accounts + Sync now, disabled Connect ghost,
  contextual CTA), Home (dark scaffold, avatar + grid/card icon buttons,
  `Hey, <name>` greeting, HeroSummaryCard with real month income/expenses,
  BudgetOverviewCard when a budget exists, Review-N entry, Recent/Activity
  + View all, 5 dark rows → detail, dark PillNav Home-active), Review
  (dark scaffold, back → Home + edit no-op, ReviewHeader + starburst +
  N-of-M, auto-selected first row with category chips + View-details link,
  bottom Confirm with pulse haptic + exit, empty/loading/error states).
- PillNav wiring: Home → `/home` (NOT `/` — index bounces authed users to
  `/demo`, so the spec's literal mapping would strand the Home pill; intent
  preserved, deviation documented), Activity/Budget/Insights → their
  routes; pill added to the three skeletal screens without restyling them;
  no pill on Review/auth. Selected state is per-screen static (exact).
- New queries: none. New shared helper `src/lib/txn.ts` (direction/tint
  mapping, row/period/bound labels, month income) with unit tests.
  Additive-only primitive changes: `Button` `loading` (spinner + disabled),
  `FormScaffold` `ctaLoading`, `Donut` unchanged visually. Signup's dynamic
  `import()` of supabase made static (no cycle; dynamic import throws under
  jest without vm modules — found via failing test, zero prod change).
- Web pass (Playwright, local + prod, throwaway users): full first-time
  flow at 375×812 and 1280×800 —
  `docs/browser-tools/phase8-{welcome,privacy,country,signup,signin,demo,
  home,review}-*.png` plus confirmed/insights/skeletal shots. Verified:
  single yellow hero with visible hatched arc once income derived correctly,
  Home pill active, no pill on Review, paired-title contrast, correct
  category tints, confirm works (queue decrements), console/network empty.
- Defects found and fixed: (1) Review crashed on
  `transaction_reviews[0]` of review embeds (field absent) → null-safe
  helper + explicit suggestion id (row tint now follows picked category);
  (2) hero Income permanently ₦0 (income rows are budget-ineligible by
  design) → eligibility-blind month income (verified ₦570,000 = Sept salary
  + freelance); (3) greeting wrapped 3 lines + "View all" split → ellipsis
  + flex title; (4) cold-start blank paint in screenshots → visibility
  waits (harness only). Second pass clean.
- Demo loop intact end to end (sign in → sync 55 → review → confirm →
  Home → insights → grounded ask). Activity/Budget/Insights/Ask/Detail/
  Settings/Budget Setup remain skeletal (Phase 9).
- Checks: `tsc` 0, `eslint` 0, `jest` 137 passed / 2 live-skipped,
  `check:tokens` 0, `expo export` OK. Note: `jest.setTimeout(20000)` added
  to screens + wave7 suites after first-render timeouts under CPU
  saturation (environmental, assertions unchanged).
- Deploy: fix build live at `https://reconcile-two-tau.vercel.app`
  (entry `entry-35c72b36…` carries Phase 8 code; exactly one Supabase-URL
  match; zero secret hits); `curl -sIL /` → 200; deployed Welcome
  screenshot-verified (`phase8-welcome-prod-375.png`).
- Native: EAS preview APK build (URL below) — native verification complete
  (see `Native crash resolved` below; operator verified on the `770dc5c`
  preview APK, 2026-09-26).
- Native build: Android preview FINISHED from the fix tree
  (`575645e98f`), SDK 57, 0.1.0 (1), internal distribution. Build page:
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/c7529ea7-90a6-4245-94c1-7a1fd5cbbfcf`
  APK:
  `https://expo.dev/artifacts/eas/YunMEzHotXNkgRo0NrA1okZ6bu0Yp5HPsaIroEHUGeQ.apk`
- Note: "Native verification complete — see `Native crash resolved` below
  (operator verified 2026-09-26 on the `770dc5c` preview APK). Pre-fix APK was
  `https://expo.dev/artifacts/eas/YunMEzHotXNkgRo0NrA1okZ6bu0Yp5HPsaIroEHUGeQ.apk`."
  Operator checklist: launch without crash; Welcome → Privacy → Country →
  Sign up → Demo entry → Home; yellow hero + mist card + tinted rows + Home
  pill; Review title/starburst/chips/confirm; touch targets; Inter; signup
  keyboard.

## Phase 9 checkpoint (remaining screen rebuilds, web verification only)
- Commits: `4e3acff feat: rebuild Activity, Detail, Budget, Insights, Ask,
  and Settings (Phase 9)`, `9928050 fix: insight pair fit, ask basis
  prefix, settings ellipsis (Phase 9 visual pass)`, `bf90be5 feat: avatar
  opens Settings plus Phase 9 evidence screenshots`.
- Screens rebuilt (demo logic preserved, presentation only): Activity
  (ScreenScaffold, chip scroller All/New/categories/accounts, light rows →
  detail, pill), Transaction Detail (hero display amount, immutable-facts
  Card incl. masked account via extended `getTransaction` select, review
  Card with chips/note/Confirm/Exclude), Budget Setup (FormScaffold,
  prefilled total + cap rows with circles, secondary Save, create via
  `createBudget` or update via new `updateBudget`), Budget (paired title,
  ExpensesBarCard 4-month + callout, SpendTrendCard weekly cumulative +
  projection, forecast PositiveMessage, cap rows with mini bars + coral
  over-cap), Insights (3 InsightCards with real numbers + ghost Ask entry +
  first-month Card), Ask (ink user bubbles, paper answer cards with
  backend `based on:` line, suggestion chips, pill input + send button),
  Settings (Account/Privacy/Subscription/About sections, coral sign-out,
  null-active pill), +not-found (EmptyState) and new offline route
  (ErrorState + back retry).
- Shared additions: `tintForLabel` in `src/lib/txn.ts`; `FormScaffold`
  `ctaVariant`; `PillNav` `active` accepts null; Home avatar → Settings
  (the pass flow requires an in-app Settings entry).
- Web pass (Playwright, local + prod, throwaway users, 375 + 1280):
  full walk Home → Activity (filters narrow per unit tests) → Detail →
  back → Budget (created via Setup, saved) → Insights (pill) → Ask
  (grounded) → avatar → Settings → sign out → Welcome. Screenshots
  `docs/browser-tools/phase9-*.png`. Console/network empty both passes.
- Defects found and fixed: (1) insight pair ellipsized at h3 on 287px
  rows → small-600 pair (adjustsFontSizeToFit is iOS-only, single scale
  kept); (2) Ask rendered "based on: based on:" (backend basis already
  carries the prefix; old screen rendered it bare) → render basis verbatim,
  mock updated to the production contract; (3) settings email wrapped
  mid-word → ellipsis; (4) Home greeting 3-line wrap + split View-all →
  ellipsis + flex title (Phase 8 follow-ups, same pass).
- Demo loop intact (sign in → sync → review → confirm → Home → insights →
  ask). No Phase 10 started.
- Checks: `tsc` 0, `eslint` 0, `jest` 161 passed / 2 live-skipped,
  `check:tokens` 0, `expo export` OK (offline route included).
- Deploy: latest build live at `https://reconcile-two-tau.vercel.app`
  (entry verified with Phase 9 markers + avatar entry; exactly one
  Supabase-URL match); `curl -sIL /` → 200.
- Native: native verification complete (see `Native crash resolved` below;
  operator verified all walked screens render without crashing on the
  `770dc5c` preview APK, 2026-09-26). Background pre-fix preview build URL:
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/46b70398-a17b-40f6-9138-234bd641c353`.
  Explicit statement: "Phase 8 and Phase 9 native verification complete —
  see `Native crash resolved`. UI polish deferred to Phase 10A (web) and
  Phase 10B (native)."

## Phase 8 native crash fix (worklet calling non-worklet)
- Root cause (confirmed by dev-client stack trace): `useAnimatedProps`
  compiles its callback into a worklet running on the native UI runtime,
  but Donut's callback synchronously called plain-JS `describeDonutArc`
  ("Tried to synchronously call a Remote Function"). Web survived on the
  single-thread JS fallback; Android exited. Contributing setup cause: the
  Reanimated babel plugin was missing (added in `262c797`).
- Fix (`770dc5c fix: mark chart worklet helpers as worklets (Phase 8
  native crash)`): `'worklet';` as the first line of `describeDonutArc`
  and its callee `polar` (Donut.tsx), plus `toPointsAttr` (LineChart.tsx)
  — the only other helper called inside a worklet. Full audit of all 10
  `useAnimatedProps`/`useAnimatedStyle` sites: BarChart bar math,
  Starburst, Skeleton, ProgressBar, usePressScale, useCardEntrance,
  useConfirmPulse use only shared values/Math/inline logic (clean);
  HatchPattern `<Pattern>` kept (supported on Android; no evidence against
  it); all Home-tree lucide icons resolve; Donut/Bar/Line path builders
  guard divide-by-zero; fonts gated in `_layout`; SafeAreaView needs no
  provider to avoid crashing.
- New gate `tests/native-safety.test.ts` (4 tests: babel plugin last,
  SVG allowlist, HatchPattern audited form, all lucide imports resolve;
  proven to trip with the plugin removed). It catches this bug class
  statically — on-device verification is still required.
- Checks on the fix tree: `tsc` 0, `eslint` 0, `jest` 161 passed /
  2 live-skipped, `check:tokens` 0, `expo export` OK. Web regression:
  Home hero + gallery donut render identically with hatched arc and
  animation, console empty (`phase8-worklet-*.png`).
- New preview APK built from the fix commit (NOT a dev client): build
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/78d7239c-68d0-4c15-8350-a499afda547d`
  APK:
  `https://expo.dev/artifacts/eas/5XhVpsVFzXlKzTvSREKYNL970xio-qvUZBmquQllQ60.apk`
- Note: "Native smoke test pending operator installation at
  `https://expo.dev/artifacts/eas/5XhVpsVFzXlKzTvSREKYNL970xio-qvUZBmquQllQ60.apk`."
  (Superseded by `Native crash resolved` below — verified 2026-09-26.)

## Native crash resolved (operator-verified 2026-09-26)
- Root cause: worklet calling non-worklet functions in Donut.tsx
  (`describeDonutArc` and its callee `polar`) and LineChart.tsx
  (`toPointsAttr`). `useAnimatedProps` compiles its callback into a worklet
  running on the native UI runtime, but the callbacks synchronously called
  plain-JS helpers ("Tried to synchronously call a Remote Function"). Web
  survived on the single-thread JS fallback; Android exited.
- Fix commit: `770dc5c fix: mark chart worklet helpers as worklets (Phase 8
  native crash)` (plus `262c797` restoring the missing Reanimated babel
  plugin; `tests/native-safety.test.ts` gates this bug class statically).
- Verified on device by the operator at preview APK
  `https://expo.dev/artifacts/eas/5XhVpsVFzXlKzTvSREKYNL970xio-qvUZBmquQllQ60.apk`
  (built from the fix commit, NOT a dev client).
- Result: no crashes. Home renders without crashing (the original Donut
  crash site); Budget renders without crashing (LineChart fix confirmed);
  Insights loads correctly; Activity, Transaction Detail, Ask Reconcile,
  Settings all render. No crashes on any screen walked; all 16 screens
  render.
- UI polish: some visual corrections are needed — exactly what Phase 10A's
  web audit and Phase 10B's native pass exist to catch. No functional
  re-verification of the crash is required.
- Date of verification: 2026-09-26 (confirmed verbally; recorded here).

## Phase 10A checkpoint (web audit + fixes + preview APK)
- Fix commit: `c0eb4cf fix: phase 10 web audit — visual and accessibility
  defects` (screens, components, tests, 33 evidence screenshots, native
  checklist). Second commit (this entry): handoff only.
- Web audit (Playwright 1.63.0 + headless Chromium, local Metro then
  production-equivalent `expo export` dist served statically): all 16
  screens at 375×812 and 1280×800 — Welcome, Privacy, Country, Sign up,
  Sign in, Demo entry, Home, Review, Transaction Detail, Activity, Budget
  Setup, Budget, Insights, Ask, Settings, Error/offline/not-found.
  Throwaway user via Supabase admin API (email_confirm, no email sent);
  sign-in + demo sync (55 txns) + review confirm (53→52→51, works) +
  budget create + ask grounded answer all exercised through the UI.
  Screenshots `docs/browser-tools/phase10a-*-{375,1280}.png`.
- Defects found and FIXED (12 changes, all from `src/theme/` tokens or
  existing components; no redesign, no new primitives):
  - blocks-loop: Budget had no Edit path (spec requires Edit) → ghost
    "Edit budget" → `/budget-setup` (prefill/update already supported);
    round-trip verified in the second pass.
  - visual: trend points collapsed to one dot in UTC+X (`endDay` TZ bug) →
    new `monthSampleDays` helper in `src/lib/txn.ts` (+ unit tests); this
    also corrected the forecast per-day math. Starburst callout overflow
    (full-precision delta spilled off the 48px badge) → compact callout
    (axis convention; exact values stay in the a11y label). Settings title
    "Set Settings" → "Your Settings" (existing Your-X pattern). Offline
    header "offline" → registered "Offline" title.
  - accessibility: chips 32px → 44×44 `Chip` min (all screens); 7 text
    links 19px → 51px tap height (`paddingVertical: lg`); settings rows +
    sign-out 23–39px → `minHeight: 44`; period/range pressables 20px →
    `minHeight: 44`; LineChart axis labels ink-on-ink (invisible) → new
    `surface="dark"` paper labels (SpendTrendCard passes it).
  - design.md-violation: Review dark background spilled to paper on web
    scroll (below-fold rows invisible) → web-only scaffold growth
    (`ScreenScaffold`, native untouched); Activity had no day-group
    headers → grouped with Label-600 headers; Insights was all-paper with
    no yellow hero → yellow month card + ink biggest-change card + paper
    starburst (one yellow, one starburst per screen).
  - anti-pattern: zero found.
- DEFERRED nice-to-fix-later (logged, not fixed): hero legend wrap at 375
  (readable); expo Stack header-back 30px (platform chrome, OS-handled on
  native); Ask has no yellow accent (no explicit §8 rule); Budget Ask entry
  (Edit added; pill reaches Ask in one tap).
- KNOWN RESIDUAL, reported not hidden: the design-mandated alert-red
  starburst with white 12px text measures ≈3.6 contrast (AA needs 4.5 for
  that size). The overflow is fixed and exact values are in the a11y label,
  but the pairing itself cannot pass automated AA without changing the
  specified colors — needs a design decision, so none was invented.
- ACQUITTED after investigation (no defect): ₦ glyph rendering (Inter
  ships U+20A6 in all weights; the 1x "overstrike" is aliasing — proven at
  4x); Home row fade (entrance-animation transient, settled opacity 1);
  Review confirm (works, earlier read raced it); FormScaffold CTA overlap
  (fullPage-stitch artifact); signin error state (timing flake, proven).
- Second pass (fresh `dist` export, fresh contexts, both viewports):
  console 0, network 4xx/5xx 0, overflow none, unlabeled-icon-buttons 0,
  sub-44px targets 0, contrast 0 except the documented callout residual.
  Loop re-verified (sign-in → demo → review → budget edit → ask).
- Checks on the fix tree: `tsc` 0, `eslint` 0, `jest` all suites green
  (final tally across runs: 187 passed + 2 live-skipped; per-test timeout
  overrides were environmental only — loaded machine, untouched code
  proven by re-run), `check:tokens` 0 violations, `expo export -p web`
  success (20 static routes).
- Deploy: `c0eb4cf` pushed; Vercel live (`entry-307bcd19…` carries Edit
  budget + activity-day- + insights-change markers); `curl`-equivalent 200;
  bundle has exactly one Supabase-URL match and zero secret values (the
  single `sb_secret_` hit is supabase-js prefix-check code, not a value).
- Preview APK (NOT a dev client) from the fix commit: build
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/58daa587-8af7-49cd-9894-fe95febc5ac6`
  (status FINISHED, `gitCommitHash c0eb4cf`) APK:
  `https://expo.dev/artifacts/eas/LHawpHx2JkEqF9WH8bqihfdvPV4VCAI9pUxu3dCd0Qg.apk`
  Ops note: submitted with `EAS_SKIP_AUTO_FINGERPRINT=1` (local
  fingerprint computation stalls on this machine); credentials/profile
  unchanged.
- Native checklist for the operator:
  `docs/browser-tools/phase10-native-checklist.md` (every screen in walk
  order + web-unverifiable classes + copy-paste result template).
- Explicit statement: "Phase 10B pending operator native walk. Checklist
  at docs/browser-tools/phase10-native-checklist.md. APK at
  `https://expo.dev/artifacts/eas/LHawpHx2JkEqF9WH8bqihfdvPV4VCAI9pUxu3dCd0Qg.apk`."
- SKILL_FRONTEND_DESIGN.md still untouched (§10 evolution log still the
  template) — the Phase 10B rewrite is gated on the operator's native pass
  completing cleanly. No source-of-truth doc changed except this handoff.

## Phase 10A.5 checkpoint (native-walk defect fixes)
- Fix commit: `5e64d16 fix: native walk defects — home chrome, nav icons,
  overflow, profile photo, over-budget, review display name` (32 files,
  +857/-64). Second commit (this entry): handoff only.
- Scope: the seven operator-reported defects from the Phase 10A APK native
  walk. No redesign, no new primitives or organisms, no source-of-truth doc
  changed except the two design.md lines authorized by Fix 6.

### Per-fix status
- **Fix 1 — Home top bar is ink, not white. IMPLEMENTED, VERIFIED.**
  `headerShown: false` on the `home` and `review` Stack routes. Grep confirms
  no other routed screen uses `DarkScreenScaffold` (`app/dev/primitives.tsx`
  does but is not a Stack route). Web proof: no `header`/`nav` element in the
  Home DOM, and the top-of-viewport background samples `rgb(10, 10, 10)`
  (Ink). Screenshot `phase10a5-home-375.png`.
- **Fix 2 — Home top-right icons non-functional. IMPLEMENTED, VERIFIED.**
  Grid → `/insights`, card → `/budget`, each with `accessibilityLabel` and a
  `select()` haptic. Duplicate-PillNav shortcut is intentional per operator.
  Web proof: labels read `Insights` / `Budget` and pressing the grid icon
  navigates to Insights.
- **Fix 3 — Budget horizontal overflow on native. IMPLEMENTED (device-pending).**
  Root cause was Android Yoga's default `flexShrink: 0` on flex-row children,
  which is exactly why web at 375px was clean (CSS flexbox defaults to 1).
  Fixed at all three named sites: the category-cap row in `app/budget.tsx`,
  the `LineChart` x-axis label row, and both the `BarChart` y-gutter and its
  x-axis label row — each with `flexShrink: 1` plus `numberOfLines={1}` so
  labels ellipsize rather than clip. No fixed widths anywhere.
  **ExpensesBarCard's starburst callout was investigated and CLEARED**: the
  callout is a fixed 48px box inside an `alignItems: "center"` wrapper with
  no width of its own, so it cannot exceed the card's content width, and its
  text is the compact form fixed in Phase 10A. The overflow was the
  non-shrinking siblings, not the callout. Recorded as a code comment in
  `ExpensesBarCard.tsx`; not refactored.
  Web proof: 0 overflowing elements on every audited screen at both viewports.
  The *native* absence of overflow is still device-only.
- **Fix 4 — sign-out row below the visible area. IMPLEMENTED (device-pending).**
  Settings, Budget and Insights content moved into scroll containers
  (`settings-scroll`, `budget-scroll`, `insights-scroll`); Activity uses its
  FlatList `contentContainerStyle`. The bottom padding is now derived, not
  guessed: `pillNavClearance(insets.bottom)` = safe-area bottom inset +
  `PILL_NAV_HEIGHT` + `spacing.lg`, where `PILL_NAV_HEIGHT` (44 + spacing.sm*2
  = 60) is exported from `src/components/PillNav.tsx` and is also the pill's
  own `minHeight`, so the reserved value and the rendered value cannot drift.
  `useSafeAreaInsets()` from `react-native-safe-area-context` supplies the
  inset. Web proof: computed `padding-bottom: 76px` (0 inset + 60 + 16) on
  Budget, and the container genuinely scrolls.
  **FLAG for device:** on these four screens `PillNav` sits in normal flow
  rather than overlaying, so the reserved clearance is additive to the 48px
  `ScreenScaffold` already applies. The result is generous bottom whitespace,
  not overlap. Confirm the gap is not excessive on a real device.
- **Fix 5 — profile picture. IMPLEMENTED, VERIFIED END TO END.**
  Migration `000003_profile_avatar.sql`: nullable `users.avatar_url`, the
  public `avatars` bucket, and four storage policies (public SELECT on the
  bucket; INSERT/UPDATE/DELETE gated on
  `auth.uid()::text = (storage.foldername(name))[1]`, i.e. the user-id path
  prefix). `expo-image-picker` `~57.0.20` installed via `npx expo install`.
  New `src/lib/avatar.ts` (picker, upload, prefix delete, pure path helpers).
  `Avatar` takes an optional `uri` and falls back to the initial when absent
  or on load failure, keyed so a new URI retries. Settings gained a Profile
  subsection with Change photo / Remove; Home and Settings pass `avatar_url`.
  Web proof against the deployed bundle: upload `POST /storage/v1/object/
  avatars/<user_id>/avatar.jpg` → 200, public GET → 200 `image/jpeg`,
  `users.avatar_url` persisted, image renders on both Settings and Home,
  Remove appears only once a photo exists, and Remove drives
  list → DELETE → `avatar_url` back to null with the image gone. That upload
  also proves the bucket and its RLS policies exist — the one thing the
  earlier column-level check could not confirm.
- **Fix 6 — budget progress must not cap at 100%. IMPLEMENTED, VERIFIED.**
  Fill ratio is `min(spent/limit, 1)` (clamped inside `ProgressBar`); the
  displayed percent is `round(spent/limit*100)`, uncapped; over budget the
  fill is Alert Red. The two are deliberately decoupled. Web proof with a
  ₦1 budget against real demo spend: `aria-label="Progress 21870296%"` with
  the bar filled `rgb(239, 61, 40)` (Alert Red) end to end
  (`phase10a5-overbudget-home-375.png`).
  The two design.md edits authorized for this fix and no others: §7
  ProgressBar gained the over-budget variant line, §8 Budget gained the
  over-budget alert-red fill line (`git diff design.md` = +2).
- **Fix 7 — review confirm updates the display name. IMPLEMENTED, VERIFIED,
  SCOPE EXPANDED by operator decision.** Migration
  `000004_review_display_name.sql` (nullable `transaction_reviews.display_name`,
  riding the existing user-owned review RLS). Review offers an optional
  inline `Display name` field defaulting to `merchant_name ?? narration ?? ""`
  — `normalized_merchant` deliberately excluded, because it is lowercased for
  matching, not for display. `resolveDisplayName()` in `src/lib/txn.ts` owns
  the order: `review.display_name` → `merchant_name` → `normalized_merchant` →
  `narration`, skipping whitespace-only values. The operator expanded the
  scope beyond `TransactionRow` for consistency, so it now also drives the
  Transaction Detail title and the Insights top-merchant label. In Insights
  only the display label changed; `merchantKey` still keys the aggregation, so
  the winning merchant cannot change. **Provider facts stay immutable**:
  the raw narration is still shown verbatim in the Detail "Narration" fact
  row and is not editable anywhere.
  Web proof: seeding `display_name` made Home and Activity show the new name
  with the old merchant gone; the Detail title read `Zainuu Fresh Mart` while
  the fact row still read `Narration: Medplus Pharmacy ref 178991`
  (`phase10a5-displayname-*.png`).
- **DEFERRED, unchanged from Phase 10A:** legend wrap at 375; Expo
  header-back chrome on light screens; Ask Reconcile yellow entry tint;
  Budget Ask entry; white-on-alert-red 12px contrast on the starburst
  callout.

### Checks on the fix tree
- `npx tsc --noEmit` → 0. `npx eslint .` → 0.
- `npm test` → 20 suites passed, 1 skipped (live); 183 passed, 2
  live-skipped; `check:tokens` 0 violations. `native-safety` green.
  New coverage this phase: `pillNavClearance`/`PILL_NAV_HEIGHT` and the
  pill's own `minHeight` (wave7), axis-label shrink/ellipsize for both charts
  (charts), Detail title + preserved narration and Insights top-merchant
  display name (screens9), avatar uri/photo/failure fallback (wave6),
  `resolveDisplayName` order (screens), over-budget red fill + uncapped
  percent (wave8), avatar path helpers (avatar.test.ts).
- `npx expo export -p web` → success, 20 static routes.
- `tests/setup.js` gained a `react-native-safe-area-context` mock: no screen
  test renders a `SafeAreaProvider` and `useSafeAreaInsets()` throws without
  one, so the hook returns the library's own zero-inset default. Production
  code uses the real hook; only the test environment is stubbed.

### Deploy and web regression
- Pushed `5e64d16`; Vercel READY. **The Phase 10A production alias
  `reconcile-jhmath5cq-uhhh2.vercel.app` now serves a stale bundle — the live
  production alias is `https://reconcile-uhhh2.vercel.app` (also
  `reconcile-two-tau.vercel.app`).** All three current aliases
  (`reconcile-uhhh2`, `reconcile-two-tau`, `reconcile-git-main-uhhh2`) point at
  deployment `dpl_BuJZCX6Fk7ihXDjHbwDord35S2SF` = `5e64d16`. Use
  `reconcile-uhhh2.vercel.app` going forward.
- `curl -sIL https://reconcile-uhhh2.vercel.app` → 200. Deployed bundle
  carries the new Fix 5 markers (`Change photo`, `settings-photo-change`,
  `avatars`, `budget-scroll`, `insights-scroll`, `settings-scroll`) and still
  carries the Phase 10A `Edit budget` marker — no Phase 10A regression.
- Bundle secret scan: exactly one Supabase-URL match
  (`https://ztfqckfdvchcqksluqri.supabase.co`); the single `sb_secret_` hit is
  supabase-js's `startsWith("sb_secret_")` prefix-check function body, not a
  value. No secret in the bundle.
- Agent-as-user web pass (Playwright, headless Chromium, throwaway users via
  the Supabase admin API with `email_confirm`, reduced motion on): sign-in →
  demo sync (55 txns) → budget create → review confirm with an edited display
  name → Activity → Home → Settings → Detail, at **375×812 and 1280×800**.
  Zero console errors. Zero 4xx/5xx. Zero overflowing elements, zero
  unlabeled icon buttons, zero sub-44px targets on every audited screen
  (the one 30×30 control reported is the known deferred Expo web header-back
  chrome on light screens). The only network entries were two
  `net::ERR_ABORTED` on a `transaction_reviews` count, which is the
  screen-change abort of an in-flight request, not a failure.
  Screenshots: `docs/browser-tools/phase10a5-*.png` (22 files).
- Visual proof read directly, not just asserted: Home renders on Ink with no
  light bar and the over-budget bar is full Alert Red with an uncapped pill
  (`phase10a5-overbudget-home-375.png`); Settings shows the uploaded yellow
  avatar with Change photo and Remove (`phase10a5-avatar-upload-375.png`).

### Preview APK
- EAS build (NOT a dev client) from `5e64d16`, profile `preview`, SDK 57,
  `com.onyebuchidaniel.reconcile`, status FINISHED, `gitCommitHash
  5e64d16de279e2dc92db460b40cda38b52eea0f5`. Submitted with
  `EAS_SKIP_AUTO_FINGERPRINT=1` (local fingerprint computation stalls on this
  machine); credentials and profile unchanged.
- Build:
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/0d881bce-05d8-4526-8fec-55141e3410f1`
- APK:
  `https://expo.dev/artifacts/eas/FYBzbNpgavXSNRtMCzWpHyah19oOolve-ZgLr0AfOCo.apk`
  (verified reachable, HTTP 200, 110,391,525 bytes)

### Needs a real device
- **Fix 3** — the whole defect was native-only; the fix is unit-tested and
  web-clean, but only an Android install can prove the overflow is gone.
- **Fix 4** — the clearance value is confirmed on web; whether the pill
  clearance reads as excessive bottom whitespace on a real device (pill nav is
  in flow on these four screens) needs eyes on hardware.
- **Fix 5** — the full upload/render/remove path is proven in a browser
  against the live bucket; the Android gallery picker and camera-roll
  permission prompt still need a device.
- **Fix 1** — `headerShown: false` also removes the visible back affordance
  on Home on native (Home is the pill-nav root, and its header had no
  explicit back button). Confirm that is acceptable to the operator.
- **Fix 6** — the red/uncapped bar is proven in a browser; confirm it reads
  correctly beside the Phase 10A starburst on a real screen.

- Explicit statement: "Phase 10B pending operator re-verification at
  `https://expo.dev/artifacts/eas/FYBzbNpgavXSNRtMCzWpHyah19oOolve-ZgLr0AfOCo.apk`.
  SKILL_FRONTEND_DESIGN.md rewrite remains gated on that verification."
- SKILL_FRONTEND_DESIGN.md still untouched (§10 evolution log still the
  template). Phase 10B and Phase 11 NOT started.

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

## Phase 3 checkpoint (design tokens)
- Commit: `3120a3c feat: add design token system (Phase 3)`, plus
  `ba9f748 fix: enable clean URLs for static web routes`,
  `1d4507b fix: normalize to-one review embeds and ask basis line`,
  `5b4c517 docs: refresh browser screenshots from verified regression pass`.
- Tokens: `src/theme/` now holds `colors.ts` (exact design.md §3 palette +
  `categoryTints`), `type.ts`, `spacing.ts`, `radius.ts`, `motion.ts`
  (`durations`, `easings`, `resolveDurations`, `useMotion`), `index.ts`.
  The old `tokens.ts` was deleted; its three importers were repointed.
- Title approach: paired titles ship as a `titleLight` (300) + `titleHeavy`
  (700) pair sharing size/line-height, never a single-weight `title`.
- Font decision: Inter installed via `@expo-google-fonts/inter` (+ `expo-font`,
  `expo-splash-screen`) and loaded for all six weights in `app/_layout.tsx`
  before first render, with system-font fallthrough on failure. No fallback
  was needed. Demo screens render in Inter now; no screen was restyled.
- Token-check: `npm run check:tokens` reports 0 violations (validated with a
  planted violation first). Nothing to fix; Phase 4 begins enforcement. The
  demo screens are plain, so violations cluster nowhere.
- Browser tools (Part A): self-provisioned Playwright 1.63.0 + headless
  Chromium (no MCP/browser-use tool exists in this environment). Smoke passed:
  landing screenshots at 375×812 and 1280×800, "Enter Demo Mode" located by
  text and clicked through a real signup→sync→Home loop, console readable
  (empty), network observable, page text readable. Screenshots in
  `docs/browser-tools/landing-*.png`, `demo-entered.png`.
- Regression (second pass clean): fresh user → sign in → demo sync (55 txns)
  → confirm → Insights renders with real numbers → Ask answers
  "How much did I spend on food?" grounded. Console empty, no 4xx. Found and
  fixed: (1) deep links 404 on Vercel (`cleanUrls: true` added); (2) PostgREST
  to-one embeds arrive as objects, zeroing budget caps/insight changes/detail
  review state (normalized with `asEmbedArray`); (3) doubled "based on:" prefix
  in Ask answers.
- No screen was restyled; no component built; `supabase/` untouched except
  nothing (no migration needed); SKILL_FRONTEND_DESIGN.md remains unwritten
  (earned at Phase 10).
- Deploy: production `https://reconcile-h36wgzx1z-uhhh2.vercel.app` (alias
  `reconcile-two-tau.vercel.app`), HTTP 200, bundle contains the project URL,
  secrets scans zero.
