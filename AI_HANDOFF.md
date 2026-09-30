# Reconcile — AI Handoff

## Current state

**Project:** Reconcile. Nigeria-first mobile personal-finance app for
cross-bank transaction reconciliation, budgeting, and read-only financial
insights. Repo: `github.com/onyebuchidaniel60/Reconcile`.

**Current phase:** Phase 10B close — pending operator re-verification.

| Fact | Value |
|---|---|
| Last verified APK (operator is installing this) | `https://expo.dev/artifacts/eas/x9OmdVZTcOFENaOOEC4CAbIjsqr7n0SpSevVOPyvay0.apk` |
| Live web alias | `https://reconcile-uhhh2.vercel.app` |
| Last phase commit (Phase 10B.5) | `53d4c0e fix: unify home and budget month spend; wire home month selector (Phase 10B.5)` |
| Handoff commit (this file) | `HEAD` — see the note below |
| `demo-v1` tag | `991851b` (unchanged since the demo phase closed) |
| Source-of-truth doc index | "Source-of-truth document index", immediately below |
| Environment / credentials | "Environment state", immediately below |

> The "Handoff commit" row reads `HEAD` because the hash of the commit that
> introduces it cannot be known before it exists. The real hash is recorded
> one commit later, in a docs-only follow-up that replaces this row.

**What the next session does.** Read this file top to bottom. Confirm state
with `git fetch origin && git status` (tree should be clean, HEAD should be
the handoff commit). Then, only after the operator confirms the Phase 10B.5
APK above on a real device, run **Phase 10B close** — the
`SKILL_FRONTEND_DESIGN.md` v1 rewrite scoped and seeded in "Phase 10B close —
scope and lessons to encode" below. Do not start Phase 11.

Everything below this block is per-phase history, newest checkpoint at the
bottom of that run of entries. Historical sections are preserved verbatim as
evidence; several contain superseded facts (older Vercel aliases, earlier
"next task" lines). Where history contradicts the block above, **the block
above wins**.

## Source-of-truth document index

Every document a session may need, and what each one governs:

- `PROJECT_SPEC.md` — product definition and MVP scope.
- `ARCHITECTURE.md` — system shape, technology choices, security model.
- `IMPLEMENTATION_PLAN.md` — phase sequence (v3, frontend-first with native
  verification).
- `AGENTS.md` — operating rules for the coding agent.
- `RECONCILE_BLUEPRINT.md` — consolidated master blueprint.
- `core-overview.md` — core demo definition; the foundation the full build
  extends. Explicitly does not override the docs above.
- `SKILL_LEAN_DELIVERY.md` — delivery sequencing, deployment, agent-as-user
  verification.
- `design.md` — visual and interaction source of truth. Wins on visual
  conflicts.
- `frontend-implementation-plan.md` — frontend build order.
- `SKILL_FRONTEND_DESIGN.md` — the skill earned at Phase 10B close
  (currently a blueprint placeholder, not yet rewritten; §10 evolution log
  still empty).
- `AI_HANDOFF.md` — this file. Current state and per-phase checkpoints.

## Environment state

**`.env.local`** — gitignored (`.gitignore:49`, pattern `.env*.local`), never
committed. Holds:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_OIDC_TOKEN`
- `EXPO_TOKEN` — not present in this repo's `.env.local`; EAS auth is via the
  logged-in CLI session (`buchi208`). Set one if a non-interactive flow needs
  it.

**`.env.production`** — committed. Contains `EXPO_PUBLIC_*` values only. Never
add a server-only value here; the web bundle inlines this file's contents.

**Browser tooling** — Playwright 1.63.0 + headless Chromium, self-provisioned
each session (no MCP or computer-use tool exists in this environment).
Verified working in the Phase 10B.5 session at Chromium 153.0.8010.12.

**Native tooling** — EAS CLI 24.8.0, logged in as `buchi208`. `eas.json` and
`app.json` are configured for `com.onyebuchidaniel.reconcile`. Builds are
submitted with `EAS_SKIP_AUTO_FINGERPRINT=1` (local fingerprint computation
stalls on this machine).

**Live web alias** — `https://reconcile-uhhh2.vercel.app`.
Do **not** use `reconcile-jhmath5cq-uhhh2.vercel.app` — it is stale and still
serves an old bundle. `reconcile-two-tau.vercel.app` also still resolves and
tracks current deploys.

## Phase 10B close — scope and lessons to encode

