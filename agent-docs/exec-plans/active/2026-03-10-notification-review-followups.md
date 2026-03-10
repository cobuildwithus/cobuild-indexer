# 2026-03-10 Notification Review Follow-ups

## Goal

Tighten protocol notification correctness after the review pass without changing the single-inbox delivery model.

## Scope

- Add explicit notification lifecycle classes for append-only, open/close, and cyclical protocol rows.
- Keep premium-escrow topology explicit through indexed lookup edges.
- Make withdrawal-prep notifications invalidate the open state instead of emitting duplicate completion history.
- Ensure `premium_claimable` only opens once linkage is resolvable and can reopen with a fresh cycle source id.
- Keep shared payload semantics stable while downstream consumers move to a shared presenter.
- Add the remaining user-facing success-assertion notification reasons for goal and budget treasury flows.
- Expand budget and mechanism lifecycle fanout to controller-like roles without weakening deterministic recipient resolution.
- Preserve exact payload refs needed for more specific downstream app routing.

## Constraints

- Keep handlers replay-safe and deterministic.
- Do not add wall-clock gating or contract reads.
- Prefer explicit lookup tables over inferred joins across partially-populated rows.
- Preserve `reason`, `resource`, and recipient payload semantics already consumed downstream.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm docs:drift`
- `pnpm docs:gardening`
