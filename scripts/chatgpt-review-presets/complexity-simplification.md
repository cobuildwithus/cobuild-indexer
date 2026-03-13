Objective:
Find behavior-preserving simplifications that reduce complexity and maintenance cost in this TypeScript indexer codebase.

Review priorities:
- Overly complex handlers/helpers that should be split by responsibility.
- Duplicate conversion/parsing/normalization logic that should be shared.
- Redundant abstractions that obscure event-to-table data flow.
- Nested control flow that can be flattened with clear guard clauses.
- Naming/type improvements that make trust boundaries and ownership explicit.

Expected output:
- A ranked list of simplifications with impact, risk, and estimated effort.


Parallel-agent output:
- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
