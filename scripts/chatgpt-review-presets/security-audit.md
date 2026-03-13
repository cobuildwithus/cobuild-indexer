Objective:
Perform a focused security review of this indexer repository snapshot.

Review priorities:
- Trust-boundary enforcement for chain scope, address/ABI provenance, and RPC provider configuration.
- External call safety for handler enrichment (`readContract`) and API integrations.
- Data integrity across event filters, handler writes, and schema constraints.
- Query/API exposure risks (over-broad data access, expensive unbounded queries, unsafe defaults).
- Secret handling and log hygiene (credentials, provider URLs, sensitive runtime diagnostics).
- Dependency and supply-chain risk signals (unsafe packages, insecure defaults).

Expected output:
- Concrete findings with severity, exploit or failure path, and exact file/function references.
- Minimal remediation guidance that preserves intended indexing behavior.


Parallel-agent output:
- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
