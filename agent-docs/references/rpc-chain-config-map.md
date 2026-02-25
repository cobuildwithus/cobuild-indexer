# RPC and Chain Config Map

## Chain Scope

- Chain configuration is defined in `src/lib/config.ts`.
- Current runtime is Base-only via `getChainsAndRpcUrls()`.
- Contract-specific start blocks are declared per domain and imported into `ponder.config.ts`.

## Event Filter Scope

- Several domains are narrowed to `BASE_PROJECT_IDS = [6n]` in `ponder.config.ts`.
- Cobuild swap tracking is pinned to `chain: "base"` and uses factory indexing for `TokenBought`.
- Scaffold contracts (`GoalFlow`, treasuries, vaults, hook/pipeline/strategy) are currently configured with placeholder addresses and `startBlock: 0` until deployment coordinates are supplied.

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
