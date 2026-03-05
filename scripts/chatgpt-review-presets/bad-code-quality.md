Objective:
Identify concrete code-quality issues and indexing anti-patterns that are likely to cause projection bugs, replay drift, or costly maintenance.

Review priorities:
- Non-deterministic handler behavior (wall-clock usage, random branching, unstable iteration order).
- Handler/schema drift (writes that do not match table contracts, missing relation updates, stale indexes).
- Fragile async and enrichment paths (`readContract` failure handling, unbounded retries, silent fallbacks).
- ID/key misuse (generated IDs used as external contracts instead of natural keys).
- Error-handling gaps that can hide indexing failures or data corruption.
- Test quality gaps (missing replay/regression coverage, brittle fixtures, low-signal assertions).

Expected output:
- Concrete findings tied to file locations, each with an actionable fix.
