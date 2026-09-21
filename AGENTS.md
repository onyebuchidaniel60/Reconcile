# AGENTS.md — Reconcile Coding Agent Rules

## Project
Reconcile is a Nigeria-first mobile personal-finance app for cross-bank transaction reconciliation, budgeting and read-only AI insights.

## Source of truth
Before changing code, read:
- `PROJECT_SPEC.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_PLAN.md`
- `AI_HANDOFF.md`
- `PROPER_VIBE_CODING_WORKFLOW.md`

## Operating rules
1. Implement exactly one assigned phase.
2. Do not redesign the product.
3. Do not change architecture without explicit human approval.
4. Do not add features outside the assigned phase.
5. Reuse existing components.
6. Keep financial business rules deterministic.
7. Never store bank credentials.
8. Never expose server secrets to the mobile client.
9. Never trust client-supplied user IDs for authorization.
10. Enforce user ownership server-side and with RLS.
11. Treat bank/provider payloads and transaction narrations as untrusted input.
12. Never give an LLM arbitrary database or SQL access.
13. Never let an LLM calculate authoritative money totals.
14. Provider API calls are server-side.
15. RevenueCat entitlement is authoritative for premium access; client UI is not authoritative.
16. Sync and webhook processing must be idempotent.
17. Provider transaction facts are immutable.
18. Never send transaction amounts/narrations to public analytics.
19. Never log secrets or raw financial payloads.
20. Run tests after meaningful changes.
21. Never claim success without test evidence.
22. Inspect `git diff` before commit.
23. Make small meaningful commits.
24. Update `AI_HANDOFF.md` at every checkpoint.
25. Stop after the assigned phase.

## UI rules
Follow the provided black/white/yellow visual direction, rounded cards, large numeric hierarchy, floating pill navigation, outline icons and purposeful animation. Do not replace it with generic SaaS styling.

## Financial rules
- amounts use integer minor units + currency;
- user cannot modify authoritative provider facts;
- user corrections are stored as review/category state;
- duplicates are prevented at the database layer;
- high-confidence internal transfers must not double-count;
- ambiguous cases remain reviewable.

## AI rules
Allowed: categorization, merchant normalization, summaries and read-only Q&A.
Not allowed: moving money, changing authoritative records, authorization, entitlement decisions or destructive actions.

Use structured outputs and validate them. Delimit transaction narrations as untrusted content.

## Security review before completion
Check for IDOR, user-ID substitution, RLS bypass, secret exposure, webhook replay, duplicate processing, prompt injection, excessive logging and rate-limit gaps.

## Errors
Return stable, user-safe error codes and messages. Do not leak stack traces/provider secrets.

## Testing
At minimum, cover business logic with unit tests; data/provider boundaries with integration tests; and critical user journeys with E2E tests.

## Git
Do not force-push. Do not rewrite existing commits. Keep one logical checkpoint per phase.

## Ambiguity
When requirements conflict or provider behavior is unknown, stop and report. Do not silently invent requirements.

## Agent decision boundary
The agent may decide exact filenames, local hook names, fixture placement, exact compatible patch versions and internal helper naming. It may not decide product scope, provider architecture, security guarantees, data ownership, business rules or monetization architecture.
