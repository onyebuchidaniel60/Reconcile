# SKILL — Lean Demo-First Delivery

**Type:** Delivery-strategy skill (overlay).
**Applies to:** Any software project that has a product spec, architecture, or design reference.
**Does NOT replace:** PROJECT_SPEC.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, AGENTS.md,
AI_HANDOFF.md, or the project's source-of-truth docs.
**Complements:** PROPER_VIBE_CODING_WORKFLOW.md (discipline) — this skill governs sequencing.

---

## 1. Core principle

Ship the smallest **real, working, deployed** version of the core functionality first.
Then iterate toward the full product one slice at a time, on top of that foundation.

A demo that only runs locally is not a demo.
A mockup is not a demo.
A screenshot is not a demo.
A demo is: real auth, real data, real business logic, at a URL anyone can open,
that the agent has **actually used as a user** before declaring it done.

## 2. The delivery pattern

Every project follows this shape unless there is a documented reason to deviate.

### Stage 0 — Problem and outcome (docs only, no code)
- What problem does this solve?
- Who is it for?
- What does success look like?
- What are the non-negotiables (security, data model, money handling, privacy)?
- What is the full product (spec, architecture, plan, design)?
- Full product docs are written, reviewed, and locked before any code.

Output: source-of-truth docs.

### Stage 1 — Core demo (vertical slice)
- Identify the smallest end-to-end loop that proves the product's core value.
- Implement it for real: real auth, real DB, real business logic, real UI.
- No design-system polish. No advanced features. No AI if it isn't core.
- Deploy it immediately, at a public URL, on the day the slice is done.
- Anything that requires external credentials the project doesn't yet have is stubbed
  behind a provider interface, not faked in the UI.
- Everything built must be a valid foundation for the full product — no throwaway code.

Output: deployed working demo, real data, real loop.

### Stage 2 — Agent-as-user review, then human review
Two reviews, in this order.

**2a. Agent-as-user review (required when the agent has browser/computer-use tools).**
The agent must:
- open the deployed URL in a real browser,
- act like a first-time user: land, read, sign up, click, complete the loop,
- take screenshots at each meaningful state,
- observe what actually happens versus what was intended,
- log every mismatch, broken flow, visual defect, confusing interaction, dead end,
  slow state, console error, and network failure,
- fix what it can fix,
- re-deploy,
- repeat the same user pass on the fixed version,
- record the whole cycle in the evolution log.

A slice is not complete until the agent has done this at least once and the second pass
is clean against the acceptance criteria.

**2b. Human review.**
- Anyone reviews the deployed demo. Real usage, not screenshots.
- Capture: what works, what feels wrong, what's missing, what was harder than expected.
- Compare the demo against the full product docs.
- Update the plan if reality diverges from the docs (never silently — always documented).

Output: reviewed demo, fix pass, updated plan, updated skill evolution log.

### Stage 3 — Iterate toward the full product
- Build on top of the demo's foundation, one slice at a time.
- Each slice follows PROPER_VIBE_CODING_WORKFLOW.md: implement → test → inspect → commit → stop.
- Each slice is deployed so it can be seen.
- Each slice is used as a user by the agent before being declared done.
- Never restart from scratch. Never rewrite what works to match a doc. Fix forward.
- The full product is what the docs describe. The demo is the on-ramp.

Output: full product, built in visible increments.

### Stage 4 — Full product, frontend-first
For the full build (not the demo):
1. **Frontend first**, per the design file, frontend implementation plan, and visual references.
2. Deploy the frontend at a public URL before any backend work begins.
3. The agent uses the deployed frontend as a user and fixes what it finds.
4. Human reviews the deployed frontend.
5. Only then, build the backend to serve the already-approved frontend.
6. The frontend is never hidden behind backend work.

Output: deployed frontend, then backend layered underneath it.

## 3. Deployment rules

- Deployment is a first-class deliverable, not an afterthought.
- Every slice ends with a deployed, reachable URL.
- If the project uses GitHub-connected auto-deploy (Vercel, Netlify, Cloudflare Pages),
  the agent's job is to make the repo deployable and push it — not to run the deploy itself.
- No secrets in the client bundle. Ever. Verify with a bundle grep before declaring done.
- No local-only demo is accepted as complete.
- The deployed URL is verified by the agent in a browser, not just assumed to work.

