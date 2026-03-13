# Ponder Latest Upgrade

## Status

Completed on 2026-03-13.

## Goal

Upgrade the indexer from the current Ponder 0.11-era toolchain to the latest published Ponder release while keeping local development and required verification green.

## Constraints

- Use the latest published npm versions, not local links.
- Keep the runtime behavior aligned with the current published `@cobuild/wire` ABI/address surface.
- Avoid unrelated schema or handler behavior changes unless the new Ponder version requires them.

## Scope

- Bump `ponder` and companion lint/tooling packages as needed.
- Fix any resulting config, lint, or runtime compatibility issues in-repo.
- Verify `pnpm dev`, typecheck, lint, tests, and docs gates after the upgrade.

## Verification

- `pnpm wire:ensure-published`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
- `pnpm dev` startup check

## Outcome

- Upgraded `ponder` to `0.16.4`.
- Upgraded `eslint-config-ponder` to `0.16.4`.
- No repo code or config changes were required beyond the dependency bump.
- Verified local startup, database initialization, RPC connection, and backfill start under `pnpm dev`.
