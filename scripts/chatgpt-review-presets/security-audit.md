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
