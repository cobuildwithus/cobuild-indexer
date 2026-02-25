# Module Boundary Map

## Core Boundaries

- `ponder.config.ts`
  - Contract sources, chain scope, and dynamic factory discovery.
- `ponder.schema.ts`
  - Canonical projection schema and key contracts.
- `src/index.ts`
  - Imports all handlers so `ponder.on` registrations are activated.
- `src/helpers/**`
  - Shared deterministic helper logic (`ids`, serialization, allocation snapshot decode, protocol-event insertion).
- `src/lib/**`
  - Legacy/runtime config, RPC transports, ruleset helpers.
- `src/util/**`
  - Shared formatting and ID utilities.
- Domain handlers:
  - `src/contracts/**`: legacy REV/JB/Cobuild event and cron projections.
  - `src/flow/**`: flow lifecycle, recipients, allocation deltas.
  - `src/goals/**`: goal treasury state, donations, hooks, success/finalization.
  - `src/budgets/**`: budget treasury state and lifecycle.
  - `src/stakeVault/**`: stake/juror lifecycle and aggregate accounting.
  - `src/stakeLedger/**`: budget registration/removal + checkpoints.
  - `src/rewardEscrow/**`: reward finalization/claims/unwrap telemetry.
  - `src/tcr/**` + `src/tcrFactory/**`: budget stack orchestration telemetry.
  - `src/pipeline/**`: allocation ledger sync telemetry.
  - `src/hook/**`: revnet split hook processing telemetry.
  - `src/strategy/**`: strategy config telemetry.

## Dependency Direction

1. Handlers may depend on `src/helpers/**`, `src/lib/**`, `src/util/**`, and `ponder:schema`.
2. Helpers/util modules must not import concrete handler modules.
3. Config and schema should remain independent of handler internals.
