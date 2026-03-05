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
