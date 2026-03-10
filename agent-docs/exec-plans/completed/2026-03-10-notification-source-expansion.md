# 2026-03-10 Notification Source Expansion

## Goal

Expand source-emitted protocol notifications in `indexer` for the remaining high-signal treasury, resolver, juror reward, and reminder flows without changing the downstream single-inbox delivery model.

## Scope

- Add source notifications for:
  - `goal_success_assertion_finalize_failed`
  - `budget_success_assertion_finalize_failed`
  - resolver lifecycle reasons backed by current resolver event coverage
  - `juror_reward_claimable`
  - `juror_reward_claimed`
- Add schedule-backed reminder rows for:
  - request challenge windows
  - juror vote deadlines
  - juror reveal deadlines
  - success-assertion reassert grace endings
- Preserve recipient resolution and payload refs needed by downstream routing.
- Update tests and event-handler docs for any newly emitted reasons/handlers.

## Out Of Scope

- Downstream presenter copy or inbox SQL/rendering changes in other repos.
- Any `underwriter_withdrawal_prep_completed` or `withdrawal_ready` additions.
- Removing or renaming existing notification reasons.

## Constraints

- Keep handlers replay-safe and deterministic.
- Stay additive; do not remove current notification paths.
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

1. Extend shared notification helpers for new reasons, schedule payloads, and any reusable reminder-window helpers.
2. Add treasury finalize-failed and resolver lifecycle handlers with deterministic audience resolution.
3. Add juror reward claimable/claimed emission and any needed dispute/request context stitching.
4. Add schedule-backed reminder emission and regression coverage for dedupe/reopen/invalidation semantics.
5. Update docs and run full verification plus completion workflow.
Status: completed
Updated: 2026-03-10
Completed: 2026-03-10
