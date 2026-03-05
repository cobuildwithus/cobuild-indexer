---
description: Post-simplify test-coverage audit that adds the highest-impact missing tests
action: targeted test audit + implementation
---

You are performing a post-simplify test-coverage pass for completed changes.

Goal:
Find meaningful coverage gaps introduced by the change set, then implement the highest-impact tests to close those gaps before final completion audit.

Audit for:

- missing coverage on modified behavior and directly affected call paths
- edge cases and failure-mode handling gaps
- invariant gaps around deterministic replay behavior, key usage, and schema coupling
- brittle assertions that miss important state guarantees

Execution requirements:

- Use full diff/context and inspect both modified production files and nearby tests.
- Prioritize impact: implement the smallest test set that materially reduces regression risk.
- Rank impact by security boundaries, data-consistency risks, user-facing blast radius, and likelihood of regression on critical indexing paths.
- Prefer deterministic tests first.
- Do not change production behavior in this pass; only add/adjust tests unless explicitly instructed otherwise.
- If runnable automated tests are available, run the narrowest relevant verification command first (or `pnpm test` when scope is broad/unclear), then report outcomes.
- If a runnable test harness is unavailable, provide concrete high-priority test additions and required harness work.
- If a required test is blocked by ambiguity, state the blocker and what assumption would unblock implementation.

Output requirements:

- Summarize implemented tests and why each is high impact.
- Include exact verification commands run and pass/fail outcomes for implemented tests.
- List remaining recommended tests (if any) ordered by priority (`high`, `medium`, `low`).
- For each remaining recommendation include: `priority`, `target file/suite`, `risk scenario`, `recommended assertion/invariant`.
- Include an `Open questions / assumptions` section when uncertainty remains.
