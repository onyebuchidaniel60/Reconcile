# frontend-implementation-plan.md — Reconcile Frontend Build Plan

**Status:** Source of truth for how the Reconcile frontend is built.
**Applies to:** All frontend work in `app/` and `src/` of the Reconcile mobile app.
**Complements:**
- `design.md` — what it looks like (visual source of truth, wins on visual conflicts)
- `ARCHITECTURE.md` — the overall system shape and tech stack
- `IMPLEMENTATION_PLAN.md` — backend and product sequencing
- `SKILL_LEAN_DELIVERY.md` — deployment and agent-as-user verification
- `core-overview.md` — the demo subset that this plan serves first
**Rule:** If a build decision isn't covered here, make it match the spirit of `design.md`
and this file. If this file conflicts with `design.md` on a visual matter, `design.md` wins.
If it conflicts with `ARCHITECTURE.md` on a stack matter, `ARCHITECTURE.md` wins.

---

## 1. Purpose

This plan governs:
- the order components and screens are built,
- the infrastructure that powers them,
- the way data binds to the UI,
- the way motion and haptics are structured,
- the way charts are implemented,
- the way the result is verified as a user would use it,
- and how the whole experience is turned into a reusable skill after the fact.

It does not duplicate `design.md`. Every visual decision (colors, type, spacing, motion
values, chart shapes, anti-patterns) lives there. This file tells you **how to build
toward it**.

## 2. Frontend stack (locked)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo + React Native + TypeScript | Per `ARCHITECTURE.md` |
| Routing | Expo Router | Route groups: `(auth)`, `(onboarding)`, `(tabs)`, `(settings)` |
| Styling | React Native `StyleSheet` + theme tokens | No UI framework — see §3 |
| Motion | `react-native-reanimated` | All animation through helpers, no inline values |
| Haptics | `expo-haptics` | Wrapped in helpers, not called directly from components |
| Charts | `react-native-svg` | Custom primitives, see §7 |
| Icons | `lucide-react-native` | One library, ~15 icons total, no mixing |
| State | Local component state + minimal shared state | No Redux/MobX/Zustand without a documented need |
| Server state | Supabase client (RLS) + Edge Function calls | No data-fetching library without a documented need |
| Web target | Expo web (`react-native-web` + `react-dom`) | Required for Vercel deployability |

New dependencies must be installed with `npx expo install <pkg>` so SDK-pinned
versions are used. No unrelated upgrades in the same phase.

### Forbidden
- Heavy UI frameworks: NativeBase, Tamagui, gluestack, UI Kitten, React Native Paper.
- Multiple icon libraries.
- CSS-in-JS runtimes that don't match the token system.
- Global state managers added "just in case."
- Data-fetching libraries without a documented, current need.

## 3. Design tokens — the single source of truth for values

All design values live in `src/theme/`. No hex code, font size, spacing value, radius,
duration, or easing exists anywhere else in the codebase.
src/theme/
colors.ts // design.md §3 palette
type.ts // design.md §4 typography scale
spacing.ts // design.md §5 spacing scale
radius.ts // design.md §5 radius scale
motion.ts // design.md §9 durations + easings + reduced-motion wrapper
index.ts // re-export


### Rules
- Every color in a component comes from `colors.ts`.
- Every spacing value comes from `spacing.ts`.
- Every radius comes from `radius.ts`.
- Every duration and easing comes from `motion.ts`.
- A lint rule or review check must flag hard-coded values. If no lint rule is feasible,
  a script under `scripts/check-tokens.*` that greps `app/` and `src/` for hex codes
  and numeric literals in style blocks is acceptable.
- If a value is genuinely missing, add it to the appropriate token file first, update
  `design.md` if the value is visual, then use it. Never inline it.

## 4. Component build order

Components are built in waves. No component in a later wave is started until every
component in the current wave is built, tested, and visually verified in a browser
or on a device.

### Wave 1 — Text and typography
- `Text` with role variants (`display-xl`, `display`, `title`, `h1`, `h2`, `h3`, `body`, `small`)
- `PairedTitle` — first word at weight 300, second at weight 700, per `design.md` §4

### Wave 2 — Interactive atoms
- `Button` (primary, secondary, ghost)
- `IconButton` (circular)
- `Input`
- `Chip`

### Wave 3 — Container primitives
- `Card` with surface variants: `paper`, `yellow`, `ink`, `mist`, `mint`, `coral`
- `Divider`
- `SectionHeader`
- `Skeleton`

