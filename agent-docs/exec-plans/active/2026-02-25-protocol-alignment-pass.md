# 2026-02-25 Protocol Alignment Pass

## Goal
Align the scaffold indexing stack in this repo to the current `../protocol` contract events so event filters, ABIs, handlers, and schema fields match deployed protocol behavior.

## Scope
- Regenerate/update scaffold ABI files in `abis/*.ts` from `../protocol/out/**`.
- Update scaffold contract/event wiring in `ponder.config.ts`.
- Refactor scaffold handlers in `src/flow/**`, `src/goals/**`, `src/budgets/**`, `src/stakeVault/**`, `src/stakeLedger/**`, `src/rewardEscrow/**`, `src/tcr/**`, `src/tcrFactory/**`, `src/pipeline/**`, `src/hook/**`.
- Update scaffold tables in `ponder.schema.ts` for current event payloads.
- Keep unified registry in `src/index.ts` and preserve legacy stack.
- Update event inventory docs for changed scaffold events.

## Invariants
- Legacy REV/JB stack remains active and untouched unless directly required.
- Event handlers remain deterministic/replay-safe.
- `ponder.config.ts` + `abis/*.ts` + handlers + schema stay aligned in one change.
- Event handler files remain kebab-case.

## Plan
1. Regenerate scaffold ABI definitions from Foundry artifacts.
2. Update config discovery/event signatures and scaffold contract ABI references.
3. Refactor scaffold handlers to current protocol args and add missing handlers.
4. Update scaffold schema fields/indexes to match new payloads.
5. Run full verification and completion workflow audits, then commit.
