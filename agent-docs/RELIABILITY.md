# Reliability

## Core Invariants

1. Handlers remain replay-safe and deterministic.
2. Config/schema/handler/docs remain aligned.
3. Allocation delta math preserves recipient unit totals across replays across both weight-only and snapshot-change commit paths.
4. Dynamic discovery surfaces (child flows, premium escrows, budget treasuries) must remain idempotent.

## Reliability-Critical Surfaces

- `src/flow/allocation-committed.ts`
- `src/helpers/allocationSnapshot.ts`
- `src/goals/GoalConfigured.ts`
- `src/budgets/BudgetConfigured.ts`
- `src/stakeVault/*.ts`
- `src/premiumEscrow/*.ts`

## Known Risks

1. Factory event signatures in `ponder.config.ts` must stay aligned with deployed `GoalFactory`/`BudgetTCRFactory` bytecode; mismatches stall downstream discovery.
2. No automated `pnpm test` harness exists yet; regression risk is concentrated in allocation math and lifecycle transitions.

## Verification Matrix

- `pnpm typecheck`
- `pnpm lint`
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`
