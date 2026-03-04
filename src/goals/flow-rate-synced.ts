import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { goalTreasury, goalTreasurySeries, goalTreasurySeriesCursor } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalTreasury:FlowRateSynced", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  const treasuryId = event.log.address as Hex;
  const nextBalance = event.args.treasuryBalance;
  const cursor = await context.db.find(goalTreasurySeriesCursor, { id: treasuryId });
  const previousBalance = cursor?.lastBalance ?? 0n;
  const delta = nextBalance - previousBalance;
  const inflow = delta > 0n ? delta : 0n;
  const outflow = delta < 0n ? -delta : 0n;

  await context.db.update(goalTreasury, { id: treasuryId }).set({
    lastSyncedTargetRate: event.args.targetRate,
    lastSyncedAppliedRate: event.args.appliedRate,
    lastSyncedTreasuryBalance: nextBalance,
    lastSyncedTimeRemaining: event.args.timeRemaining,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  await context.db
    .insert(goalTreasurySeries)
    .values({
      id: event.id,
      goalTreasury: treasuryId,
      sourceEventName: "FlowRateSynced",
      inflow,
      outflow,
      balance: nextBalance,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      sourceEventName: "FlowRateSynced",
      inflow,
      outflow,
      balance: nextBalance,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
    });

  await context.db
    .insert(goalTreasurySeriesCursor)
    .values({
      id: treasuryId,
      lastSeriesId: event.id,
      lastBalance: nextBalance,
      lastBlockNumber: event.block.number,
      lastTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      lastSeriesId: event.id,
      lastBalance: nextBalance,
      lastBlockNumber: event.block.number,
      lastTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
