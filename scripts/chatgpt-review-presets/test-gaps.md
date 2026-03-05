Objective:
Find the highest-risk missing tests for this indexer and specify the minimal test set that would prevent regressions.

Focus:
- Prioritize gaps on modified/high-risk paths: event handlers, schema coupling, API query behavior, and RPC transport failover.
- Target failure modes: out-of-order events, missing enrichment responses, malformed onchain payloads, and duplicate/replay events.
- Check contract tests for key invariants: deterministic writes, stable key usage, and lifecycle transition safety.
- Find missing coverage around cron/block interval jobs and eventual-consistency guarantees.
- Flag brittle tests that assert incidental values instead of core projection invariants.

Output format:
- `High impact tests to add now` (max 8), each with:
  `priority`, `target file/suite`, `risk scenario`, `exact assertion/invariant`, `why high impact`.
- `Lower-priority follow-ups` (optional).
- `Open questions / assumptions` only when necessary.
