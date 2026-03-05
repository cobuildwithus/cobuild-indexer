# Completion Workflow

Last verified: 2026-02-25

## Sequence

Docs-only shortcut: for docs/process-only changes, skip completion workflow audit passes unless the user explicitly asks for them.

Non-docs rule: for changes touching production code or tests, all three audit passes below are mandatory before final handoff.

1. After implementation is complete, run a simplification pass using `agent-docs/prompts/simplify.md`.
2. Apply behavior-preserving simplifications from that pass.
3. Run a test-coverage audit pass using `agent-docs/prompts/test-coverage-audit.md` with full change context.
4. The coverage-audit pass should implement the highest-impact missing tests it identifies when a runnable test harness exists.
5. Re-run required checks after the simplify + test-coverage sequence.
6. Run a completion audit using `agent-docs/prompts/task-finish-review.md` with full change context.
7. Final handoff remains gated on green required checks; completing audits does not waive verification requirements.
8. Do not skip these passes unless the user explicitly instructs to skip them for that turn.

## Coordination Ledger (Always Required)

- Before coding work (including subagent audit passes that may edit files), add an active row to `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`.
- Keep the row updated when scope/symbol intent changes.
- In every subagent handoff packet, require the subagent to read and honor ledger ownership before reviewing/editing files.
- Remove your row immediately when the task is complete or abandoned.

## Audit Handoff Packet

When using a fresh subagent for coverage or completion audits, provide:

- what changed and why (behavior-level summary, not just filenames),
- expected invariants/assumptions that must still hold,
- links to active execution plans under `agent-docs/exec-plans/active/` (when present),
- verification evidence already run (commands + outcomes),
- current git worktree context (relevant modified files + known unrelated dirty paths),
- explicit instruction to read `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` and avoid touching owned files.

Instruct reviewers to use the handoff packet plus current `git diff` and call-path inspection, not diff-only inference.

## Shared Worktree Safety

- During simplify/test-coverage/completion-audit passes, never overwrite, discard, or revert existing worktree edits.
- Do not use reset/checkout-style cleanup commands to "prepare" files for these passes.
- If a suggested change collides with pre-existing edits, leave the file untouched and escalate in handoff notes.

## Severity Policy

- Prefer a fresh subagent for coverage and completion audits; only fall back to same-agent audit when subagent execution is unavailable.
- Resolve all high-severity findings before handoff; if any are deferred, document risk, rationale, and follow-up owner.
