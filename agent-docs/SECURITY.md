# Security

## Hard Constraints

- Never access `.env` or `.env*` files.
- Treat RPC credentials, chain scope, and address maps as high-sensitivity boundaries.
- Validate assumptions at external-data boundaries in handlers and API routes.
- Do not expose internal infra configuration details in API responses or logs.

## Trust Boundaries

1. Onchain event boundary
- Indexed events are trusted only within configured chain/address/filter constraints.
- Source configuration lives in `ponder.config.ts` and `src/lib/config.ts`.

2. RPC/provider boundary
- Provider selection and fallback behavior is env-driven in `src/lib/rpc-transport.ts`.
- Provider ordering is an operational/security choice.

3. ABI/address provenance boundary
- Address constants and ABIs (`addresses*.ts`, `abis.ts`) define decode and attribution trust.
- Changes must be coordinated with filters and handlers.

4. Query exposure boundary
- GraphQL is mounted on `/` and `/graphql` in `src/api/index.ts`; deployment must enforce appropriate access controls.

## Security-Critical Paths

- `ponder.config.ts`
- `src/lib/rpc-transport.ts`
- `src/lib/config.ts`
- `src/api/index.ts`
- `src/contracts/cobuild-swap/batch-reaction-swap.ts`
- `src/contracts/token-bought/transfer.ts`

## Defensive Rules

- Keep event filters as narrow as practical for target scope.
- Avoid adding dynamic indexing surfaces without explicit provenance documentation.
- Treat enrichment reads (`readContract`) as untrusted external calls with bounded failure behavior.
- Keep API surface minimal and intentional; avoid accidental schema/data over-exposure.
- Keep audit/review packaging scripts fail-closed on sensitive files (`.env*`, keys, credential artifacts).

## Escalation

Escalate to humans for:

- chain scope changes,
- deployment address trust updates,
- API exposure/auth boundary changes,
- schema changes introducing sensitive identity or compliance implications,
- new external service or provider trust boundaries.