### Part 1 — What Phase 10B close does

Phase 10B close rewrites `SKILL_FRONTEND_DESIGN.md` v1 from the evidence
Phases 3–10 actually accumulated. The file currently exists (from blueprint
commit `38be36f`) but is unchanged since then — its §10 evolution log is
empty. The close is the moment the skill is earned: it replaces the
placeholder with a v1 that encodes the distilled rules below.
`SKILL_FRONTEND_DESIGN.md` is not touched until the operator has verified the
Phase 10B.5 APK on device, and the close runs in a fresh session.

### Part 2 — Ten lessons to encode

1. **Shared calculation ≠ shared definition.** Home and Budget called the same
   engine helper and still disagreed — one read `.expenseMinor` (gross), the
   other read `.netMinor` (net of refunds). Unifying a computation means
   unifying the definition, not just the call site.
2. **Date windows drift silently.** A local calendar month and a `Date.parse`
   UTC midnight look identical in code and differ by an hour near month
   boundaries. Pin date arithmetic to one convention across the codebase.
3. **Yoga `flexShrink: 0` on Android vs CSS `flexShrink: 1` on web.** Same
   component, same code, native overflows at 375px, web does not. Native
   overflow must be verified on device or in a native-width proxy, not
   inferred from a web pass.
4. **"Below the fold at 812px" is a measurable defect class that unit tests
   cannot catch.** Any field that must be visible on a specific viewport must
   be asserted with a measured position, not a snapshot.
5. **Percentage pills over a fluid bar need their anchor zone floored.** A
   percentage pill centred over a fill ratio of 1% cannot be rendered without
   a minimum anchor zone. Any fixed-width assumption breaks at small ratios.
6. **A rename must not route through a helper that also mutates status.** The
   Detail rename uses `setReviewDisplayName`, not `confirmReview`, because
   `confirmReview` also flips status, wipes `user_note`, and pollutes learned
   merchant rules. Side effects hide in reused code — read the callee before
   reusing it.
7. **Expo web header chrome is platform-only.** `headerShown: false` on a
   Stack route removes a visual element on web that is OS-handled on native.
   Header behaviour must be verified on both surfaces independently.
8. **`KeyboardAvoidingView` needs `behavior="height"` on Android,
   `behavior="padding"` on iOS.** A single value does not work on both.
9. **Design-mandated contrast violations are flagged, not fixed.** The
   white-on-alert-red 12px starburst callout measures ~3.6:1 against AA's
   4.5:1 minimum. It is mandated by `design.md` §3 and §7. Changing it requires
   a `design.md` decision, not a code patch.
10. **Every chart worklet that calls a non-worklet function crashes on native
    and works on web.** The fastest diagnostic is the Expo dev client: install
    it, reproduce, read the red error overlay. Guessing through EAS build
    cycles without the dev client is slower and less certain.

### Part 3 — Method lessons

- Two-screen side-by-side reading (Home vs Budget, same period, same fixture)
  catches definition mismatches that per-screen tests never see.
- Reading two screens' numbers as a user does — not asserting on each screen
  in isolation — is what caught the Home/Budget expense mismatch in Phase
  10B.5.
- A shared helper is not evidence of a shared definition. Read the fields it
  returns, not just its name.

### Part 4 — Source for each lesson

| Lesson | Originating record in this file |
|---|---|
| 1. Shared calculation ≠ shared definition | Phase 10B.5 Fix A (the Home-vs-Budget definition table) |
| 2. Date windows drift silently | Phase 10B.5 Fix A (`monthBounds` vs `Date.parse`) |
| 3. Yoga `flexShrink` | Phase 10A.5 Fix 3 |
| 4. Below the fold at 812px | Phase 10B Fix B (measured y=912 vs 812) |
| 5. Pill anchor zone floored | Phase 10B Fix A (`PILL_EDGE_ANCHOR_RATIO`) |
| 6. Rename helper side effects | Phase 10B Fix C (`setReviewDisplayName`) |
| 7. Web header chrome | Phase 10A.5 Fix 1 and the Phase 10A deferred list |
| 8. `KeyboardAvoidingView` | Phase 10B Fix B |
| 9. 3.6:1 starburst residual | Phase 10A KNOWN RESIDUAL |
| 10. Worklet/non-worklet crash | Phase 8 native crash + "Native crash resolved" |

## Phase 11 — Mono integration (next after Phase 10B close)

