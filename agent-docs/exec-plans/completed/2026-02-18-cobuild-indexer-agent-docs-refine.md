# Cobuild Indexer agent docs and architecture refinement

Status: completed
Created: 2026-02-18
Updated: 2026-02-18

## Goal

- Bring `cobuild-indexer` docs to the same agent-first standard as updated repos: concise AGENTS map, concrete architecture/reliability/security docs, deep reference maps, and mechanically enforced drift/gardening checks.

## Success criteria

- Core docs (`AGENTS.md`, `ARCHITECTURE.md`, `agent-docs/*`) reflect real runtime boundaries and constraints.
- Reference maps exist for handler flow, schema relations, chain/RPC config, API/query surface, and CI/testing.
- Drift/gardening scripts and CI workflows fail on stale or missing docs.
- Verification commands pass.

## Scope

- In scope:
  - docs and references under `agent-docs/**`
  - `AGENTS.md`, `ARCHITECTURE.md`
  - scripts/workflows enforcing doc quality
  - generated docs refresh
- Out of scope:
  - changing production handler logic
  - schema or runtime behavior refactors

## Constraints

- Technical constraints:
  - keep statements grounded in current code paths/files
  - preserve script portability (bash, no external tool dependencies)
- Product/process constraints:
  - do not touch unrelated repos/changes
  - keep AGENTS short and routing-oriented

## Risks and mitigations

1. Risk: docs diverge from real runtime behavior.
   Mitigation: tie statements to concrete file paths and run doc-gardening/drift checks.
2. Risk: CI script updates become too strict or noisy.
   Mitigation: only enforce canonical artifacts and generated report freshness.

## Tasks

1. Audit runtime/config/schema/handler boundaries from source files.
2. Rewrite AGENTS + architecture + core agent docs with concrete invariants.
3. Add missing reference maps and expand external reference packs.
4. Tighten drift/gardening scripts and CI workflows.
5. Run verification and close plan.

## Decisions

- Keep this repo Base-only in docs; do not imply multi-chain support not present in config.
- Treat random schema IDs as non-canonical consumer identifiers in product/reliability docs.
- Require non-generated docs or active plan updates for architecture-sensitive code changes.

## Verification

- Commands to run:
  - `bash scripts/doc-gardening.sh --fail-on-issues`
  - `bash scripts/check-agent-docs-drift.sh`
  - `pnpm typecheck`
  - `pnpm lint`
- Expected outcomes:
  - no doc indexing/drift issues
  - typecheck and lint pass
- Results:
  - `bash scripts/doc-gardening.sh --fail-on-issues` passed (0 issues)
  - `bash scripts/check-agent-docs-drift.sh` passed
  - `pnpm typecheck` passed
  - `pnpm lint` passed
Completed: 2026-02-18