### Wave 4 — Icons, indicators, accents
- `CategoryCircle` — 40px tinted circle with outline icon centered, per `design.md` §7
- `Starburst` — SVG accent in yellow / alert-red / paper variants, per `design.md` §7
- `ProgressBar` — track + fill with optional percentage pill, per `design.md` §7
- `PillBadge` — small black or white pill used inside cards

### Wave 5 — Chart primitives
See §7 for details.
- `ChartAxis`
- `ChartLegend`
- `Donut`
- `BarChart`
- `LineChart`
- `ChartTextEquivalent` — hidden accessibility-only text summary

### Wave 6 — Composite rows and states
- `TransactionRow` — per `design.md` §7
- `EmptyState`
- `ErrorState`
- `LoadingState` — skeleton composition, not a spinner
- `Avatar` — for Home header and Settings

### Wave 7 — Layout shells and navigation
- `ScreenScaffold` — safe area, background, optional header slot
- `DarkScreenScaffold` — same as above, ink background, paper text defaults
- `FormScaffold` — for auth and setup screens
- `PillNav` — floating pill navigation, 4 items, yellow selected state

### Wave 8 — Feature organisms
- `HeroSummaryCard` — Home: yellow card, donut, income/expenses legend
- `BudgetOverviewCard` — Home: mist card, progress bar, "Today" pill
- `ExpensesBarCard` — Budget: yellow card, 4-bar chart, hatched highlight bar, alert-red starburst
- `SpendTrendCard` — Budget: ink card, line chart with dashed projection, paper starburst
- `PositiveMessageCard` — mint card, one-sentence reassurance
- `InsightCard` — used on Insights
- `ReviewHeader` — paired title + starburst, used on Review Transactions

### Reuse rule
Before adding a component, check whether an existing one can be composed. New
components require a justification in the commit message or the AI_HANDOFF.md update.

## 5. Motion infrastructure

Motion is a first-class system, not a per-component decision.
src/lib/motion/
useMotion.ts // reads OS reduced-motion, exposes durations
usePressScale.ts // standard press: scale(0.97) at 120ms
useCardEntrance.ts // opacity + translateY, staggered 40ms per card, capped at 8
useConfirmPulse.ts // chip confirm: scale 1.0 → 1.06 → 1.0 over 180ms
useChartReveal.ts // interpolates chart values 0 → target over 240ms


### Rules
- No component calls `Animated` directly. All animation goes through helpers.
- No inline durations, no inline easings, no magic numbers.
- Reduced motion collapses every helper to instant or fade-only.
- Haptics are wrapped in `src/lib/haptics/` with `confirm()`, `select()`, `destroy()`
  helpers. Components call helpers, never `Haptics.impactAsync` directly.
- No animation longer than 300ms. No looping animations anywhere.

## 6. Screen implementation order

Screens are built strictly in the order below. A screen is not started until every
component it depends on exists and has passed its visual verification.

| # | Screen | Depends on |
|---|---|---|
| 1 | Welcome | `Text`, `Button`, `ScreenScaffold`, `Starburst` |
| 2 | Privacy | Welcome deps + `Card`, `Divider` |
| 3 | Country | Welcome deps + `Chip` |
| 4 | Sign up | `FormScaffold`, `Input`, `Button` |
| 5 | Sign in | Sign up deps |
| 6 | Demo entry | `Button`, `Card` |
| 7 | Home | `HeroSummaryCard`, `BudgetOverviewCard`, `TransactionRow`, `PillNav`, `DarkScreenScaffold`, `Avatar`, `IconButton` |
| 8 | Review Transactions | `ReviewHeader`, `TransactionRow`, `Chip`, `Button`, `DarkScreenScaffold` |
| 9 | Transaction Detail | `Card`, `Text`, `Button`, `CategoryCircle` |
| 10 | Activity | `TransactionRow`, `Chip` (filters), `ScreenScaffold` |
| 11 | Budget Setup | `FormScaffold`, `Input`, `Button` |
| 12 | Budget | `ExpensesBarCard`, `SpendTrendCard`, `PositiveMessageCard`, `ProgressBar`, `CategoryCircle` |
| 13 | Insights | `InsightCard`, `Starburst`, `Button` (Ask entry) |
| 14 | Ask Reconcile | `Card` (message bubbles), `Input`, `Button`, suggested prompts |
| 15 | Settings | `ScreenScaffold`, `Card` (rows), `Button` |
| 16 | Error / offline / not-found | `EmptyState`, `ErrorState`, `Button` |

