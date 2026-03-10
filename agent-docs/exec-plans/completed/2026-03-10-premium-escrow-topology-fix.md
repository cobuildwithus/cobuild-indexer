# 2026-03-10 Premium Escrow Topology Fix

## Goal

Make the indexed budget topology use the protocol-emitted `premiumEscrow` address as the canonical escrow id, while preserving `managerRewardPool` as a separate pool address.

## Scope

- Stop `GoalFlow:ChildFlowDeployed` from writing `managerRewardPool` into escrow-linked budget topology rows.
- Move canonical budget/premium topology writes onto `BudgetTCRFactory:BudgetStackDeployed`, which emits `premiumEscrow`.
- Keep `BudgetTCR:BudgetStackDeployed` as a raw lifecycle audit event without fabricating escrow topology from child-flow data.
- Keep `BudgetTreasury:BudgetConfigured` and `BudgetAllocationMechanismDeployed` from falling back to `childFlow.managerRewardPool` as if it were an escrow.
- Pin the `BudgetTCRFactory` handler ABI to the explicit factory event fragments already used for discovery so handler typing matches the emitted payload.
- Update linkage tests to cover the corrected topology.
- Refresh any touched reference docs that describe handler behavior.

## Constraints

- Preserve replay-safe, PK-based writes only.
- Do not add contract reads or non-deterministic behavior.
- Keep compatibility with event ordering where child-flow deployment arrives before escrow linkage.

## Verification

- Completion workflow passes: simplify -> test-coverage-audit -> task-finish-review.
- Required checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm docs:drift`, `pnpm docs:gardening`.
