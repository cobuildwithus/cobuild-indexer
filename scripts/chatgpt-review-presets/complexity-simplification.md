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


Patch-file output:
- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
