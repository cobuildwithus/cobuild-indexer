import { type Context, type Event, ponder } from "ponder:registry";
import type { Hex } from "viem";
import {
  activityLog,
  goalContributorAggregate,
  goalTreasuriesByProject,
  participant,
  payEvent,
  payEventByTxBeneficiary,
  project,
  suckerGroup,
} from "ponder:schema";
import { refreshProjectCashoutCoefficients } from "../../lib/cashout-coefficients";
import { formatAmount } from "../../util/format-amount";

ponder.on("JBMultiTerminal:Pay", pay);

function goalContributorAggregateId(goalTreasuryAddress: Hex, contributor: Hex): string {
  return `${goalTreasuryAddress.toLowerCase()}:${contributor.toLowerCase()}`;
}

async function loadGoalTreasuriesForSuckerGroup(args: {
  context: Context<"JBMultiTerminal:Pay">;
  suckerGroupId: string;
}): Promise<Array<{ goalTreasury: Hex }>> {
  const { context, suckerGroupId } = args;
  const group = await context.db.find(suckerGroup, { id: suckerGroupId });
  if (!group || group.projects.length === 0) return [];

  const projectKeys = Array.from(new Set(group.projects));
  const mappings = await Promise.all(
    projectKeys.map((projectKey) => context.db.find(goalTreasuriesByProject, { id: projectKey }))
  );

  const goalTreasurySet = new Set<Hex>();
  for (const mapping of mappings) {
    if (!mapping) continue;
    for (const value of mapping.goalTreasuries) {
      goalTreasurySet.add(value);
    }
  }

  return Array.from(goalTreasurySet)
    .sort()
    .map((goalTreasury) => ({ goalTreasury }));
}

async function applyGoalContributorAggregateDelta(args: {
  context: Context<"JBMultiTerminal:Pay">;
  event: Event<"JBMultiTerminal:Pay">;
  payer: Hex;
  amount: bigint;
  suckerGroupId: string;
}) {
  const { context, event, payer, amount, suckerGroupId } = args;
  const contributor = payer.toLowerCase() as Hex;
  const eventTimestamp = event.block.timestamp;
  const eventTxHash = event.transaction.hash;
  const goals = await loadGoalTreasuriesForSuckerGroup({ context, suckerGroupId });
  if (goals.length === 0) return;

  for (const goal of goals) {
    const aggregateId = goalContributorAggregateId(goal.goalTreasury, contributor);
    const existing = await context.db.find(goalContributorAggregate, { id: aggregateId });

    if (!existing) {
      await context.db.insert(goalContributorAggregate).values({
        id: aggregateId,
        goalTreasury: goal.goalTreasury,
        contributor,
        totalContributed: amount,
        contributionCount: 1,
        firstContributedAt: eventTimestamp,
        lastContributedAt: eventTimestamp,
        firstContributionTxHash: eventTxHash,
        lastContributionTxHash: eventTxHash,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
      continue;
    }

    let firstContributedAt = existing.firstContributedAt;
    let firstContributionTxHash = existing.firstContributionTxHash;
    if (eventTimestamp < existing.firstContributedAt) {
      firstContributedAt = eventTimestamp;
      firstContributionTxHash = eventTxHash;
    }

    let lastContributedAt = existing.lastContributedAt;
    let lastContributionTxHash = existing.lastContributionTxHash;
    if (eventTimestamp > existing.lastContributedAt) {
      lastContributedAt = eventTimestamp;
      lastContributionTxHash = eventTxHash;
    }

    await context.db.update(goalContributorAggregate, { id: aggregateId }).set({
      totalContributed: existing.totalContributed + amount,
      contributionCount: existing.contributionCount + 1,
      firstContributedAt,
      lastContributedAt,
      firstContributionTxHash,
      lastContributionTxHash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
  }
}

async function pay(params: {
  event: Event<"JBMultiTerminal:Pay">;
  context: Context<"JBMultiTerminal:Pay">;
}) {
  const { context, event } = params;
  const { args } = event;

  const {
    projectId: _projectId,
    amount,
    payer,
    rulesetId,
    rulesetCycleNumber,
    beneficiary,
    newlyIssuedTokenCount,
    memo,
    metadata,
    caller,
  } = args;
  const { id: chainId } = context.chain;
  const projectId = Number(_projectId);

  const payerParticipant = await context.db.find(participant, {
    address: payer,
    projectId,
    chainId,
  });

  const updatedProject = await context.db
    .update(project, {
      projectId,
      chainId,
    })
    .set((p) => ({
      balance: p.balance + amount,
      paymentsCount: p.paymentsCount + 1,
      contributorsCount: p.contributorsCount + (payerParticipant ? 0 : 1),
      currentRulesetId: rulesetId,
    }));

  if (!updatedProject.suckerGroupId) {
    throw new Error("Project has no sucker group id");
  }
  const suckerGroupId = updatedProject.suckerGroupId;

  const insertedPayEvent = await context.db.insert(payEvent).values({
    chainId,
    txHash: event.transaction.hash,
    timestamp: event.block.timestamp,
    caller,
    from: event.transaction.from,
    logIndex: event.log.logIndex,
    projectId,
    rulesetId,
    rulesetCycleNumber,
    txnValue: event.transaction.value.toString(),
    payer,
    beneficiary,
    amount,
    newlyIssuedTokenCount,
    buybackTokenCount: 0n,
    effectiveTokenCount: newlyIssuedTokenCount,
    memo,
    metadata,
    suckerGroupId,
  });

  await context.db
    .insert(payEventByTxBeneficiary)
    .values({
      chainId,
      txHash: event.transaction.hash,
      beneficiary,
      payEventId: insertedPayEvent.id,
      payLogIndex: event.log.logIndex,
    })
    .onConflictDoUpdate(() => ({
      payEventId: insertedPayEvent.id,
      payLogIndex: event.log.logIndex,
    }));

  if (newlyIssuedTokenCount > 0) {
    await applyGoalContributorAggregateDelta({
      context,
      event,
      payer,
      amount,
      suckerGroupId,
    });

    await context.db.insert(activityLog).values({
      type: "pay",
      user: beneficiary,
      amount: formatAmount(amount, updatedProject.accountingDecimals ?? 18),
      currency: updatedProject.accountingTokenSymbol || "ETH",
      description: `got ${formatAmount(newlyIssuedTokenCount, 18)} $${
        updatedProject.erc20Symbol
      }`,
      memo: memo || undefined,
      chainId,
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
      suckerGroupId,
    });
  }

  await refreshProjectCashoutCoefficients({
    db: context.db,
    chainId,
    projectId,
    snapshot: {
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    },
  });
}
