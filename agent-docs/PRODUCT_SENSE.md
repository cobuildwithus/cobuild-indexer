# Product Sense

## What This Indexer Produces

This repository produces queryable projections over Cobuild/Juicebox/Revnet onchain activity for downstream applications.

Primary output families:
- project and participant state,
- ruleset lifecycle and activation state,
- payment and loan activity,
- swap execution attribution,
- activity-log summaries.

## Consumer Contract Expectations

1. Prefer natural keys
- Query and join via stable keys (`chainId`, `projectId`, `txHash`, `logIndex`, table PKs).
- Do not assume random ID defaults are stable across reindex.

2. Distinguish accounting vs display fields
- Some fields are presentation-oriented (for example `activityLog.amount` formatting), not canonical accounting primitives.

3. Expect eventual consistency where documented
- Ruleset activation and some derived projections depend on periodic jobs and may lag event timestamps.

4. Treat schema changes as product changes
- Any breaking rename/removal/type change requires consumer coordination and migration notes.

## Change Management Rules

When changing projection semantics:
- update `agent-docs/product-specs/indexer-projections.md`,
- update affected reference docs under `agent-docs/references/`,
- record migration notes in an execution plan if consumers are impacted.

## Update Triggers

Update this doc when changing:
- output semantics for downstream consumers,
- identifier strategy/guarantees,
- eventual-consistency behavior,
- display vs canonical field contracts.
