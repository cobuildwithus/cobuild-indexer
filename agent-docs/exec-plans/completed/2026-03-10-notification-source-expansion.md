# 2026-03-10 Notification Source Expansion

## Goal

Complete the `indexer` side of the notification hard cutover by emitting the remaining high-signal treasury, resolver, juror reward, and reminder flows on the canonical reason names while preserving the downstream single-inbox delivery model.

## Scope

- Add source notifications for the canonical shared reasons:
  - `goal_success_assertion_finalize_failed`
  - `budget_success_assertion_finalize_failed`
  - resolver lifecycle reasons backed by current resolver event coverage
  - `juror_reward_claimable`
  - `juror_reward_claimed`
- Add schedule-backed reminder rows for the canonical reminder reasons:
  - request challenge windows
  - juror vote deadlines
  - juror reveal deadlines
  - success-assertion reassert grace endings
- Preserve recipient resolution and payload refs needed by downstream routing.
- Emit only the canonical reason names expected by downstream `wire`/consumer surfaces; do not preserve legacy alias spellings.
- Update tests and event-handler docs for any newly emitted reasons/handlers.

## Out Of Scope

- Downstream presenter copy or inbox SQL/rendering changes in other repos.
- Any `underwriter_withdrawal_prep_completed` or `withdrawal_ready` additions.
- Reintroducing compatibility-only duplicate reasons or legacy alias spellings.

## Constraints

- Keep handlers replay-safe and deterministic.
- Treat this as a hard cutover onto canonical emitted reasons; do not document or preserve compatibility-only alias paths.
- Prefer PK-addressable lookups and existing projection tables over ad hoc scans.
- Avoid `context.db.sql`.

## Risks / Open Points

- The currently indexed `UMATreasurySuccessResolver` ABI surface is the fake-resolver event surface (`AssertionPrepared`, `AssertionDisputed`, `AssertionSettled`, `TreasurySuccessResolved`), so resolver lifecycle notifications must align to that emitted shape.
- Request challenge-window reminders may require deterministic deadline recovery beyond the current `tcr_request` fields; if so, add explicit indexed state or a pinned deterministic read instead of consumer-side inference.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`

## Task Outline

1. Extend shared notification helpers for the remaining canonical reasons, schedule payloads, and reusable reminder-window helpers.
2. Add treasury finalize-failed and resolver lifecycle handlers with deterministic audience resolution on canonical reason names.
3. Add juror reward claimable/claimed emission and the needed dispute/request context stitching without alias duplicates.
4. Add schedule-backed reminder emission and regression coverage for dedupe/reopen/invalidation semantics using the canonical reminder names only.
5. Update docs and run full verification plus completion workflow so downstream stale-emit detection can rely on the hard cutover.
Status: completed
Updated: 2026-03-10
Completed: 2026-03-10
