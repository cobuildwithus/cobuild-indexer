import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { arbitratorDispute, jurorVoteReceipt } from "ponder:schema";
import {
  arbitratorDisputeId,
  jurorPhaseReminderSourceId,
  jurorVoteReceiptId,
} from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleVoteCommitted(args: {
  contractName: "ERC20VotesArbitrator" | "MechanismERC20VotesArbitrator";
  event: Parameters<typeof insertProtocolEvent>[0]["event"] & {
    args: {
      disputeId: bigint;
      voter: Hex;
      commitHash: Hex;
    };
    log: { address: Hex; logIndex: number };
  };
  context: Parameters<typeof insertProtocolEvent>[0]["context"];
}): Promise<void> {
  const { contractName, event, context } = args;
  await insertProtocolEvent({ context, event, contractName });

  const arbitratorAddress = event.log.address as Hex;
  const round = 0n;
  const receiptId = jurorVoteReceiptId(arbitratorAddress, event.args.disputeId, round, event.args.voter);

  await context.db
    .insert(jurorVoteReceipt)
    .values({
      id: receiptId,
      arbitrator: arbitratorAddress,
      disputeId: event.args.disputeId,
      round,
      jurorAddress: event.args.voter,
      hasCommitted: false,
      hasRevealed: false,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(jurorVoteReceipt, { id: receiptId }).set({
    hasCommitted: true,
    commitHash: event.args.commitHash,
    committedAt: event.block.timestamp,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  const disputeRow = await context.db.find(arbitratorDispute, {
    id: arbitratorDisputeId(arbitratorAddress, event.args.disputeId),
  });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: disputeRow?.goalTreasury ?? null,
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: [
      {
        recipientWalletAddress: event.args.voter,
        reason: "juror_vote_deadline_soon",
        sourceType: "juror_dispute_phase_deadline",
        sourceId: jurorPhaseReminderSourceId(
          arbitratorAddress,
          event.args.disputeId,
          round,
          "juror_vote_deadline_soon"
        ),
        notificationClass: "cycle" as const,
        action: "invalidate" as const,
        payload: buildProtocolNotificationPayload({
          role: "juror",
          goalRow,
          reason: "juror_vote_deadline_soon",
          itemId: (disputeRow?.itemId ?? null) as `0x${string}` | null,
          requestIndex: disputeRow?.requestIndex ?? null,
          budgetTreasury: (disputeRow?.budgetTreasury ?? null) as `0x${string}` | null,
          arbitrator: arbitratorAddress,
          disputeId: event.args.disputeId,
        }),
      },
    ],
  });
}

ponder.on("ERC20VotesArbitrator:VoteCommitted", async ({ event, context }) => {
  await handleVoteCommitted({
    contractName: "ERC20VotesArbitrator",
    event,
    context,
  });
});

ponder.on("MechanismERC20VotesArbitrator:VoteCommitted", async ({ event, context }) => {
  await handleVoteCommitted({
    contractName: "MechanismERC20VotesArbitrator",
    event,
    context,
  });
});
