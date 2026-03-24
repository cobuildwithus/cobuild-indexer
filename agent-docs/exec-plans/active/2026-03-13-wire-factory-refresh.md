# Wire factory refresh

## Goal

Align indexer scaffold discovery and tests to the published `@cobuild/wire@0.3.5` factory surface and the canonical Base scaffold start-block export.

## Constraints

- Keep factory discovery rooted in the canonical published `wire` deployment values.
- Preserve replay-safe indexing behavior.
- Update docs when correctness-sensitive start blocks change.

## Scope

- Consume the published `@cobuild/wire@0.3.5` dependency.
- Keep scaffold discovery rooted in the published GoalFactory and BudgetTCRFactory addresses.
- Keep GoalFactory handler/tests and provenance docs aligned with `BASE_SCAFFOLD_START_BLOCK = 43_315_703`.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
