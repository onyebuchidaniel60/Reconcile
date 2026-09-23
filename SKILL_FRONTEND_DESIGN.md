# SKILL — Frontend Design and Build

**Type:** Craft skill (overlay).
**Applies to:** Frontend implementation in any project that has a design.md and a frontend
implementation plan.
**Does NOT replace:** design.md, frontend-implementation-plan.md, PROJECT_SPEC.md,
ARCHITECTURE.md, or AGENTS.md.
**Complements:** SKILL_LEAN_DELIVERY.md (sequencing), PROPER_VIBE_CODING_WORKFLOW.md (discipline).

---

## 1. Core principle

The frontend is not a coat of paint on top of the backend.
The frontend is a product surface. It gets the same rigor as the data model.

Design decisions are made before code, in design.md.
Build decisions are made before code, in frontend-implementation-plan.md.
The agent's job is to execute both faithfully, not to reinterpret them.

A screen is not "done" because it compiles. It is done when it has been rendered,
opened in a browser, used as a user, and confirmed against design.md.

## 2. Reading order before writing any frontend code

1. design.md — the visual and interaction blueprint.
2. frontend-implementation-plan.md — the build sequence and rules.
3. design/reference.png (and design/README.md) — direction, not specification.
4. PROJECT_SPEC.md — what the product is.
5. ARCHITECTURE.md — how the system is shaped.
6. SKILL_LEAN_DELIVERY.md — when to deploy and what counts as done.

Never write frontend code before reading all six.

## 3. Component-first workflow

- No screen is built before its components exist.
- No component is built before its tokens exist.
- No token is invented — all tokens come from design.md and live in `src/theme/`.
- No hex code, spacing value, radius, or duration appears outside `src/theme/`.
- Every component ships with: prop types, accessibility labels, empty/loading/error behavior,
  reduced-motion fallback, and a snapshot or unit test.

## 4. Reference-driven decisions

When building a screen, the flow is:

1. Read the screen's section in design.md.
2. Look at design/reference.png for feel, not layout.
3. Compose from existing components. Do not create a new component unless design.md or the
   implementation plan calls for one.
4. Verify the screen against the anti-pattern lists in both design.md §11 and
   frontend-implementation-plan.md §12.
5. If the screen requires a design decision not covered by design.md, STOP and ask.
   Do not invent visual language.

## 5. Motion is first-class

- Motion comes from `src/theme/motion.ts`. No inline durations, easings, or springs.
- Every animation must have a stated purpose: orient, confirm, or explain.
- Reduced motion is not optional. Every animated component degrades gracefully.
- Haptics come from one helper. No haptic on scroll or passive state.
- If motion is added without a purpose, remove it.

## 6. Visual validation gate

A screen is not complete until:

- it renders with real data from the real pipeline,
- it renders in empty, loading, and error states,
- it renders correctly with large OS font settings,
- it renders correctly with reduced motion enabled,
- every interactive element meets the 44×44 minimum,
- every icon-only button has an accessibility label,
- every color pairing passes WCAG AA,
- a screenshot is captured and attached to the checkpoint,
- it has been compared against design.md and the reference image,
- it has been opened in a browser and used as a user (see section 7).

If any of the above is not satisfied, the screen is not done.

## 7. Agent-as-user frontend verification

This section applies whenever the agent has browser automation or computer-use tools.

### 7.1 Principle

The agent must look at the actual rendered screen and interact with it before declaring
it done. Source-code inspection is not visual inspection.
A passing snapshot is not a passing screen.

### 7.2 Required visual pass

For every screen and every meaningful visual change, the agent:

1. Opens the deployed URL in a real browser at a mobile viewport (375×812 minimum) and
   a desktop viewport (1280×800 minimum).
2. Navigates to the screen.
3. Captures screenshots at both viewports.
4. Compares the screenshots against:
   - the screen's section in design.md,
   - the anti-pattern list in design.md §11,
   - the anti-pattern list in frontend-implementation-plan.md §12,
   - the reference image (for feel only).
