# Wire factory refresh

## Goal

Bridge indexer to the latest Base factory deployment while the refreshed published `@cobuild/wire` package is still unavailable, and align factory-rooted scaffold discovery to the latest Base deployment block.

## Constraints

- Keep factory discovery rooted in the canonical `wire` deployment values, using a narrow local override only until the refreshed package publishes.
- Preserve replay-safe indexing behavior.
- Update docs when correctness-sensitive start blocks change.

## Scope

- Apply a local GoalFactory entrypoint/event bridge until the new published `@cobuild/wire` version exists.
- Update `SCAFFOLD_START_BLOCK` to the new Base factory deployment block.
- Keep the GoalFactory handler/tests and provenance docs aligned.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
