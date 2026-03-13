# Wire factory refresh

## Goal

Align indexer scaffold discovery to published `@cobuild/wire@0.3.1` and the rerun Base factory deployment block.

## Constraints

- Keep factory discovery rooted in the canonical published `wire` deployment values.
- Preserve replay-safe indexing behavior.
- Update docs when correctness-sensitive start blocks change.

## Scope

- Remove the temporary local GoalFactory/BudgetTCRFactory bridge now that the published `@cobuild/wire` package includes the rerun addresses and event shapes.
- Update `SCAFFOLD_START_BLOCK` to `43_290_000`.
- Keep the GoalFactory handler/tests and provenance docs aligned.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
