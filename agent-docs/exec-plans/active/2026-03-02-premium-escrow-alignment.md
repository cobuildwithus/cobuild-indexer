# 2026-03-02 Premium Escrow Alignment

## Goal

Align the indexer with current `v1-core` protocol surfaces by removing deprecated `RewardEscrow`/strategy/budget-vault indexing and adding `PremiumEscrow` indexing with correct event signatures and schema projections.

## Scope

- Update contract config/factory discovery in `ponder.config.ts`.
- Regenerate/replace ABI files under `abis/**` from current forge artifacts.
- Remove obsolete handlers and wire new handlers in `src/index.ts`.
- Update projections and schema in `ponder.schema.ts`.
- Add `PremiumEscrow` and underwriter/slasher handler coverage.
- Update architecture/reference docs describing indexed events/schema.

## Constraints

- Keep handlers deterministic and replay-safe.
- Keep config/schema/handlers/docs updated in one cohesive change set.
- Preserve unrelated legacy indexer surfaces.

## Verification

- Completion workflow passes: simplify -> test-coverage-audit -> task-finish-review.
- Required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (if available), docs drift + doc gardening.
