# Cobuild Indexer Agent Docs Index

Last verified: 2026-03-11 (dynamic goal token scope cutover)

## Purpose

This index is the table of contents for durable, repository-local context that agents should use.

## Canonical Docs

| Path | Purpose | Source of truth | Owner | Review cadence | Criticality | Last verified |
| --- | --- | --- | --- | --- | --- | --- |
| `ARCHITECTURE.md` | Top-level runtime/domain map and invariants. | `src/**`, `ponder.config.ts`, `ponder.schema.ts` | Indexer Maintainers | Per architecture PR | High | 2026-03-11 |
| `agent-docs/design-docs/index.md` | Index for durable design/principles docs. | `agent-docs/design-docs/**` | Indexer Maintainers | Monthly | Medium | 2026-02-25 |
| `agent-docs/design-docs/core-beliefs.md` | Core beliefs for agent-first repository operations. | Team process + architecture decisions | Indexer Maintainers | Quarterly | Medium | 2026-02-25 |
| `agent-docs/product-specs/index.md` | Index for product/projection constraints. | `agent-docs/product-specs/**` | Indexer + Product Consumers | Monthly | High | 2026-02-25 |
| `agent-docs/product-specs/indexer-projections.md` | Projection behavior and consumer contract constraints. | `src/contracts/**`, `ponder.schema.ts`, `src/api/index.ts` | Indexer Maintainers | Per behavior-change PR | High | 2026-03-10 |
| `agent-docs/PLANS.md` | Plan workflow and storage conventions. | `agent-docs/exec-plans/**` | Indexer Maintainers | Per process change | Medium | 2026-02-25 |
| `agent-docs/PRODUCT_SENSE.md` | Consumer-facing behavior expectations for indexer outputs. | Downstream data consumers and query usage | Indexer + Product Consumers | Monthly | Medium | 2026-02-25 |
| `agent-docs/QUALITY_SCORE.md` | Quality posture tracker by subsystem. | Architecture docs + lint/typecheck + audits | Indexer Maintainers | Bi-weekly | Medium | 2026-03-07 |
| `agent-docs/RELIABILITY.md` | Replay/determinism guardrails and failure modes. | `src/contracts/**`, `ponder.schema.ts`, config + cron behavior | Indexer Maintainers | Per reliability-affecting PR | High | 2026-03-05 |
| `agent-docs/SECURITY.md` | Security constraints, trust boundaries, and escalation rules. | RPC/config boundaries, API surface, data exposure paths | Indexer Maintainers | Per security-affecting PR | High | 2026-02-25 |
| `agent-docs/operations/verification-and-runtime.md` | Required verification matrix, runtime guardrails, and coordination workflow. | `package.json`, `.github/workflows/**`, scripts | Indexer Maintainers | Per process/CI PR | High | 2026-02-25 |
| `agent-docs/operations/completion-workflow.md` | Simplify/coverage/completion-audit workflow for non-doc changes, including unrelated required-check failure commit handling. | Completion workflow + prompts | Indexer Maintainers | Per process change | High | 2026-03-12 |
| `agent-docs/prompts/simplify.md` | Reusable simplification pass prompt for behavior-preserving cleanup. | Completion workflow | Indexer Maintainers | Per process change | Medium | 2026-02-25 |
| `agent-docs/prompts/test-coverage-audit.md` | Reusable test-coverage audit prompt for high-impact regression reduction. | Completion workflow | Indexer Maintainers | Per process change | Medium | 2026-02-25 |
| `agent-docs/prompts/task-finish-review.md` | Reusable final completion audit prompt for correctness/security review. | Completion workflow | Indexer Maintainers | Per process change | Medium | 2026-02-25 |
| `agent-docs/references/README.md` | Internal/external reference packs for implementation and review. | `agent-docs/references/**` | Indexer Maintainers | Monthly | Medium | 2026-02-25 |
| `agent-docs/references/module-boundary-map.md` | Layer ownership and dependency-direction map for indexer surfaces. | `src/**`, `ponder.config.ts`, `ponder.schema.ts`, scripts | Indexer Maintainers | Per architecture-boundary PR | High | 2026-02-25 |
| `agent-docs/references/event-handler-map.md` | Event/block handler inventory and touched tables. | `src/**`, `ponder.config.ts` | Indexer Maintainers | Per indexed-event PR | High | 2026-03-11 |
| `agent-docs/references/schema-relations-map.md` | Table/PK/index/relations map and identifier semantics. | `ponder.schema.ts` | Indexer Maintainers | Per schema PR | High | 2026-03-10 |
| `agent-docs/references/rpc-chain-config-map.md` | Chain scope, start-block, and RPC failover model. | `src/lib/config.ts`, `src/lib/rpc-transport.ts`, `ponder.config.ts` | Indexer Maintainers | Per infra/config PR | High | 2026-03-11 |
| `agent-docs/references/address-abi-provenance.md` | Address and ABI source-of-truth and update workflow. | `addresses*.ts`, `wagmi.config.ts`, `abis.ts` | Indexer Maintainers | Per deployment/ABI PR | High | 2026-03-10 |
| `agent-docs/references/api-query-surface.md` | GraphQL/API surface, expectations, and caveats. | `src/api/index.ts`, schema/query consumers | Indexer Maintainers | Per API/query-contract PR | High | 2026-02-25 |
| `agent-docs/references/testing-ci-map.md` | Verification and CI enforcement map, including published-wire dependency guards. | `.github/workflows/**`, `scripts/**`, package scripts | Indexer Maintainers | Per CI/process PR | Medium | 2026-03-07 |
| `agent-docs/references/ponder-llms.txt` | External Ponder reference pack. | Ponder docs | Indexer Maintainers | Quarterly | Low | 2026-02-25 |
| `agent-docs/references/viem-llms.txt` | External Viem reference pack. | Viem docs | Indexer Maintainers | Quarterly | Low | 2026-02-25 |
| `agent-docs/references/wagmi-cli-llms.txt` | External Wagmi CLI reference pack. | Wagmi CLI docs | Indexer Maintainers | Quarterly | Low | 2026-02-25 |
| `agent-docs/references/hono-llms.txt` | External Hono reference pack for API boundary behavior. | Hono docs | Indexer Maintainers | Quarterly | Low | 2026-02-25 |
| `agent-docs/references/juice-sdk-core-llms.txt` | External Juice SDK reference pack used by handlers. | Juice SDK docs + source | Indexer Maintainers | Quarterly | Low | 2026-02-25 |
| `agent-docs/generated/README.md` | Generated doc artifacts produced by scripts. | `agent-docs/generated/**` | Indexer Maintainers | Per script change | Medium | 2026-02-25 |
| `agent-docs/exec-plans/` | Execution plans for active and completed work. | PR-linked plan docs | Indexer Maintainers | Per multi-file/high-risk PR | High | 2026-03-11 |
| `agent-docs/exec-plans/tech-debt-tracker.md` | Rolling debt register with owner/priority/status. | Audits, incidents, reviews | Indexer Maintainers | Bi-weekly | Medium | 2026-02-25 |

## Conventions

- Keep AGENTS files short and route-oriented.
- Update this index whenever docs are added, removed, or moved.
- For multi-file/high-risk work, add a plan in `agent-docs/exec-plans/active/`.
- Keep `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` current for active coding tasks.
- Active treasury terminal failure event sync plan: `agent-docs/exec-plans/active/2026-03-09-treasury-terminal-failure-event-sync.md`.
- Active TCR request-actor event sync plan: `agent-docs/exec-plans/active/2026-03-10-tcr-request-actor-event-sync.md`.
- Active notification completeness pass plan: `agent-docs/exec-plans/active/2026-03-10-notification-review-followups.md`.
- Active factory-discovery cutover plan: `agent-docs/exec-plans/active/2026-03-05-factory-discovery-cutover.md`.
