# 2026-02-25 Ponder Scaffold Wireup

## Goal
Integrate the provided CoBuild Base scaffold into the existing runtime so legacy REV/JB services and new goal/budget flow services run together in one clean indexer.

## Scope
- Runtime files: `ponder.config.ts`, `ponder.schema.ts`, `src/**`, `abis/**`, `ponder-env.d.ts`, `tsconfig.json`, `package.json` (dependency alignment only).
- Docs coupling updates: `agent-docs/references/event-handler-map.md`, `agent-docs/references/schema-relations-map.md`, `agent-docs/product-specs/indexer-projections.md`, `agent-docs/RELIABILITY.md`, `ARCHITECTURE.md`, `agent-docs/index.md` only as needed.

## Invariants
- Base chain scope (chainId 8453) remains explicit.
- Event handler decisions remain replay-safe and deterministic.
- `ponder.config.ts`, handlers, and schema remain mutually aligned across both stacks.
- Legacy services are preserved unless explicitly removed by user direction.
- Placeholder addresses/start blocks stay clearly marked until real deployment data is provided.

## Plan
1. Import scaffold runtime files and ABIs.
2. Preserve existing legacy runtime services and merge scaffold config/schema/handlers additively.
3. Enforce kebab-case event handler filenames and unified handler registration in `src/index.ts`.
4. Update required docs for event+schema coupling.
5. Run required verification commands and completion workflow audits.