5. Interacts with every interactive element:
   - taps/clicks buttons, chips, nav items, links, inputs;
   - enters invalid input to verify error states;
   - enters valid input to verify success states;
   - triggers empty states (fresh account) and populated states;
   - triggers loading states (throttled network if possible) and error states
     (offline if possible).
6. Opens the browser console and network tab. Records:
   - console errors and warnings,
   - failed network requests,
   - missing assets,
   - layout shift,
   - incorrect focus order,
   - anything that flickers, jumps, or doubles.
7. Checks the following visually on the rendered screen:
   - text is not clipped or truncated incorrectly,
   - financial numbers are tabular and not shifting,
   - contrast is sufficient at both viewports,
   - touch targets are comfortably sized on mobile,
   - pill navigation does not overlap content,
   - safe area insets are respected on iOS-like viewports,
   - the yellow hero is the single dominant accent on the screen,
   - no more than three accent colors are in use on the screen.
8. Logs every issue found, categorized as:
   - blocks the loop,
   - visual defect,
   - accessibility issue,
   - design.md violation,
   - anti-pattern,
   - nice to fix later.

### 7.3 Fix pass

- Fix blockers and design.md violations inside the current phase.
- Log non-blocking defects for later phases instead of expanding scope.
- Re-deploy.
- Re-run section 7.2 on the fixed version.
- The screen is complete only when the second pass is clean against design.md.

### 7.4 What the agent must never do

- Never claim a screen "matches design.md" without having looked at it in a browser.
- Never approve a screen based only on tests or snapshots.
- Never modify the design to match the buggy implementation. Fix the implementation.
- Never hide a visual defect behind a conditional that only affects the agent's viewport
  or user agent.
- Never declare "visually verified" if the browser tool reported render errors.

### 7.5 When the agent does not have browser tools

If the agent has no browser/computer-use capability:

- it must say so explicitly in its report,
- it must list every screen it could not visually verify,
- it must produce a manual visual verification checklist for the operator,
- the screen is marked "built, not visually verified" and cannot be called done
  until a human or a browser-capable agent performs the pass.

## 8. Deployment gate

- Every frontend phase ends with a deployable build.
- The deployed URL is part of the phase output.
- The phase is not complete until the URL is reachable and the new screens are visible.
- Screenshots of the deployed result go into AI_HANDOFF.md.
- The deployed URL is the only artifact that counts as "the frontend."

## 9. Anti-patterns this skill exists to prevent

- Installing a UI framework to "save time".
- Copying layouts directly from the reference image.
- Hard-coding values that should be tokens.
- Adding animation for decoration.
- Building a screen before its components.
- Shipping mock data into production code.
- Centering financial numbers.
- Using red for errors.
- Adding charts without text equivalents.
- Skipping empty/error states.
- Treating the design as a suggestion rather than a specification.
- Treating the reference image as a specification rather than a direction.
- Declaring a screen "matches design.md" without having opened it in a browser.
- Adjusting design.md to match what was built instead of fixing what was built.

## 10. Evolution log

Update after every frontend phase review.

YYYY-MM-DD — <project> — <phase>
Worked:

Didn't work:

Agent-as-user visual pass caught (that tests did not):

Design.md gaps discovered:

Rule changes proposed:

Rules validated:

Rules superseded:

(empty — first entry after the first frontend phase review)

## 11. Adoption

1. Copy this file to the repo root.
2. Reference it in AGENTS.md under UI rules.
3. Confirm whether the agent has browser/computer-use tools; note it in the project docs.
4. Do not modify its principles mid-project. Update only section 10 after a phase review.

The AGENTS.md line to add

Under UI rules, add this single line:

Follow design.md, frontend-implementation-plan.md, and SKILL_FRONTEND_DESIGN.md for all frontend work, including agent-as-user browser verification.

Under Operating rules, add this single line:

Follow SKILL_LEAN_DELIVERY.md for delivery sequencing, deployment, and agent-as-user verification.

Nothing else in AGENTS.md changes.