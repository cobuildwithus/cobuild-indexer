# RPC and Chain Config Map

## Chain Scope

- Chain configuration is defined in `src/lib/config.ts`.
- Current runtime is Base-only via `getChainsAndRpcUrls()`.
- Contract-specific start blocks are declared per domain and imported into `ponder.config.ts`.

## Event Filter Scope

- Shared REV/JB singleton contracts are indexed on Base with explicit event allowlists rather than project-id/revnet-id filters.
- ERC20 transfer scope remains address-scoped:
  - root Cobuild token uses the static wire-sourced `COBUILD_TOKEN_ADDRESS`
  - goal-token transfers are factory-discovered from `GoalFactory:GoalDeployed(stack.goalToken)`
- Cobuild swap tracking is pinned to `chain: "base"` and uses factory indexing for `TokenBought`.
- Scaffold discovery is rooted at static Base entrypoints from `@cobuild/wire`:
  - `GoalFactory` and `BudgetTCRFactory` start at block `43288154`.
  - Until the refreshed published `@cobuild/wire` package lands, `ponder.config.ts` pins the cutover entrypoint addresses locally for the new factory rollout.
  - First-hop stack contracts are discovered from factory events (no manual bootstrap lists).
  - Second-level stack contracts (`ChildFlow`, `BudgetTreasury`, `PremiumEscrow`) are discovered from `BudgetTCRFactory:BudgetStackDeployed`.

## RPC Provider Strategy

Defined in `src/lib/rpc-transport.ts`:
- HTTP providers are built from env-derived URLs (Infura, Dwellir, Alchemy, Chainstack).
- If one HTTP URL is configured, use direct `http(url)` transport.
- If multiple URLs are configured, use `fallback([...])` transport.
- If zero URLs are configured, runtime throws.

Websocket strategy:
- First available WS URL from provider priority order is selected.

## Operational Assumptions

- Provider ordering is intentional and can affect behavior/latency.
- Chain scope expansions require updates to config, filters, schema assumptions, and security docs.
- Start block changes are correctness-sensitive because handlers assume prerequisite entities may already exist.

## Update Checklist

When changing chain or RPC behavior:
1. Update `src/lib/config.ts` and `ponder.config.ts` together.
2. Update reliability/security docs for new failure modes/trust boundaries.
3. Validate API/query consumers against any changed data availability window.
