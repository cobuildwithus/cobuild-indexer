# Wire factory refresh

## Goal

Align indexer scaffold discovery to the published `@cobuild/wire` factory surface and the canonical Base scaffold start-block export.

## Constraints

- Keep factory discovery rooted in the canonical published `wire` deployment values.
- Preserve replay-safe indexing behavior.
- Update docs when correctness-sensitive start blocks change.

## Scope

- Remove the temporary local GoalFactory/BudgetTCRFactory bridge now that the published `@cobuild/wire` package includes the rerun addresses and event shapes.
- Replace the local `SCAFFOLD_START_BLOCK` constant with the published `BASE_SCAFFOLD_START_BLOCK` export.
- Keep the GoalFactory handler/tests and provenance docs aligned.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
