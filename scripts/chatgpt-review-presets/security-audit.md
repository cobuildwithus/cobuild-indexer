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


Patch-file output:
- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