### Per-screen delivery contract
Each screen is complete only when it has:
- real data bindings (per §8 — no mock data in production code),
- empty, loading, and error states,
- a reduced-motion fallback path,
- accessibility labels on every icon-only element,
- a screenshot captured and attached to `AI_HANDOFF.md`,
- passed the agent-as-user pass in §12.

## 7. Chart primitives — implementation notes

Charts are the visual signature of the app. They are built on `react-native-svg` and
are not improvised per screen.

### Shared infrastructure
- `HatchPattern` — an SVG `<Pattern>` (45° diagonal, 2px stroke, 4px gap, drawn in `ink`)
  used by `Donut` and `BarChart` for the highlighted element.
- `ChartAxis` — renders 3–4 labeled ticks on X or Y, using `line` at 40% opacity for
  the axis line and `small` type at 60% opacity for labels.
- `ChartLegend` — a two-column legend with a colored dot + label + value, split
  left/right.

### Donut
- Two arcs drawn as SVG paths.
- One arc solid `ink`. One arc filled with `HatchPattern`.
- Center: `small` "Total" label in muted ink above a `display` weight-800 amount.
- No shadows, no gradients, no 3D.
- Animate arc angles from 0 to target over 240ms ease-out on mount.

### BarChart
- Bars are `Rect` elements with 8–12px corner radius.
- Fill options per bar: solid `ink`, solid `signal-yellow`, or `signal-yellow` with
  `HatchPattern`.
- Exactly one bar in the group uses the hatched fill — the highlighted bar.
- Axis baseline: `line` at 40% opacity.
- Optional callout badge above the highlighted bar: `Starburst` in `alert-red` with
  white text.
- Animate bar heights from 0 to target over 240ms ease-out, staggered 40ms per bar.

### LineChart
- `Polyline` for the main segment in `signal-yellow` at 2.5–3px stroke.
- Filled `Circle` markers at data points, 8px diameter.
- Trailing (projected) segment rendered as a dashed `Line`.
- No area fill, or area fill at ≤10% opacity of `signal-yellow`.
- Optional corner `Starburst` in paper / white.
- Animate the line drawing by interpolating data points 0 → target over 240ms.

### Accessibility requirement
Every chart exposes a hidden `ChartTextEquivalent` component that lists the values in
plain text, wired into the parent's `accessibilityLabel`. A screen reader user must be
able to hear the data without seeing the chart.

## 8. Data binding rules

- Screens read from Supabase (RLS) via typed query helpers in `src/features/<domain>/`.
- Every feature folder contains: `queries.ts`, `mutations.ts`, `types.ts`.
- Screens never contain raw SQL, raw `fetch` calls, or direct Edge Function URLs.
- Mutations that write authoritative data go through Edge Functions.
- Mutations that touch only user-owned review state (category, note, exclude) may go
  directly to Supabase under RLS.
- No screen displays a value that isn't traceable to a query result or an Edge
  Function response.
- Mock data is permitted only in test fixtures, never in production code paths.

## 9. Navigation architecture

- Expo Router.
- Route groups: `(auth)`, `(onboarding)`, `(tabs)`, `(settings)`.
- `(tabs)` contains Home, Activity, Budget, Insights.
- Review and Transaction Detail are stack routes presented over the tab group.
- Ask Reconcile is a modal presented over Home or Insights.
- The floating pill nav is the visible navigation surface; the router stack is what
  actually moves between routes.
- Deep links are not part of the MVP.
- Back behavior on Android must respect the platform default.

## 10. Accessibility implementation

Non-negotiable, per `design.md` §10. Concretely, in code:

- Every interactive element has an explicit `accessibilityLabel`.
- Every icon-only button has `accessibilityRole="button"` and a label.
- Every chart has a text equivalent in its accessible label.
- Text scales with the OS; no fixed pixel heights on text containers.
- Contrast is verified against WCAG AA on every new color pairing, programmatically,
  not by eye. Signal yellow on paper is prohibited as a text color.
- Reduced motion is wired through `useMotion()` and honored by every animated component.
- Touch targets are verified at 44×44 minimum. A single test enumerates every
  pressable and asserts its measured size.
- Color is never the sole signal: transaction direction uses +/−, category uses
  icon + label + tint, budget state uses label + color.

## 11. Testing strategy

### Unit
- Theme tokens (colors, scales, radii exist and are unique).
- Currency formatting (integer minor units → display string, locale-aware).
- Date formatting.
- Motion helpers with reduced motion mocked on and off.
- Token-scan script (no hard-coded values outside `src/theme/`).