## 4. Agent-as-user verification

This section applies whenever the agent has browser automation or computer-use tools
(Playwright, Puppeteer, Playwright MCP, browser-use, Computer Use, CUA, or equivalent).

### 4.1 Principle

The agent must **use the product like a user** before declaring any slice complete.
Tests passing is not enough. A deployed URL returning 200 is not enough.
The agent must actually walk the loop.

### 4.2 Required pass

For every slice, the agent performs a full user pass on the deployed URL:

1. Open the URL in a fresh browser session (no cached auth, no stored state).
2. Capture a screenshot of the landing state.
3. Complete the slice's primary journey end to end, using only the UI:
   - click, type, submit, navigate, scroll, swipe, tap;
   - never bypass the UI by calling APIs directly for this pass.
4. Capture a screenshot at each meaningful state transition.
5. Open the browser console and network tab. Record:
   - any uncaught error,
   - any 4xx/5xx response,
   - any failed asset load,
   - any layout shift or flicker,
   - any unexpected redirect,
   - any slow (>2s) action.
6. Note every mismatch between what the design.md / spec says should happen
   and what actually happens.

### 4.3 Fix pass

- Fix every issue the agent can fix inside the slice scope.
- Do not expand scope to fix issues that belong to a later slice; log them instead.
- Re-deploy.
- Repeat section 4.2 on the fixed version.
- The slice is complete only when the second pass is clean against the slice's
  acceptance criteria.

### 4.4 What the agent must never do

- Never claim the app works without having used it.
- Never inspect only the source code and assume the UI behaves.
- Never write "verified" next to a behavior it did not observe.
- Never skip the second pass after fixes.
- Never fix UI issues by hiding them behind conditional rendering for the agent's
  session type or user agent.

### 4.5 When the agent does not have browser tools

If the agent has no browser/computer-use capability:

- it must say so explicitly in its report,
- it must list exactly which user journeys could not be verified,
- it must produce a manual verification checklist for the operator,
- the slice is marked "deployed, unverified by agent" and cannot be called done
  until a human or a browser-capable agent performs the pass.

## 5. Agent operating rules under this skill

1. Never start Stage 1 without Stage 0 docs complete.
2. Never build Stage 3 without Stage 1 deployed and Stage 2 review done.
3. Never add polish (design system, motion, advanced charts) to the demo unless the
   project's core value depends on it.
4. Never fake UI with hardcoded data. If data is synthetic, label it synthetic and route
   it through the real pipeline.
5. Never defer deployment. If the deploy target isn't ready, stop and report — do not
   build more code that cannot be seen.
6. Never claim a slice is done without:
   - tests passing,
   - the diff inspected,
   - the deployed URL reachable,
   - the agent having used the app as a user (or documented the gap),
   - the loop usable by a real person.
7. Never let the size of the docs determine the size of a slice. Slices are sized by what
   a person can meaningfully review in one sitting.
8. Never silently change the plan. If reality diverges, document the divergence and stop.
9. Prefer a working, ugly thing over a beautiful, broken thing.
10. Prefer a deployed, rough thing over a local, polished thing.

## 6. Evidence requirements

Every slice must produce, at minimum:

- commit hash(es),
- raw test/lint/typecheck output,
- diff inspection summary,
- deployed URL,
- agent-as-user pass report: screenshots, console/network findings, list of issues found,
  list of issues fixed, list of issues deferred,
- a one-paragraph "what a user can do right now" description,
- a "what is stubbed, mocked, or deferred" list,
- confirmation the project's source-of-truth docs were not modified (unless the slice is
  explicitly a docs-update slice).

## 7. Anti-patterns this skill exists to prevent

- Horizontal layering: building "all auth" then "all backend" then "all frontend" then
  "all design" and having nothing to show for weeks.
- Mockup drift: building screens with fake data and calling it a demo.
- Backend-first full builds where nothing is visible until late.
- Polishing the demo before validating the loop.
- Letting the full product's complexity leak into the demo.
- Letting the demo's shortcuts leak into the full product.
- Building features that cannot be deployed because credentials don't exist yet.
- Big-bang integrations of external services (payments, banking, AI) instead of
  provider-interface scaffolding + one real provider at a time.
