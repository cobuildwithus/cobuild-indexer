# Quality Score

Snapshot date: 2026-02-25

Scoring rubric:
- `5`: strong guardrails + tests/docs + enforced CI checks
- `4`: good guardrails with small, explicit gaps
- `3`: acceptable baseline with known follow-up required
- `2`: fragile/high regression risk
- `1`: no reliable guardrails

| Area | Score (1-5) | Evidence | Next follow-up |
| --- | --- | --- | --- |
| Source config and chain scope control | 4 | Base-only scope and explicit filters in `ponder.config.ts` + `src/lib/config.ts`. | Add explicit review checklist for scope/filter changes. |
| Event-handler and schema coupling | 4 | Handlers mapped by domain with structured schema tables and PKs. | Keep handler map and schema relations docs updated per event change. |
| Determinism and replay safety | 3 | Most projections are event-derived, but known wall-clock/random-ID debt exists. | Remove wall-clock projection branching and reduce random-ID coupling. |
| Ruleset lifecycle correctness | 3 | Ruleset queue/init/cron activation path is explicit and documented. | Add targeted regression checks around cycle/activation edge cases. |
| Swap and loan attribution quality | 3 | Dedicated handlers and mappings exist for swaps/loans/activity. | Validate multi-swap-per-tx assumptions and strengthen attribution tests. |
| API/query surface legibility | 3 | GraphQL mounting is simple and explicit in `src/api/index.ts`. | Document deployment access/rate-limit/query-complexity posture. |
| Verification and CI posture | 4 | Lint/typecheck + doc drift/gardening checks wired in workflows and scripts. | Add automated runtime tests/coverage lane as test suite matures. |
| Agent docs coverage and enforceability | 5 | Index + references + operations/prompts + coordination ledger + drift/gardening automation in-repo. | Keep owners/cadence current and review generated reports weekly. |

## Top Risk Register

1. Replay divergence from wall-clock or non-deterministic IDs leaking into consumer assumptions.
2. Event/filter/schema drift when adding new indexed behavior quickly.
3. Query consumers depending on display-formatted fields as canonical accounting values.
4. Runtime test harness remains limited; regression detection depends heavily on type/lint/docs gates today.
