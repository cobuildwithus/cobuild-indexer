# Testing and CI Map

## Local Verification Baseline

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (when a `test` script exists)
- `bash scripts/check-agent-docs-drift.sh`
- `bash scripts/doc-gardening.sh --fail-on-issues`

## Script Enforcement

- Drift checks: `scripts/check-agent-docs-drift.sh`
- Docs inventory/report generation: `scripts/doc-gardening.sh`
- Plan lifecycle: `scripts/open-exec-plan.sh`, `scripts/close-exec-plan.sh`
- Active-scope ownership: `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`
- Selective commits: `scripts/committer`
- Audit/review packaging: `scripts/package-audit-context.sh`, `scripts/chatgpt-oracle-review.sh`

## CI Workflow Coverage

- Main CI: `.github/workflows/test.yml`
  - agent-doc drift checks
  - doc gardening fail-fast checks
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
