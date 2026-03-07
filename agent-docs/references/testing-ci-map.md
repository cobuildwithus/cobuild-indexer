# Testing and CI Map

## Local Verification Baseline

- `pnpm wire:ensure-published`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (when a `test` script exists)
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`

## Script Enforcement

- Drift checks: `scripts/check-agent-docs-drift.sh`
- Drift checks ignore execution-plan-only churn when deciding whether `agent-docs/index.md` must change.
- `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` alone does not count as an active execution plan for docs-drift relief.
- Dependency-only `package.json` + optional `pnpm-lock.yaml` updates do not require matching docs updates.
- Docs inventory/report generation: `scripts/doc-gardening.sh`
- Local pre-commit runs doc gardening only when docs/governance files are staged.
- Plan lifecycle: `scripts/open-exec-plan.sh`, `scripts/close-exec-plan.sh`
- Active-scope ownership: `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`
- Selective commits: `scripts/committer`
- Published dependency guard: `scripts/wire-ensure-published.sh` (must resolve the installed repo-tools binary and reject committed local-link `@cobuild/wire` specs)
- Audit/review packaging: `scripts/package-audit-context.sh`, `pnpm review:gpt`

## CI Workflow Coverage

- Main CI: `.github/workflows/test.yml`
  - agent-doc drift checks
  - doc gardening fail-fast checks
  - `pnpm wire:ensure-published`
  - `pnpm typecheck`
  - `pnpm lint`
- Doc maintenance: `.github/workflows/doc-gardening.yml`
  - scheduled doc gardening
  - generated report PR automation

## Architecture Enforcement Posture

- Required docs artifacts are enforced by drift checks.
- Docs index coverage is enforced by gardening report checks.
- Architecture-sensitive code/process changes require matching docs updates or an active execution plan.
- Automated runtime tests are not yet wired in CI for this repo; prioritize deterministic verification when tests are added.

## Update Rule

If verification commands, workflows, or governance scripts change, update this file and `agent-docs/QUALITY_SCORE.md`.
