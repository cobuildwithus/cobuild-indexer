# Port shared agent harness into indexer

Status: completed
Created: 2026-02-25
Updated: 2026-02-25

## Goal

- Port the shared agent harness patterns used in sibling repos into this indexer repository, preserving indexer-specific constraints and excluding Solidity-only operational paths.

## Success criteria

- `AGENTS.md` upgraded to the current shared governance shape (precedence, completion workflow, coordination ledger, commit/check policies).
- Missing shared harness docs/scripts added and adapted for indexer runtime (`prompts`, `operations`, `committer`, review packaging, GPT review launcher/config, review presets).
- `agent-docs/index.md` and reference/process maps updated to include all new artifacts.
- No Solidity-centric workflow commands are introduced.
- Required verification commands pass.

## Scope

- In scope:
  - `AGENTS.md`, `agent-docs/**`, `scripts/**`, `package.json`, generated doc artifacts.
  - Shared harness parity for governance/process/audit tooling.
- Out of scope:
  - Runtime indexer behavior refactors unrelated to harness/process.
  - Adding new production indexing features.

## Constraints

- Technical constraints:
  - Keep all guidance specific to this indexer architecture and command surface.
  - Preserve deterministic/replay-safe indexing constraints.
- Product/process constraints:
  - Exclude Solidity-centric verification lanes and protocol-only operational scripts.
  - Keep docs index and drift enforcement synchronized.

## Risks and mitigations

1. Risk: Porting generic harness content can introduce non-indexer assumptions.
   Mitigation: Rewrite copied docs/scripts in place for indexer-specific paths, commands, and risks.
2. Risk: Drift checks may fail if newly added artifacts are not indexed.
   Mitigation: Update `agent-docs/index.md`, reference maps, and regenerate doc-gardening outputs.
3. Risk: Added tooling scripts may leak sensitive files in audit packaging.
   Mitigation: Keep strict sensitive-path exclusion in `scripts/package-audit-context.sh`.

## Tasks

1. Inventory harness deltas across sibling repos and identify indexer-relevant artifacts.
2. Port and adapt scripts (`committer`, review launcher/config, audit packaging, presets).
3. Port and adapt documentation (`prompts`, `operations`, coordination ledger, module-boundary map, AGENTS/read order updates).
4. Update package scripts/dependencies to wire the harness.
5. Run verification gates and finalize generated docs/drift consistency.

## Decisions

- Keep shared governance model parity (precedence, completion workflow, coordination ledger) while tailoring all runtime details to indexer-specific surfaces.
- Adopt the review tooling stack (`cobuild-review-gpt` wrapper + packaging + presets) with indexer-specific presets and package defaults.
- Keep existing non-Solidity verification baseline (`typecheck`, `lint`, docs drift/gardening, optional `test` if script exists).

## Verification

- Commands to run:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test` (if script exists)
  - `bash scripts/check-agent-docs-drift.sh`
  - `bash scripts/doc-gardening.sh --fail-on-issues`
- Expected outcomes:
  - All required checks pass.
  - No missing required harness artifacts.
  - Generated docs inventory/report remain synchronized.
Completed: 2026-02-25