- Replaces the demo provider with the real Mono adapter, behind the
  **unchanged** `FinancialProvider` interface. Do not change the interface.
- Mono client lives in Supabase Edge Functions only — never in the client.
- `MONO_SECRET_KEY` is set as a **Supabase Edge Function secret**. Never in
  `.env.local`, never in `.env.production`, never in the client bundle.
- **Institution discovery:** dynamic from Mono, not hard-coded.
- **Connection session:** server-side creation; client opens Mono Connect UI.
- **Account persistence:** normalized per the existing schema
  (`bank_connections`, `bank_accounts`).
- **Webhook:** authenticity verification (Mono signature) + idempotency via a
  unique provider event key. **Note:** no `provider_events` table exists yet —
  the current migrations (`000001`–`000004`) create `sync_runs` for sync
  bookkeeping but nothing for webhook events. Phase 11 must add that table
  (and its RLS) as part of the phase.
- **Reauth handling:** Mono reports `reauth_required`; connection status
  updates and the user is prompted to reconnect.
- **Verification:** a live sandbox test proving the full loop (connect →
  sync → review → categorize → budget updates) against Mono sandbox, on both
  web and native.
- **Real-world dependency:** Mono business onboarding/KYB and sandbox keys must
  be available before this phase can complete. If they are not, implement the
  adapter and test against a mock, and explicitly flag live verification as
  pending.
- Commit: `feat: add mono financial data provider (Phase 11)`.

## Open flags carried into Phase 10B close

- **APK hash stamp.** The Phase 10B.5 build's `gitCommitHash` and
  `gitCommitMessage` came back empty from the EAS API (submit ran from a
  background job without git context, with `EAS_NO_VCS` set). The archive is
  still the correct code — build started 15:53, commit `53d4c0e` landed 15:39,
  `git diff 53d4c0e..HEAD` empty — so it is trustworthy by tree equality, not
  by a stamped hash. Re-run the build in the foreground if a stamped artifact
  is wanted.
- **Budget Overview card hides on prior months by design** (Phase 10B.5 Fix B).
  Budgets are per-calendar-month rows and only the current month's is fetched,
  so showing it would compare the selected month's spend against the current
  month's limit. Confirm the operator accepts this.
- **Stale URL.** `reconcile-jhmath5cq-uhhh2.vercel.app` is stale. Use
  `https://reconcile-uhhh2.vercel.app`.
- **Phase 10B.5 seed timing.** Early in a calendar month the current month
  holds very few demo rows (1–4), so a prior month can look fuller. Existing
  seed shape, not a regression.
- **Known deferred from Phase 10A:** hero legend wrap at 375; Ask Reconcile
  yellow entry tint; Budget Ask entry; white-on-alert-red 12px callout
  contrast.

---

## Per-phase checkpoints (history)

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

## Phase 10B checkpoint (home budget redesign + post-review renaming)
- Fix commit: `83d033a feat: redesign home budget overview, add post-review
  transaction renaming (Phase 10B)` (12 files, +731/-123). Second commit
  (this entry): handoff plus 22 evidence screenshots.
- Scope: the three operator-reported defects from the Phase 10A.5 APK native
  walk. No new primitives (one `size` prop on `ProgressBar`, plus `weight`
  on `PillBadge` and `labelWeight` on `Input`), no new organisms, no
  `supabase/` change (the `display_name` column already existed from
  migration 000004), no UI framework.

### Fix A — Home budget overview redesign. IMPLEMENTED, VERIFIED.
- Read `design/reference-1.webp` first. The reference's Budget Overview bar
  is: filled portion left carrying the percentage, hatched remainder right,
  date range below. The shipped card had a 12px bar whose pill floated over
  the whole track with no remainder treatment, which is why the operator
  read it as confusing.
- `ProgressBar` gained `size: "default" | "large"` and a `hatched` flag.
  `large` is 28px tall on a `paper`-at-60% track with the unfilled
  remainder carrying the existing `HatchPattern` in `line` at 40%. The
  percentage pill is layered *outside* the clipped track so a narrow fill
  cannot hide it: at >=15% fill it centres over the fill, below that it is
  right-anchored to the fill edge, and the anchor zone is floored at 15% so
  the pill is never clipped. The 15% is a ratio constant, not a px value —
  the bar is fluid. The uncapped percent + alert-red over-budget fill from
  Phase 10A.5 Fix 6 are unchanged and still live.
