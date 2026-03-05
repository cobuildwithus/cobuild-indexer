# 2026-03-04 — Goal Contributor Aggregate Projection

## Goal

Add an indexer-level pre-aggregated table keyed by goal + contributor so interface profile holdings can avoid expensive runtime pay-event grouping and read deterministic aggregates directly.

## Scope

- Add new projection table in `ponder.schema.ts`.
- Update `JBMultiTerminal:Pay` handler to maintain that table.
- Update relevant reference docs for schema/event mapping.
- Update interface Prisma and goals domain query to consume new aggregate table.

## Success Criteria

- New indexer table exists and is updated during pay processing.
- Interface `getUserGoalHoldings` uses aggregate table instead of pay-event groupBy.
- Existing profile holdings UI still renders expected holdings fields.
- Required checks pass in both repos.

## Notes

- Preserve semantics from current interface logic:
  - only count contributions where `newlyIssuedTokenCount > 0`;
  - include contributions across the canonical goal’s sucker group, not just a single project id.