- Declaring a slice done without having opened the deployed URL.
- "Verified" claims based on reading source code instead of using the app.

## 8. Skill evolution log

This skill is expected to change. The agent updates it as follows:

- After every Stage 2 review, add a dated entry to this log.
- Each entry records: what worked, what didn't, what the skill should say instead.
- Include what the agent-as-user pass caught that tests did not.
- If a rule was repeatedly ignored or repeatedly caused problems, the rule is wrong —
  rewrite it, don't just repeat it.
- If a rule was repeatedly followed and never caused problems, note it as validated.
- Do not delete history. Add new entries; mark old rules as superseded if needed.

### Format

YYYY-MM-DD — <project name> — Stage 2 review

Worked:

Didn't work:

Agent-as-user pass caught (that tests did not):

Rule changes proposed:

Rules validated:

Rules superseded:


### Log

### 2026-09-24 — Reconcile — core demo (Stage 2 review)

Worked:
- Smallest real end-to-end loop first (auth → demo → sync → review → budget → insights → ask), deployed from the first slice.
- Provider interface with a deterministic demo provider behind it: zero external credentials, real pipeline, synthetic data labeled everywhere.
- Deterministic-first (no LLM): every number unit-testable, every answer reproducible.
- RLS-first schema plus live integration tests: caught four real bugs (bad suggestion category, snake_case misread, missing user_id default, silent review-batch failure).
- Pure shared modules imported by Deno functions, Metro, and jest: one source of truth, no logic duplication.
- Committed `.env.production` (public values only) after Vercel env injection failed: deterministic builds.
- No force-push through operator divergence: merge commit, conflicts resolved explicitly.

Didn't work:
- Assuming server-side green means browser green: incomplete CORS preflight killed every browser Edge Function call while all tests passed.
- Assuming env-file presence means values in bundle: missing babel-preset-expo plus whole-object `process.env` reads left the web bundle with empty env.
- jest-expo replaces global fetch with broken stubs: supabase-js needed an explicit node:http fetch shim in live tests.
- A `/rest/v1/`-suffixed project URL in local config broke all client calls: added a fail-fast URL guard.
- Vercel enables SSO Deployment Protection by default: first deployment served a login wall.

Agent-as-user pass caught (that tests did not):
- The CORS preflight bug and the babel-preset-expo/env-inlining bug, both caught by the operator in a browser, not by any test. The agent had no browser tools, so only the operator's pass could see them.
- Bug class tests cannot catch: browser-runtime behaviors (CORS preflight negotiation, bundler transform output) that execute outside every unit/integration harness. A green suite plus a built bundle is not proof the app works in a browser; only a browser pass, or bundle-content assertions (env grep, route render), close that gap.

Rule changes proposed:
- Every Edge Function must ship with a CORS helper that is exercised by an OPTIONS preflight test before deployment.
- Every client-facing EXPO_PUBLIC_* variable must be verified inside the exported web bundle before any deployment is called done.
- Check Deployment Protection state on the first deploy of every new Vercel project.

Rules validated:
- Ship the smallest real slice, then iterate; deploy every slice; no mock data in UI paths; no secrets in the client bundle (grep gate held, zero matches every time); never claim a check passed without running it; stop-and-report at failed gates instead of pushing through.
- Stage 0 docs before code: the slices never had to renegotiate scope.

Rules superseded:
- None.

## 9. Adopting this skill in a new project

1. Copy this file to the new repo's root.
2. Reference it in AGENTS.md or the project's agent rules.
3. Complete Stage 0 (source-of-truth docs) before any code.
4. When Stage 1 starts, tell the agent: "follow SKILL_LEAN_DELIVERY.md for sequencing."
5. Confirm whether the agent has browser/computer-use tools; note it in the project docs.
6. Do not modify this file's principles mid-project. Only update section 8 after Stage 2.

## 10. Relationship to other workflows

- PROPER_VIBE_CODING_WORKFLOW.md governs **how** each slice is executed (discipline).
- SKILL_LEAN_DELIVERY.md governs **what** is built first, **when** it is deployed,
  and **how** it is verified as a user.
- The project's source-of-truth docs govern **what the final product is**.
- SKILL_FRONTEND_DESIGN.md governs the frontend craft and visual verification.
- These layers must not contradict each other. If they do, stop and reconcile.