- `BudgetOverviewCard` now renders Spent (left) and Left (right) rows with
  tabular amounts under the bar. Over budget the right label becomes "Over"
  and shows the overdraft in alert red. The date range is kept below them;
  removing it was allowed but both rows and the range read clearly together,
  so all three stayed.
- design.md §8 Home updated (the one authorized edit): the bar, the hatched
  remainder, and the Spent/Left rows are now specified. No other design.md
  change; `git diff design.md` = 10 lines, all inside §8 Home.
- Web proof on the deployed bundle, both viewports, bar height measured 28px:
  - under budget (24%): pill "24%", hatch present and inside the bar,
    `Spent ₦218,702.96` / `Left ₦681,297.04`, zone 24% centred.
  - narrow fill (1%): pill "1%" still fully visible, zone floored to 15%
    and `flex-end` anchored — the edge-anchor rule proven live.
  - over budget (109%): pill "109%", full alert-red fill, right row reads
    `Over ₦18,702.96`. The hatch is correctly absent because the fill caps
    at 100%.
  - Screenshots `phase10b-home-budget-{under,narrow}-*`, `phase10b-home-full-*`.
- New tests: under-budget split row, exactly-at-limit ("100%", ink not red),
  over-budget "Over" + alert red, tiny-fill pill visibility + anchor, and
  wide-fill centring (5 cases in `tests/wave8.test.tsx`).

### Fix B — review name edit usability. INVESTIGATED, ROOT-CAUSED, FIXED.
- Root cause found by measurement, not assumption: the field rendered fine
  and Confirm saved correctly (a seeded row persisted as
  "Medplus Pharmacy RENAMED"), but at 375x812 the field sat *below the fold*
  for every row except the first — measured field bottom at y=912 against
  an 812px viewport on row 52 of 53. The chips above it pushed it down. It
  was a discoverability bug, not a save bug.
- Fixes: the field now sits directly under the tapped row, above the chips,
  with nothing between them; the label is "Name this transaction" at
  `small`/600 in paper (was the generic "Display name"); the screen is
  wrapped in `KeyboardAvoidingView` (`height` on Android, `padding` on iOS)
  so the keyboard cannot cover the field it just opened.
- Web proof at both viewports: field visible without scrolling on rows 0,
  mid-list, and last (bottoms 324 / 518 / 776 against 812), always above the
  chips, `review-keyboard-avoid` present, and a typed name persisted to
  `transaction_reviews.display_name`.
- Test: `collectOrder` walks the rendered tree and asserts
  `["name", "chip"]` document order, plus the new label text.

### Fix C — post-review renaming from Activity and Detail. IMPLEMENTED, VERIFIED.
- Detail: a 44x44 pencil `IconButton` beside the title opens an inline edit
  prefilled with the current display name, with Cancel/Save. Offered only
  when a review row exists (there is nothing to write `display_name` on
  before the first review).
- `setReviewDisplayName` writes the display column and NOTHING else.
  Deliberately not routed through `confirmReview`, which also sets
  `status`, `category_id`, `user_note`, `confirmed_at`, `source` and learns
  a merchant rule — renaming must not flip an `excluded` review back to
  `reconciled`, wipe the user's note, or pollute learned rules. Tested
  explicitly.
- Activity: **pencil chosen over long-press.** Long-press has no affordance
  on Android and an action sheet needs a modal primitive this phase may not
  add. The pencil shows only on rows whose review is `reconciled` or
  `excluded`, never on `needs_review` (those are renamed from Review), and
  routes to Detail where the edit lives. Both approaches were not built.
  Home rows deliberately have no affordance; the row opens Detail.
