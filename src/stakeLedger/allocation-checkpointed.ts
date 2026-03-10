import { ponder } from "ponder:registry";
import { allocationCheckpoint, budgetTreasury, goalContextByBudgetStakeLedger } from "ponder:schema";

import { getGoalRow, syncBudgetUnderwriterAudience } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetStakeLedger:AllocationCheckpointed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetStakeLedger" });

  await context.db
    .insert(allocationCheckpoint)
    .values({
      id: event.id,
      account: event.args.account,
      budget: event.args.budget,
      allocatedStake: event.args.allocatedStake,
      checkpointTimestamp: event.args.checkpointTime,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  const goalContext = await context.db.find(goalContextByBudgetStakeLedger, {
    id: event.log.address,
  });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });
  if (!goalRow) return;

  const budgetRow = await context.db.find(budgetTreasury, { id: event.args.budget });

  await syncBudgetUnderwriterAudience({
    context,
    goalTreasuryAddress: goalRow.id,
    stakeVaultAddress: goalRow.stakeVault,
    budgetTreasuryAddress: event.args.budget,
    recipientId: (budgetRow?.recipientId ?? null) as `0x${string}` | null,
    account: event.args.account,
    allocatedStake: event.args.allocatedStake,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
