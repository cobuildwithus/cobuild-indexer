# TCR Request Actor Event Sync

## Goal

Consume the protocol TCR event cutover so requester, challenger, and dispute request-cycle targeting stay deterministic without onchain reads.

## Scope

- `ponder.config.ts`
- `src/tcr/**`
- Targeted notification tests
- Matching projection/docs references

## Constraints

- Keep handlers replay-safe and avoid `readContract` for requester/challenger resolution.
- Preserve existing protocol notification semantics aside from improved actor attribution.
- Update docs for any changed event payload assumptions.

## Done

- Added coordination ownership for the downstream indexer sync.
- Added a narrow local `BudgetTCRProtocolEvents` ABI bridge in `ponder.config.ts` for the cutover `RequestSubmitted` and `Dispute` event fragments while keeping the main `BudgetTCR` contract on published `@cobuild/wire`.
- Updated TCR request/dispute handlers to trust emitted requester/challenger/requestIndex fields instead of submitter or `tx.from` inference.
- Strengthened notification-handler tests to key `tcrRequest` reads by emitted request index and cover missing bridged fields without fallback behavior.
- Updated product/reference docs for the hard-cutover actor-targeting semantics and the temporary bridge assumption.
- Verified the repo with `pnpm codegen`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, docs drift, and doc gardening.
- Renamed the notification payload role semantics from `submitter` to `proposer` so downstream presenters can distinguish original item proposers from current requesters.

## Now

- Apply the `proposer` role rename across notification helpers and targeted tests without changing recipient resolution.

## Next

- Remove the temporary `BudgetTCRProtocolEvents` bridge once the published `@cobuild/wire` package exposes the cutover event signatures directly.
