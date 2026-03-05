# Address and ABI Provenance

## Source of Truth

Address composition:
- `addresses.revnet.ts`: Juicebox/Revnet contract addresses derived from `juice-sdk-core`.
- `addresses.cobuild.ts`: Cobuild deployment addresses and related integration constants.
- `addresses.ts`: merged export used by runtime config and handlers.

ABI generation:
- `wagmi.config.ts` defines ABI generation pipeline.
- `pnpm wagmi` writes generated `abis.ts`.
- `ponder.config.ts` uses ABI exports plus SDK ABIs for event decoding.

## Critical Provenance Rules

- Treat `addresses*.ts`, `wagmi.config.ts`, and `abis.ts` as a coupled change set.
- Never change contract addresses without validating filter targets and handler assumptions.
- Keep generated `abis.ts` in sync with deployed contract versions.

## Safe Update Workflow

1. Update source address/config file(s).
2. Regenerate ABIs when required (`pnpm wagmi`).
3. Update `ponder.config.ts` filters or factory event sources as needed.
4. Verify handler assumptions (events, args, and invariants) against ABI changes.
5. Update architecture/reference docs and run verification.

## Known Sensitivities

- `TokenBought` dynamic factory indexing depends on the `BatchReactionSwap` ABI event signature.
- `USDCBase` and fee collector assumptions in swap attribution are hardcoded behavior contracts.
