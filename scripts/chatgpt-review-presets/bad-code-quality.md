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


Parallel-agent output:
- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
