# Verification and Runtime

Last verified: 2026-02-25

## Verification Commands

- Baseline: `pnpm typecheck`
- Baseline: `pnpm lint`
- If present in `package.json`: `pnpm test`
- Docs drift gate: `bash scripts/check-agent-docs-drift.sh`
- Docs freshness gate: `bash scripts/doc-gardening.sh --fail-on-issues`

## Required Checks Matrix

| Change scope | Required action | Notes |
| --- | --- | --- |
| Docs-only (`*.md`, `agent-docs/**`) | Run baseline checks + docs gates | Run `pnpm test` only if a `test` script exists. |
| Non-doc changes (runtime/config/scripts) | Run baseline checks + docs gates | Add/close execution plans and keep coordination ledger current as required. |
| Non-doc changes touching production code/tests | Run baseline checks + docs gates + completion workflow | Follow `agent-docs/operations/completion-workflow.md` before handoff. |
| User explicitly says to skip checks for this turn | Skip checks | User instruction takes precedence for that turn. |

## Multi-Agent Change Ledger

- Ledger path: `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`.
- Use the ledger for every coding task (single-agent and multi-agent).
- Required per active entry:
  - agent/session identifier and short task label,
  - expected file paths,
  - symbols likely to be added, renamed, or deleted,
  - short dependency notes,
  - last-updated date.
- Workflow:
  - before first edit, add your row,
  - before spawning audit/review subagents, ensure your row is current,
  - require subagents to read the ledger and respect ownership boundaries,
  - update your row whenever file scope or symbol plans change,
  - remove your row when the task is complete or abandoned.

## Runtime Guardrails

- `pnpm typecheck` and `pnpm lint` may still be expensive on shared machines; avoid running heavy checks concurrently across many agents.
- Prefer narrow local iteration checks while developing, then run the full required gate once before handoff.
- Run docs drift/gardening checks after docs/script updates to keep generated artifacts synchronized.

## Troubleshooting

- If shell tooling is missing, verify local environment from repo root:
  - `node -v`
  - `pnpm -v`
- If a command appears hung, inspect active Node/Ponder processes:
  - `ps -Ao pid,ppid,%cpu,etime,command | rg 'pnpm|node|ponder'`
