# Plans

Execution plans are first-class artifacts in this repository.

## Locations

- Active: `agent-docs/exec-plans/active/`
- Completed: `agent-docs/exec-plans/completed/`
- Debt tracker: `agent-docs/exec-plans/tech-debt-tracker.md`
- Active coordination ledger: `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`

## Lifecycle Scripts

- Create a plan: `bash scripts/open-exec-plan.sh <slug> "<title>"`
- Complete a plan: `bash scripts/close-exec-plan.sh <active-plan-path>`

## When To Create A Plan

Create a plan for multi-file indexing changes, architecture-sensitive updates, or cross-boundary work.

Examples:

- new/changed indexed events and filter sets,
- schema or identifier-contract changes,
- RPC/failover/config behavior changes,
- API/query surface changes,
- verification/process-rule changes.

## Plan Quality Bar

A valid plan should include:

- explicit goal and success criteria,
- scope and out-of-scope boundaries,
- constraints and risks,
- concrete verification commands and expected outcomes,
- ordered tasks and decisions captured as they are made.

## Plan and Code Coupling

When architecture-sensitive code changes occur, at least one should be true:

- matching non-generated docs are updated, or
- an active execution plan captures intended follow-up.

Prefer both for complex changes.

## Historical Plan Policy

- Treat completed plans as immutable records.
- Do not edit files under `agent-docs/exec-plans/completed/` for new work.
- For follow-on work, create a new active plan and link prior plans as references.
