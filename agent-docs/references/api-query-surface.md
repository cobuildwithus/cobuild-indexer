# API and Query Surface

## Mounted Endpoints

- `/` -> GraphQL middleware (`graphql({ db, schema })`)
- `/graphql` -> GraphQL middleware (`graphql({ db, schema })`)

Defined in `src/api/index.ts`.

## Surface Characteristics

- No custom REST handlers are defined in this repository.
- Queryable shape is driven by `ponder.schema.ts` and generated GraphQL schema.
- Authorization and request policy are deployment concerns, not enforced in `src/api/index.ts`.

## Consumer Guidance

- Favor natural keys and deterministic identifiers in query joins.
- Treat random default IDs as internal convenience IDs.
- For product-critical behavior, rely on domain fields (project/ruleset/loan/event keys) rather than display-oriented fields.

## Operational Caveats

- Because GraphQL is broadly mounted, deploy-time controls (network policy, auth gateway, query limits/rate limits) should be explicit.
- Schema changes can be consumer-breaking and require product-spec + plan updates.
