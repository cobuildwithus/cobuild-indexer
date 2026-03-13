# Address and ABI Provenance

## Source of Truth

Address composition:
- `addresses.revnet.ts`: Juicebox/Revnet contract addresses derived from `juice-sdk-core`.
- `addresses.cobuild.ts`: wire-backed Cobuild deployment addresses plus local-only non-wire integration constants.
- `addresses.ts`: merged export used by runtime config and handlers.
- `@cobuild/wire`: canonical Base entrypoint + implementation address exports (`baseContracts`, `baseEntrypoints`, ABI symbols) used by scaffold discovery and Cobuild runtime addresses in `ponder.config.ts`.

ABI generation:
- `wagmi.config.ts` defines ABI generation pipeline.
- `pnpm wagmi` writes generated `abis.ts`.
- `ponder.config.ts` uses ABI exports plus SDK ABIs for event decoding.

## Critical Provenance Rules

- Treat `addresses*.ts`, `wagmi.config.ts`, and `abis.ts` as a coupled change set.
- Never change contract addresses without validating filter targets and handler assumptions.
- Keep generated `abis.ts` in sync with deployed contract versions.
- Keep factory event payload assumptions in `ponder.config.ts` (`GoalDeployed`, `BudgetTCRStackDeployedForGoal`, `BudgetStackDeployed`) aligned with deployed `v1-core` emitters.
- When published `@cobuild/wire` lags a local protocol event cutover, prefer a narrowly scoped `ponder.config.ts` event-fragment override and remove it after the refreshed package is published.
- The current Base factory rollout is bridged locally in `ponder.config.ts` by pinning the new `GoalFactory` / `BudgetTCRFactory` entrypoints and the refreshed `GoalDeployed` stack fragment until the next `@cobuild/wire` publish.

## Safe Update Workflow

1. Update source address/config file(s).
2. Regenerate ABIs when required (`pnpm wagmi`).
3. Update `ponder.config.ts` filters or factory event sources as needed.
4. Verify handler assumptions (events, args, and invariants) against ABI changes.
5. Update architecture/reference docs and run verification.

## Known Sensitivities

- `TokenBought` dynamic factory indexing depends on the `BatchReactionSwap` ABI event signature.
- `USDCBase` and fee collector assumptions in swap attribution are hardcoded behavior contracts.
