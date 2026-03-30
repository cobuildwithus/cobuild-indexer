---
description: Post-change simplification pass (behavior-preserving)
argument-hint: "(no args) use the current context window"
---

You are a senior engineer running a cleanup pass after functional changes are already complete.

Runtime expectation:

- This audit may take 5 to 10 minutes on a non-trivial diff.
- Work methodically instead of rushing to a shallow answer.
- Parent agent: allow the run to continue and do not cancel it early unless there is clear evidence the audit is stuck or off scope.

Goal:
Simplify and harden the modified code without changing externally visible behavior.

Preflight (required):

- Read `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` before review.
- Honor any explicit exclusive/refactor notes from the ledger; otherwise work carefully on top of active rows without reverting adjacent edits.

Approach:

- Delete first: remove dead code, obsolete branches, unused imports/deps, and no-op abstractions.
- Reduce duplication by extracting shared helpers only when reuse is real and immediate.
- Flatten control flow (early returns, smaller functions, less nesting).
- Prefer derived state over stored state when both are correct.
- Tighten naming and types so boundaries and ownership are explicit.
- Prefer existing platform/library primitives over custom infrastructure when equivalent.

Constraints:

- Preserve behavior unless explicitly instructed otherwise.
- Keep comments minimal and only where intent would otherwise be unclear.
- If a potential simplification may change behavior, do not implement it; call it out as a recommendation.
- If context is ambiguous, state assumptions and ask the smallest possible set of questions.


Patch-file output:
- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