### Component
- Every atom and molecule renders with expected props and the correct
  `accessibilityLabel`.
- Every card surface variant renders.
- Every button variant renders in default, pressed, disabled states.
- Charts render with fixture data and produce a non-empty text equivalent.

### Screen
- Every screen renders with fixture data, empty data, and error data.
- Every screen renders with reduced motion forced on.

### Snapshot
- Snapshot tests are allowed only for stable visual primitives (atoms and charts).
- Whole-screen snapshots are not allowed — they break constantly and teach nothing.

### E2E
- Deferred to the phase that wires the demo loop end to end. See `SKILL_LEAN_DELIVERY.md`.

## 12. Agent-as-user verification

This section applies whenever the agent has browser automation or computer-use tools
(Playwright, Puppeteer, Playwright MCP, browser-use, Computer Use, CUA, or equivalent).

### Principle
A screen is not "done" because it compiles, because tests pass, or because snapshots
match. It is done when the agent has opened it in a real browser, interacted with it as
a user, compared what it sees against `design.md`, and fixed what it found.

### Required pass per screen
1. Open the deployed URL in a fresh browser session at 375×812 and 1280×800.
2. Navigate to the screen.
3. Screenshot the default state at both viewports.
4. Compare against the screen's section in `design.md` §8, the anti-pattern list in
   `design.md` §11, and the reference images for feel (not layout).
5. Interact with every interactive element: click, tap, type, submit, dismiss, toggle.
6. Trigger empty, loading, error, and success states.
7. Open the browser console and network tab. Record:
   - console errors and warnings,
   - failed network requests,
   - missing assets,
   - layout shift,
   - incorrect focus order,
   - anything that flickers, jumps, or doubles.
8. Visually check:
   - text is not clipped,
   - financial numbers are tabular and not shifting,
   - contrast is sufficient at both viewports,
   - touch targets are comfortable at mobile,
   - pill nav does not overlap content,
   - safe area insets are respected on iOS-like viewports,
   - the yellow hero is the single dominant accent on the screen,
   - no more than three accent colors are in use on the screen.
9. Log every issue found under one of six categories:
   `blocks-loop`, `visual-defect`, `accessibility`, `design.md-violation`,
   `anti-pattern`, `nice-to-fix-later`.
10. Fix everything in the first five categories within the current phase. Log the
    sixth category for later.
11. Re-deploy.
12. Repeat the pass on the fixed version.
13. The screen is complete only when the second pass is clean against `design.md`.

### If the agent has no browser tools
- Say so explicitly in the phase report.
- List every screen that could not be visually verified.
- Produce a manual visual verification checklist for the operator, matching §12 steps
  1–8.
- Mark the screen as "built, not visually verified" in `AI_HANDOFF.md`.
- The screen cannot be called done until a human or a browser-capable agent completes
  the pass.

### Forbidden
- Claiming a screen "matches design.md" without having looked at it in a browser.
- Approving based only on tests or snapshots.
- Modifying `design.md` to match the implementation instead of fixing the implementation.
- Hiding defects behind viewport- or user-agent-conditional rendering.
- Declaring "visually verified" if the browser tool reported render errors.

## 13. Deployment

- Every frontend phase ends with a deployable web build.
- Vercel auto-deploys from the production branch.
- Screenshots of new or changed screens go into `AI_HANDOFF.md` at each checkpoint.
- No server secrets in the built bundle. Verified by grepping `dist/` for the service
  role key prefix and any other server-only secret prefix before every push.
- The deployed URL is the only artifact that counts as "the frontend."

## 14. Definition of done (frontend)

A frontend phase is done when:

- [ ] Every screen in the phase's scope exists and renders.
- [ ] All values come from `src/theme/` — no hard-coded colors, sizes, radii, or durations.
- [ ] No UI framework was introduced.
- [ ] Every interactive element meets the accessibility rules in §10.
- [ ] Every screen has empty, loading, and error states.
- [ ] Motion respects reduced-motion.
- [ ] Every chart has a text equivalent.
- [ ] All unit, component, and screen tests pass.
- [ ] The token-scan script passes.
- [ ] The build is deployed and reachable.
- [ ] Screenshots of every new or changed screen are attached to `AI_HANDOFF.md`.
- [ ] The agent-as-user pass in §12 is complete (or the gap is documented).
- [ ] Every screen passes the checklist in `design.md` §15.
- [ ] The phase commit follows the pattern `feat: <short description of the phase>`.

## 15. Anti-patterns

