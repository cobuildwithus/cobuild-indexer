import { ponder } from "ponder:registry";
import { goalTreasury, project, stakeVault } from "ponder:schema";
import type { Hex } from "viem";

import { insertProtocolEvent } from "../helpers/protocolEvent";

function toCanonicalProjectId(value: bigint): number | null {
  const projectId = Number(value);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) return null;
  return projectId;
}

function stripSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function parseCanonicalRoute(domainValue: string | null | undefined): {
  canonicalRouteSlug: string | null;
  canonicalRouteDomain: string | null;
} {
  const raw = domainValue?.trim().toLowerCase() ?? "";
  if (!raw) return { canonicalRouteSlug: null, canonicalRouteDomain: null };

  const withScheme = raw.includes("://") ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    const host = parsed.hostname.trim().toLowerCase();
    const path = stripSlashes(parsed.pathname.trim().toLowerCase());
    if (path) {
      return {
        canonicalRouteSlug: path.split("/").filter(Boolean).at(-1) ?? null,
        canonicalRouteDomain: host || null,
      };
    }

    if (host && !host.includes(".")) {
      return { canonicalRouteSlug: host, canonicalRouteDomain: null };
    }

    return { canonicalRouteSlug: host || null, canonicalRouteDomain: host || null };
  } catch {
    const token = stripSlashes(raw);
    if (!token) return { canonicalRouteSlug: null, canonicalRouteDomain: null };
    if (token.includes(".")) {
      return { canonicalRouteSlug: token, canonicalRouteDomain: token };
    }
    return { canonicalRouteSlug: token, canonicalRouteDomain: null };
  }
}

ponder.on("GoalTreasury:GoalConfigured", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  const treasury = event.log.address as Hex;
  const canonicalProjectId = toCanonicalProjectId(event.args.goalRevnetId);
  const canonicalProjectChainId = canonicalProjectId === null ? null : context.chain.id;
  const canonicalProject =
    canonicalProjectId === null
      ? null
      : await context.db.find(project, {
          chainId: context.chain.id,
          projectId: canonicalProjectId,
        });
  const parsedRoute = parseCanonicalRoute(canonicalProject?.domain);
  const canonicalRouteSlug = parsedRoute.canonicalRouteSlug ?? treasury.toLowerCase();
  const canonicalRouteDomain = parsedRoute.canonicalRouteDomain;

  await context.db
    .insert(goalTreasury)
    .values({
      id: treasury,
      owner: event.args.owner,
      flowAddress: event.args.flow,
      stakeVault: event.args.stakeVault,
      budgetStakeLedger: event.args.budgetStakeLedger,
      hook: event.args.hook,
      goalRulesets: event.args.goalRulesets,
      goalRevnetId: event.args.goalRevnetId,
      canonicalProjectChainId,
      canonicalProjectId,
      canonicalRouteSlug,
      canonicalRouteDomain,
      minRaiseDeadline: event.args.minRaiseDeadline,
      deadline: event.args.deadline,
      minRaise: event.args.minRaise,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      owner: event.args.owner,
      flowAddress: event.args.flow,
      stakeVault: event.args.stakeVault,
      budgetStakeLedger: event.args.budgetStakeLedger,
      hook: event.args.hook,
      goalRulesets: event.args.goalRulesets,
      goalRevnetId: event.args.goalRevnetId,
      canonicalProjectChainId,
      canonicalProjectId,
      canonicalRouteSlug,
      canonicalRouteDomain,
      minRaiseDeadline: event.args.minRaiseDeadline,
      deadline: event.args.deadline,
      minRaise: event.args.minRaise,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(stakeVault)
    .values({
      id: event.args.stakeVault,
      kind: "goal",
      treasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      kind: "goal",
      treasury,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
