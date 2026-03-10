import { type Context, type Event, ponder } from "ponder:registry";
import {
  flow,
  goalFactoryDeployment,
  goalContextByArbitrator,
  goalContextByBudgetStakeLedger,
  goalContextByBudgetTcr,
  goalStakeholderAudience,
  goalTreasuriesByProject,
  goalTreasury,
  project,
  stakeVault,
} from "ponder:schema";
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

function goalTreasuriesByProjectKey(args: { chainId: number; projectId: number }): string {
  return `${args.chainId}-${args.projectId}`;
}

function uniqueSortedGoalTreasuries(values: Hex[]): Hex[] {
  return Array.from(new Set(values)).sort() as Hex[];
}

function hexArraysEqual(a: Hex[], b: Hex[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function handleGoalConfigured(args: {
  event: Event<"GoalTreasury:GoalConfigured">;
  context: Context<"GoalTreasury:GoalConfigured">;
  contractName: "GoalTreasury";
}) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const treasury = event.log.address as Hex;
  const existingGoalTreasury = await context.db.find(goalTreasury, { id: treasury });
  const canonicalProjectId = toCanonicalProjectId(event.args.goalRevnetId);
  const canonicalProjectChainId = canonicalProjectId === null ? null : context.chain.id;
  const previousProjectKey =
    existingGoalTreasury?.canonicalProjectChainId !== null &&
    existingGoalTreasury?.canonicalProjectChainId !== undefined &&
    existingGoalTreasury?.canonicalProjectId !== null &&
    existingGoalTreasury?.canonicalProjectId !== undefined
      ? goalTreasuriesByProjectKey({
          chainId: existingGoalTreasury.canonicalProjectChainId,
          projectId: existingGoalTreasury.canonicalProjectId,
        })
      : null;
  const nextProjectKey =
    canonicalProjectChainId !== null && canonicalProjectId !== null
      ? goalTreasuriesByProjectKey({
          chainId: canonicalProjectChainId,
          projectId: canonicalProjectId,
        })
      : null;
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
  const configuredFlow = await context.db.find(flow, { id: event.args.flow });
  const goalTreasuryValues = {
    owner: event.args.owner,
    flowAddress: event.args.flow,
    stakeVault: event.args.stakeVault,
    budgetStakeLedger: event.args.budgetStakeLedger,
    goalToken: event.args.goalToken,
    cobuildToken: event.args.cobuildToken,
    hook: event.args.hook,
    goalRulesets: event.args.goalRulesets,
    successResolver: event.args.successResolver,
    goalRevnetId: event.args.goalRevnetId,
    canonicalProjectChainId,
    canonicalProjectId,
    canonicalRouteSlug,
    canonicalRouteDomain,
    jurorSlasher: event.args.jurorSlasher,
    underwriterSlasher: event.args.underwriterSlasher,
    minRaiseDeadline: event.args.minRaiseDeadline,
    deadline: event.args.deadline,
    minRaise: event.args.minRaise,
    parentFlow: (configuredFlow?.parentFlow ?? null) as Hex | null,
    strategy: (configuredFlow?.strategy ?? null) as Hex | null,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  };

  await context.db
    .insert(goalTreasury)
    .values({
      id: treasury,
      ...goalTreasuryValues,
      state: null,
      finalized: false,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate(goalTreasuryValues);

  if (previousProjectKey && previousProjectKey !== nextProjectKey) {
    const previousMapping = await context.db.find(goalTreasuriesByProject, {
      id: previousProjectKey,
    });

    if (previousMapping) {
      const nextGoalTreasuries = uniqueSortedGoalTreasuries(
        previousMapping.goalTreasuries.filter((value: Hex) => value !== treasury)
      );

      if (!hexArraysEqual(previousMapping.goalTreasuries, nextGoalTreasuries)) {
        await context.db.update(goalTreasuriesByProject, { id: previousProjectKey }).set({
          goalTreasuries: nextGoalTreasuries,
          updatedAtBlock: event.block.number,
          updatedAtTimestamp: event.block.timestamp,
        });
      }
    }
  }

  if (nextProjectKey) {
    const existingMapping = await context.db.find(goalTreasuriesByProject, {
      id: nextProjectKey,
    });

    if (!existingMapping) {
      await context.db.insert(goalTreasuriesByProject).values({
        id: nextProjectKey,
        goalTreasuries: [treasury],
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
    } else {
      const nextGoalTreasuries = uniqueSortedGoalTreasuries([
        ...existingMapping.goalTreasuries,
        treasury,
      ]);

      if (!hexArraysEqual(existingMapping.goalTreasuries, nextGoalTreasuries)) {
        await context.db.update(goalTreasuriesByProject, { id: nextProjectKey }).set({
          goalTreasuries: nextGoalTreasuries,
          updatedAtBlock: event.block.number,
          updatedAtTimestamp: event.block.timestamp,
        });
      }
    }
  }

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

  const factoryDeploymentId = `${context.chain.id}:${event.args.goalRevnetId.toString()}`;
  const goalDeployment = await context.db.find(goalFactoryDeployment, { id: factoryDeploymentId });

  if (goalDeployment?.budgetTcr) {
    await context.db
      .insert(goalContextByBudgetTcr)
      .values({
        id: goalDeployment.budgetTcr,
        goalTreasury: treasury,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        goalTreasury: treasury,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }

  if (goalDeployment?.arbitrator) {
    await context.db
      .insert(goalContextByArbitrator)
      .values({
        id: goalDeployment.arbitrator,
        goalTreasury: treasury,
        stakeVault: event.args.stakeVault,
        budgetTcr: goalDeployment.budgetTcr,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        goalTreasury: treasury,
        stakeVault: event.args.stakeVault,
        budgetTcr: goalDeployment.budgetTcr,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }

  await context.db
    .insert(goalContextByBudgetStakeLedger)
    .values({
      id: event.args.budgetStakeLedger,
      goalTreasury: treasury,
      budgetTcr: goalDeployment?.budgetTcr ?? null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: treasury,
      budgetTcr: goalDeployment?.budgetTcr ?? null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(goalStakeholderAudience)
    .values({
      id: treasury,
      stakeVault: event.args.stakeVault,
      accounts: [],
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      stakeVault: event.args.stakeVault,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalTreasury:GoalConfigured", async ({ event, context }) => {
  await handleGoalConfigured({ event, context, contractName: "GoalTreasury" });
});