- Propagation proof: took a row Home was actually rendering (located by its
  `home-row-<id>` testID), renamed it via Detail, reloaded Home and read
  that same row back — `Medplus Pharmacy` became `Coffee with Ada` on Home
  and on Activity, while Detail's narration row still read
  `Medplus Pharmacy ref 178991`. A first propagation attempt reported
  `false`; that was a measurement artifact (the transaction sat outside
  Home's 5-row window), not a defect — re-tested against a row known to be
  in the window and it passes.
- New tests: rename writes only the name and never calls `confirmReview`,
  cancel writes nothing, pencil hidden with no review, pencil present on
  reconciled/excluded and absent on needs_review, and it routes to Detail.

### Checks on the fix tree
- `npx tsc --noEmit` → 0. `npx eslint .` → 0 (10 `import/first` warnings
  introduced by an intermediate edit were fixed, not suppressed).
- `npm test` → 20 suites passed, 1 skipped (live); 193 passed, 2
  live-skipped; `check:tokens` 0 violations; `native-safety` green.
- `npx expo export -p web` → success, 20 static routes.
- One flaky-test fix: `tests/screens9.test.tsx` gained the same
  `jest.setTimeout(20000)` headroom the other screen suites already carry.
  The failure was a 20s timeout under parallel load on a saturated machine,
  reproduced only in full-suite runs; the suite passes standalone and in
  full-suite runs since.

### Deploy and web regression
- Pushed `83d033a`; Vercel READY (`reconcile-o6y4qi8zf-uhhh2.vercel.app`).
  `curl -sIL https://reconcile-uhhh2.vercel.app` → 200; all three aliases
  point at `dpl_5B7uEFaSmDKtsGPtsxCUrxk14sMG`. **The Phase 10A alias
  `reconcile-jhmath5cq-uhhh2.vercel.app` still serves a stale bundle — live
  alias remains `reconcile-uhhh2.vercel.app`.**
- Deployed bundle carries the new markers (`Name this transaction`,
  `detail-rename-open`, `activity-rename`) and still carries the Phase 10A
  markers (`Edit budget`, `Change photo`, `budget-scroll`) — no regression.
  Exactly one Supabase-URL match; the single `sb_secret_` hit is supabase-js's
  prefix-check function body, not a value. No secret in the bundle.
- Agent-as-user web pass (Playwright, headless Chromium, throwaway users via
  the Supabase admin API, reduced motion on) at **375×812 and 1280×800**:
  sign-in → demo sync → budget create → review confirm with a typed name →
  Activity → Detail rename → Home → Insights → Budget → Settings.
  Zero console errors. Zero 4xx/5xx. Zero overflowing elements, zero
  unlabeled icon buttons, zero sub-44px targets.
  Two findings, both handled:
  - The Activity filter row is a deliberate horizontal scroller
    (design.md §8 Activity), so its chips legitimately extend past the
    viewport. The audit now excludes `[data-testid="activity-filters"]`
    rather than reporting it as overflow; with that exclusion, overflow is
    empty. This is a measurement correction, not a UI change.
  - The only network entries are `net::ERR_ABORTED` on a
    `transaction_reviews` count — the screen-change abort of an in-flight
    request, present in every prior phase too.
- 10A/10A.5 regression checks still green in the same pass: Budget has no
  horizontal overflow, Settings still computes a `76px` pill clearance
  (0 inset + 60 pill + 16), Insights top merchant still renders.
- Screenshots: `docs/browser-tools/phase10b-*.png` (22 files).

### Preview APK
- EAS build (NOT a dev client) from `83d033a`, profile `preview`, SDK 57,
  `com.onyebuchidaniel.reconcile`, FINISHED, `gitCommitHash 83d033a`,
  message `feat: redesign home budget overview, add post-review transaction
  renaming (Phase 10B)`. Submitted with `EAS_SKIP_AUTO_FINGERPRINT=1`;
  credentials and profile unchanged.
- Build:
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/2ca3be94-31f0-42df-b2d5-a8a88e47bb8c`
- APK:
  `https://expo.dev/artifacts/eas/pJh4Ps1y8jdib5PhrgE32MKAImvEArrqcuArpXwXwRo.apk`
  (verified reachable, HTTP 200, 110,397,173 bytes)

### Needs a real device
- **Fix A** — the tall bar, the hatch rendering, and the Spent/Left rows are
  verified in a browser at both viewports; confirm the 28px bar and hatch
  read correctly at native density on the device.
- **Fix B** — the fold problem is fixed and measured in a browser; the
  keyboard-avoidance behaviour can only be judged with a real soft keyboard.
  Confirm the field is reachable and not covered on Android.
- **Fix C** — both entry points work in a browser; confirm the Activity
  pencil's 44x44 target is comfortable in a thumb reach on the device, and
  that long-press on a row (now inert) does not feel like a missing feature.

- Explicit statement: "Phase 10B close pending operator re-verification at
  `https://expo.dev/artifacts/eas/pJh4Ps1y8jdib5PhrgE32MKAImvEArrqcuArpXwXwRo.apk`.
  SKILL_FRONTEND_DESIGN.md rewrite remains gated on that verification and
  runs in Phase 10B close."
- SKILL_FRONTEND_DESIGN.md still untouched (§10 evolution log still the
  template). Phase 10B close NOT started; Phase 11 NOT started.

## Phase 10B.5 checkpoint (data consistency + month toggle)
- Fix commit: `53d4c0e fix: unify home and budget month spend; wire home
  month selector (Phase 10B.5)` (6 files, +564/-44). Second commit (this
  entry): handoff plus 10 evidence screenshots.
- Scope: the two operator-reported data bugs. No source-of-truth doc touched
  at all this phase (`git diff` for every doc in the source-of-truth set is
  unchanged since Phase 10B), no new primitives, no organisms, no `supabase/`
  change, no schema or migration.

### Fix A — Home expenses must match Budget expenses. INVESTIGATED, FIXED, VERIFIED.
The two definitions as they stood before this phase:

| | Home hero "Expenses" | Budget "Spent" |
|---|---|---|
| Call site | `app/home.tsx` `setExpenses(spend.expenseMinor)` | `app/budget.tsx` `const spent = Math.max(spend.netMinor, 0)` |
| Engine | `periodSpend(rows, monthStart, monthEnd)` | `periodSpend(rows, monthStart, monthEnd)` |
| Field used | `.expenseMinor` — **gross** | `.netMinor` — **net** |
| Refunds | **ignored**, so a refunded ₦20k still read as spent | **subtracted** |
| Date range | local calendar month, from a private `monthBounds(now)` in home.tsx | `budget.period_start` … `budget.period_end` via `Date.parse` (UTC midnight) |
| `budget_eligible` | filters it out | filters it out |
| `internal_transfer` | never counted (no `expense`/`refund` match) | never counted |

Root cause: same engine helper, two different fields. `.expenseMinor` is the
gross figure; `.netMinor` subtracts refunds. Any month containing a refund
made Home read higher than Budget by exactly the refund total.

A second, quieter divergence: Home's window came from a hand-rolled local
`monthBounds`, Budget's from `Date.parse("2026-09-01")`, which is **UTC**
midnight. In UTC+1 those are different instants, so a transaction near a
month boundary could land in one window and not the other.

**Budget's definition is the correct one** — a refund is money that came back
and must not still read as spent — so per instruction the definition was not
changed, only deduplicated.

- New `getMonthlySpend(txns, month)` in `src/lib/txn.ts`: the single
  definition. Returns `{ netMinor, expenseMinor, refundMinor, incomeMinor,
  startMs, endMs }`. Rules identical to the Budget engine — only
  `budget_eligible` rows count, `expense` adds, `refund` subtracts,
  internal/external transfers are never spend, income is summed separately
  and never reduced by refunds, and the window is half-open `[start, end)`
  so a boundary instant cannot land in two months.
- Both screens now call it. Home reads `spend.netMinor` for the hero and the
  budget bar. Budget derives the month from `budget.period_start` via a new
  `monthFromIso` (year/month only, no UTC drift) and calls the same helper,
  so the two windows are identical by construction rather than by
  coincidence. The Budget trend points and category caps still use
  `periodSpend` over that same window — unchanged, and not part of the
  reported bug.
- The Donut needed no separate fix: it was already driven by the same
  `income`/`expenses` props as the legend, so unifying those props unified
  the chart too. Verified: switching months re-renders the donut.
- Supporting helpers added alongside, all in `src/lib/txn.ts`:
  `monthBoundsFor` (local half-open calendar month), `monthOffset` (back whole
  calendar months, **day clamped to the target month's length** — naive
  `new Date(y, m - back, d)` silently rolls Jan 31 back to Mar 2/3, which
  would have shifted the period label by a month on the 29th–31st), and
  `recentMonths`.
- Numeric proof on the deployed bundle, identical at 375×812 and 1280×800,
  with a ₦9,000,000 budget and real demo spend: Home hero "Expenses"
  **₦200,202.96**, Home Budget "Spent" row **₦200,202.96**, Budget trend
  hero **₦200,202.96**. All three the same number. Screenshots
  `phase10b5-home-*.png` and `phase10b5-budget-*.png`.
- Tests: a fixture spanning expense + income + refund + internal transfer +
  external transfer + an out-of-month row returns the expected net;
  ineligible rows excluded from spend but their income kept; refunds beyond
  expenses floor at 0; the half-open window never double-counts a boundary;
  and an explicit **parity test** asserting `getMonthlySpend` equals
  `periodSpend` on the same rows and window.

### Fix B — Home month toggle. WAS A STUB, NOW WIRED, VERIFIED.
- Before: `HeroSummaryCard` has had an optional `onPressPeriod` prop since
  Phase 7 and renders its period label as a `Pressable` with
  `minHeight: 44`, but `app/home.tsx` **never passed the prop**, so
  `onPress` was `undefined` and the control was inert. Confirmed by reading
  the caller, not by inference. Home also hard-coded `now` everywhere, so
  there was no selected-month state at all.
- Now: `monthBack` state (an offset, not a `Date`, so the default stays
  live). Tapping the period label toggles an **inline** month picker under
  the hero card — six `Chip`s, current month plus five prior, current one
  selected, plus a close `IconButton`. Inline rather than a modal because
  the phase may not add a primitive, and it keeps the donut visible while
  comparing months. Selecting a month re-runs the fetch effect and
  recomputes the hero (income, expenses, donut total), the budget bar, and
  the recent-activity list, which is now filtered to the selected month
  rather than a newest-first slice unrelated to the period.
- One deliberate behaviour change, stated because it is a judgement call:
  the **Budget Overview card is hidden on a prior month**. Budgets are
  per-calendar-month rows, and only the current month's budget is fetched,
  so showing it would compare the selected month's spend against the
  current month's limit — a worse version of the very inconsistency this
  phase exists to remove.
- Demo seed (B2): **verified, not changed.** Ran the real
  `buildDemoDataset` builder: 55 transactions spanning **2–3 distinct
  calendar months** at every point in the month (min 2), and the prior month
  contains expense, income and refund rows. The instruction was to extend the
  seed only if it did **not** already span two months, so no seed change was
  made. One property worth knowing: on the 1st or 2nd of a month the current
  month holds only 1–4 rows (a 60-day trailing window mostly lands in the
  prior month), so a prior month will look fuller than the current one early
  in the month. That is the existing seed's shape, not a regression.
- Tests: Home with a prior month selected renders that month's figures;
  pressing the period label opens the picker; selecting month 1 changes the
  legend figures and the period label and closes the picker; returning to
  month 0 restores the original figures exactly; and the budget card is
  absent on a prior month.
- Web walk on the deployed bundle, both viewports: period label
  "September 2026" → picker with 6 months → August 2026 selected, expenses
  move ₦200,202.96 → **₦275,031.20**, income ₦570,000.00 → ₦450,000.00,
  donut total ₦770,202.96 → **₦725,031.20**, recent rows re-dated to Aug 31,
  budget card gone. Returning to the current month restored
  ₦200,202.96 exactly. Screenshots `phase10b5-month-picker-*.png`,
  `phase10b5-home-prior-month-*.png`, `phase10b5-home-back-to-current-*.png`.

### Checks on the fix tree
- `npx tsc --noEmit` → 0. `npx eslint .` → 0 (an `exhaustive-deps` warning
  on the month-choices memo was resolved by dropping the unnecessary
  `useMemo` entirely rather than suppressing the rule).
- `npm test` → 20 suites passed, 1 skipped (live); 206 passed, 2
  live-skipped; `check:tokens` 0 violations; `native-safety` green.
  (+13 tests this phase: 6 helper/parity, 4 month helpers, 3 Home, 1 Budget
  parity through the real screen.)
- `npx expo export -p web` → success, 20 static routes.
- Two test-authoring corrections worth recording, both found by running the
  tests rather than by inspection: the `ChartLegend` renders label and value
  as separate children of one `Text`, so `getByText("Expenses ₦x")` can
  never match (assert by testID and read concatenated text instead); and the
  fixtures use `amount_minor`, so ₦400,000 is `"₦4,000.00"`, not
  `"₦400,000.00"`. I asserted the wrong string twice before reading the
  actual output — neither was a product bug.

### Deploy and web regression
- Pushed `53d4c0e`; Vercel READY (`reconcile-r2g5ucj5w-uhhh2.vercel.app`).
  `curl -sIL https://reconcile-uhhh2.vercel.app` → 200. Deployed bundle
  carries the new markers (`home-month-picker`, `Summary period`) and still
  carries every prior phase's (`Change photo`, `Edit budget`, `Name this
  transaction`, `activity-rename`, `detail-rename-open`) — no regression.
  Exactly one Supabase-URL match; the single `sb_secret_` hit is supabase-js's
  prefix-check function body, not a value. No secret in the bundle.
- Agent-as-user web pass (Playwright, headless Chromium, throwaway user via
  the Supabase admin API, reduced motion on) at **375×812 and 1280×800**:
  sign-in → demo sync → budget create → Home/Budget comparison → month
  toggle walk → Activity → Review → Settings → Insights.
  **Zero console errors. Zero 4xx/5xx. Zero overflowing elements, zero
  unlabeled icon buttons, zero sub-44px targets** on every audited screen
  (Home, Budget, picker, prior month, Activity, Review, Settings, Insights).
  Only network entries are `net::ERR_ABORTED` on a `transaction_reviews`
  count — the screen-change abort of an in-flight request, present in every
  prior phase too.
- Prior-phase regressions re-confirmed in the same pass: Activity rename
  pencil present, Review name field visible above the fold and above the
  chips, Settings Change photo present with the 76px pill clearance
  unchanged (0 inset + 60 pill + 16), Insights renders.

### Preview APK
- EAS build (NOT a dev client), profile `preview`, SDK 57,
  `com.onyebuchidaniel.reconcile`, version 0.1.0 (1), INTERNAL, FINISHED.
  Submitted with `EAS_SKIP_AUTO_FINGERPRINT=1`; credentials and profile
  unchanged. Queue was unusually long (~67 min IN_QUEUE, then ~12 min build).
- Build:
  `https://expo.dev/accounts/buchi208/projects/reconcile/builds/56c161dd-d805-46e7-b3b0-ad76eb7b0830`
- APK:
  `https://expo.dev/artifacts/eas/x9OmdVZTcOFENaOOEC4CAbIjsqr7n0SpSevVOPyvay0.apk`
  (verified reachable, HTTP 200, 110,402,201 bytes)
- **FLAGGED, operator should confirm:** this build's `gitCommitHash` and
  `gitCommitMessage` came back **empty** from the EAS API — the submit ran
  from a background job that did not carry the git context, and
  `EAS_NO_VCS` was set in the environment at submit time. The uploaded
  archive is still the correct code: the build started 15:53, the Phase
  10B.5 commit `53d4c0e` landed 15:39, and `git diff 53d4c0e..HEAD` is empty,
  so nothing changed between the commit and the build. The build is
  trustworthy by tree equality, **not** by a stamped hash. Worth re-running
  the build in the foreground if a hash-stamped artifact is wanted.

### Needs a real device
- **Fix A** — the three figures match numerically in a browser against real
  demo data; confirm the Home and Budget numbers read identically on device.
- **Fix B** — the toggle works in a browser, but only a device confirms the
  picker sits comfortably in a thumb reach under the hero card and that the
  inline list does not crowd the yellow card on a small screen.
- **Fix B (seed timing)** — early in a calendar month the current month will
  have very few demo rows, so a prior month can look fuller. Not a defect,
  but the operator may see it on the 1st or 2nd.

- Explicit statement: "Phase 10B close pending operator re-verification at
  `https://expo.dev/artifacts/eas/x9OmdVZTcOFENaOOEC4CAbIjsqr7n0SpSevVOPyvay0.apk`.
  SKILL_FRONTEND_DESIGN.md rewrite remains gated on that verification."
- SKILL_FRONTEND_DESIGN.md still untouched (§10 evolution log still the
  template). Phase 10B close NOT started; Phase 11 NOT started.

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
**Phase 10B close — pending operator re-verification.** Phases 3–10B.5 are
implemented, tested, and committed; the Phase 10B.5 APK is with the operator.

This section was previously "Current phase: Phase 1". That was stale and
superseded — see "Current state" at the top of this file, which is
authoritative.

## Next exact task
The operator verifies the Phase 10B.5 APK
(`https://expo.dev/artifacts/eas/x9OmdVZTcOFENaOOEC4CAbIjsqr7n0SpSevVOPyvay0.apk`)
on a real Android device. Once they confirm, **Phase 10B close** rewrites
`SKILL_FRONTEND_DESIGN.md` v1 from accumulated evidence — scoped and seeded in
"Phase 10B close — scope and lessons to encode" above. The skill stays
untouched until that verification completes.

**After Phase 10B close:** Phase 11 — Mono integration (see the brief above
and `IMPLEMENTATION_PLAN.md` §Phase 11).

Before changing code in any phase:
1. inspect repository state (`git fetch origin && git status`);
2. read the source-of-truth docs listed in the index at the top of this file;
3. confirm no later phase is already implemented;
4. confirm this file's "Current state" block agrees with `git log`.

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