These are the specific build-process failures this plan exists to prevent. They are
different from `design.md` §11, which is about visual output.

- Installing a UI framework to "save time."
- Hard-coding values that should be tokens.
- Calling `Animated` or `Haptics` directly from a component.
- Building a screen before its components exist.
- Writing screen code against mock data and calling it "wired."
- Skipping empty/loading/error states to hit a milestone.
- Treating `design.md` as a suggestion rather than a specification.
- Treating the reference images as a specification rather than a direction.
- Declaring a screen "done" without opening it in a browser.
- Changing `design.md` to match what was built instead of fixing what was built.
- Shipping a "verified" claim based on source inspection instead of interaction.
- Adding a new component when an existing one could have been composed.
- Adding a new dependency without justification.
- Adding motion that does not clarify a state change.
- Letting the agent-as-user pass be the last step instead of a gate before commit.

## 16. Learning protocol — turning this plan into `SKILL_FRONTEND_DESIGN.md`

This plan is designed to produce a skill. The skill is not a copy of this document. It
is the codified learning from having actually executed it.

### When to write the skill
Do not write `SKILL_FRONTEND_DESIGN.md` before the first screen has completed the full
cycle:
build → component tests → deploy → agent-as-user pass → fix → re-deploy
→ second agent-as-user pass → clean


Writing the skill earlier is theory. The skill must be earned.

### Version 1
After the first screen completes the full cycle, write `SKILL_FRONTEND_DESIGN.md` v1
with the sections listed below. Version 1 is expected to be thin and partly wrong.

### Version 2
After the first frontend phase (a full set of screens) is deployed and reviewed by the
operator, rewrite `SKILL_FRONTEND_DESIGN.md` v2. This version reflects what actually
worked, what was tried and abandoned, and which rules from this plan turned out to
matter.

### Required sections in `SKILL_FRONTEND_DESIGN.md`
1. **Core principle** — the frontend is a product surface, and it gets the same rigor
   as the data model.
2. **Reading order** — what the agent reads before writing any frontend code, and why.
3. **Component-first workflow** — the rule that no screen is built before its
   components exist, and no token is invented.
4. **Reference-driven decisions** — the rule that the reference is direction, not
   specification, and `design.md` wins over both.
5. **Motion as first-class** — the rule that motion is a system, not a per-component
   decision.
6. **Visual validation gate** — the rule that a screen is not done until it has been
   rendered, opened in a browser, and used as a user.
7. **Agent-as-user verification protocol** — the concrete pass from §12 of this plan,
   restated as a rule that applies to every project, not just Reconcile.
8. **Deployment gate** — the rule that the deployed URL is the only artifact that
   counts.
9. **Anti-patterns actually observed** — the list from §15, pruned to the ones that
   actually occurred, plus any new ones that surfaced.
10. **Evolution log** — dated entries, one per phase, recording what worked, what did
    not, what the agent-as-user pass caught that tests did not, and what the rule
    changes should be.
11. **Adoption instructions** — how to apply this skill to a new project.

### Evolution log format
YYYY-MM-DD — <project> — <phase or screen>
Worked:

Didn't work:

Agent-as-user pass caught (that tests did not):

design.md gaps discovered:

Rule changes proposed:

Rules validated:

Rules superseded:


### What not to include in the skill
- Reconcile-specific hex codes, spacing values, or screen names.
- Long lists that reproduce this plan.
- Anything the agent has not actually observed. Rules must be earned or explicitly
  marked as inherited from this plan pending validation.

### The skill is a living document
After every subsequent frontend phase, the agent adds a dated entry to the evolution
log and proposes rule changes. A rule that was repeatedly ignored or repeatedly caused
problems is a wrong rule and must be rewritten, not restated. A rule that was
repeatedly followed without incident is validated and marked as such. History is
preserved — superseded rules are marked, not deleted.

## 17. How to use this document

- **Before any frontend work**, read this file and `design.md`.
- **When a component or screen decision isn't covered**, extend the appropriate file
  first, then build.
- **When this file conflicts with `design.md` on a visual matter**, `design.md` wins.
- **When this file conflicts with `ARCHITECTURE.md` on a stack matter**,
  `ARCHITECTURE.md` wins.
- **When this file conflicts with `SKILL_LEAN_DELIVERY.md` on deployment or
  verification**, `SKILL_LEAN_DELIVERY.md` wins.
- **When this file itself is wrong**, change the file first, then change the code.
  Never the reverse.

This is a source of truth for how the frontend is built. Treat it like one.