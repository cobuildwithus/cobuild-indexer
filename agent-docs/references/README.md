# References

This directory holds high-signal references used by agents for implementation and review.

## Reference Types

1. Internal maps (`*.md`)
- Repository-specific runtime, handler, schema, API, and CI maps.
- Treat these as canonical operational context.

2. External packs (`*-llms.txt`)
- Curated links to primary upstream docs.
- Keep concise and version-aware.

## Internal Maps

- `agent-docs/references/module-boundary-map.md`
- `agent-docs/references/event-handler-map.md`
- `agent-docs/references/schema-relations-map.md`
- `agent-docs/references/rpc-chain-config-map.md`
- `agent-docs/references/address-abi-provenance.md`
- `agent-docs/references/api-query-surface.md`
- `agent-docs/references/testing-ci-map.md`

## External Packs

- `agent-docs/references/ponder-llms.txt`
- `agent-docs/references/viem-llms.txt`
- `agent-docs/references/wagmi-cli-llms.txt`
- `agent-docs/references/hono-llms.txt`
- `agent-docs/references/juice-sdk-core-llms.txt`

## Maintenance Rules

- Update these files when behavior, dependencies, or workflows change.
- Keep links primary-source first (official docs, upstream repos/specs).
- Keep this directory indexed in `agent-docs/index.md`.
