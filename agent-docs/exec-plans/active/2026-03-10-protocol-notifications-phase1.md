# 2026-03-10 Protocol Notifications Phase 1

## Goal

Ship the first end-to-end protocol notification path without coupling user inbox writes to deterministic indexer handler transactions.

## Scope

- Add deterministic lookup/audience tables needed for phase-1 notification fanout.
- Add immutable `protocol_notification_outbox` rows in the indexer schema.
- Emit outbox rows for:
  - `budget_proposed`
  - `budget_proposal_challenged`
  - `budget_accepted`
  - `budget_activated`
  - `budget_removal_requested`
  - `budget_removal_challenged`
  - `budget_removal_accepted`
  - `budget_removed`
  - `goal_active`
  - `goal_succeeded`
  - `goal_expired`
- Keep phase 1 append-only; skip scheduled/stateful notifications, operator alerts, and backfill logic.

## Constraints

- Recipient resolution must stay replay-safe and deterministic.
- Do not write directly into `cobuild.notifications` from indexer handlers.
- Prefer PK-addressable lookup tables over `context.db.sql`.
- Phase 1 audiences are goal stakeholders, goal owner, and request actors.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
