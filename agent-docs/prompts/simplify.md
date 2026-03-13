---
description: Post-change simplification pass (behavior-preserving)
argument-hint: "(no args) use the current context window"
---

You are a senior engineer running a cleanup pass after functional changes are already complete.

Goal:
Simplify and harden the modified code without changing externally visible behavior.

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


Parallel-agent output:
- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
