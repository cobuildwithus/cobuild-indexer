# 2026-03-10 Underwriter And Juror Notifications

## Goal

Extend protocol notifications beyond goal stakeholders by indexing current budget underwriters plus juror dispute state, including scheduled juror phase-open notifications.

## Scope

- Add explicit budget-underwriter audience state keyed by budget treasury/account.
- Widen existing goal and budget-governance fanout to include budget underwriters where relevant.
- Add arbitrator reverse lookup plus dispute/member/receipt projections.
- Add deterministic scheduled protocol notification rows for juror voting/reveal phase openings.
- Keep protocol notification semantics in the indexer and inbox materialization in downstream workers.

## Constraints

- Keep recipient resolution deterministic and replay-safe.
- Do not depend on current-state scans at delivery time for underwriter or juror targeting.
- Avoid `context.db.sql`; use PK-addressable projections.
- Keep direct requester/challenger identity work separate from the user’s in-progress protocol cutover.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
