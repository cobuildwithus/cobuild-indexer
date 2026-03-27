# Completion Workflow

Last verified: 2026-03-28

## Sequence

Docs-only shortcut: for docs/process-only changes, skip completion workflow audit passes unless the user explicitly asks for them.

Non-docs rule: for changes touching production code or tests, all three audit passes below are mandatory before final handoff.

1. After implementation is complete, run a simplification pass using `agent-docs/prompts/simplify.md`. Expect about 5 to 10 minutes on non-trivial diffs; do not rush it or cancel it early just because it has not answered in the first minute.
2. Apply behavior-preserving simplifications from that pass.
3. Run a test-coverage audit pass using `agent-docs/prompts/test-coverage-audit.md` with full change context. Expect about 5 to 10 minutes on non-trivial diffs; do not rush it or cancel it early just because it has not answered in the first minute.
4. The coverage-audit pass should implement the highest-impact missing tests it identifies when a runnable test harness exists.
5. Re-run required checks after the simplify + test-coverage sequence.
6. Run a completion audit using `agent-docs/prompts/task-finish-review.md` with full change context. Expect about 5 to 10 minutes on non-trivial diffs; do not rush it or cancel it early just because it has not answered in the first minute.
7. Final handoff must report required-check results; green required checks remain the default completion bar.
8. If a required check fails for a credibly unrelated pre-existing reason, commit your exact touched files and hand off with the failing command, failing target, and why your diff did not cause it. If you cannot defend that separation, treat the failure as blocking.
9. Do not skip these passes unless the user explicitly instructs to skip them for that turn.

## Coordination Ledger (Always Required)

- Before coding work (including subagent audit passes that may edit files), add an active row to `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`.
- Treat the row as an active-work notice by default, not a hard lock.
- Overlap is allowed when agents stay within their declared scope, read the current file state first, and preserve adjacent edits.
- Mark a row as exclusive in `Dependency Notes` only when overlap is unsafe, such as a broad refactor or a delicate cross-cutting rewrite.
- Keep the row updated when scope/symbol intent or exclusivity expectations change.
- In every subagent handoff packet, require the subagent to read the ledger, honor any explicit exclusive/refactor notes, and otherwise work carefully on top of overlapping rows.
- Remove your row immediately when the task is complete or abandoned.

## Audit Handoff Packet

When using a fresh subagent for coverage or completion audits, provide:

- what changed and why (behavior-level summary, not just filenames),
- expected invariants/assumptions that must still hold,
- links to active execution plans under `agent-docs/exec-plans/active/` (when present),
- verification evidence already run (commands + outcomes),
- current git worktree context (relevant modified files + known unrelated dirty paths),
- explicit instruction to read `agent-docs/exec-plans/active/COORDINATION_LEDGER.md`, honor any explicit exclusive/refactor notes, and otherwise work carefully on top of overlapping rows.

Instruct reviewers to use the handoff packet plus current `git diff` and call-path inspection, not diff-only inference.

## Shared Worktree Safety

- During simplify/test-coverage/completion-audit passes, never overwrite, discard, or revert existing worktree edits.
- Do not use reset/checkout-style cleanup commands to "prepare" files for these passes.
- If a suggested change collides with pre-existing edits, leave the file untouched and escalate in handoff notes.

## Severity Policy

- Prefer a fresh subagent for coverage and completion audits; only fall back to same-agent audit when subagent execution is unavailable.
- Prefer a patient wait window over repeated short polling for simplify, coverage, and final-review subagents; a realistic default is 5 to 10 minutes for each audit pass on medium or large diffs.
- Do not cancel or close an audit subagent early just because it has been running for under 10 minutes unless you have concrete evidence that it is stuck or operating on the wrong scope.
- Resolve all high-severity findings before handoff; if any are deferred, document risk, rationale, and follow-up owner.
