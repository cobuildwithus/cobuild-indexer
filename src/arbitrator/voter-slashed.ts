import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { arbitratorDispute, jurorVoteReceipt } from "ponder:schema";
import { arbitratorDisputeId, jurorVoteReceiptId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import {
  type RewardNotificationContext,
  syncJurorRewardClaimableNotification,
} from "./reward-notifications";

async function handleVoterSlashed(args: {
  contractName: "ERC20VotesArbitrator" | "MechanismERC20VotesArbitrator";
  event: Parameters<typeof emitProtocolNotifications>[0]["event"] & {
    args: {
      disputeId: bigint;
      round: bigint;
      voter: Hex;
      snapshotVotes: bigint;
      slashWeight: bigint;
      missedReveal: boolean;
      recipient: Hex;
    };
    log: { address: Hex; logIndex: number };
  };
  context: RewardNotificationContext;
}): Promise<void> {
  const { contractName, event, context } = args;
  await insertProtocolEvent({ context, event, contractName });

  const arbitratorAddress = event.log.address as Hex;
  const receiptId = jurorVoteReceiptId(
    arbitratorAddress,
    event.args.disputeId,
    event.args.round,
    event.args.voter
  );

  await context.db
    .insert(jurorVoteReceipt)
    .values({
      id: receiptId,
      arbitrator: arbitratorAddress,
      disputeId: event.args.disputeId,
      round: event.args.round,
      jurorAddress: event.args.voter,
      hasCommitted: false,
      hasRevealed: false,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(jurorVoteReceipt, { id: receiptId }).set({
    snapshotVotes: event.args.snapshotVotes,
    slashWeight: event.args.slashWeight,
    missedReveal: event.args.missedReveal,
    slashRecipient: event.args.recipient,
    slashedAt: event.block.timestamp,
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
        reason: "juror_slashed",
        sourceType: "juror_slash",
        sourceId: `${arbitratorAddress.toLowerCase()}:${event.args.disputeId.toString()}:${event.args.round.toString()}:juror_slashed`,
        payload: buildGoalNotificationPayload({
          role: "juror",
          goalRow,
          reason: "juror_slashed",
          budgetTreasury: (disputeRow?.budgetTreasury ?? null) as `0x${string}` | null,
          arbitrator: arbitratorAddress,
          disputeId: event.args.disputeId,
          amounts: {
            snapshotVotes: event.args.snapshotVotes,
            slashWeight: event.args.slashWeight,
          },
        }),
      },
    ],
  });

  const jurorAddresses = Array.isArray(disputeRow?.jurorAddresses)
    ? (disputeRow.jurorAddresses as Hex[])
    : [];
  await Promise.all(
    jurorAddresses.map((jurorAddress) =>
      syncJurorRewardClaimableNotification({
        context,
        event,
        arbitratorAddress,
        disputeId: event.args.disputeId,
        round: event.args.round,
        jurorAddress,
        disputeRow,
        goalRow,
      })
    )
  );
}

ponder.on("ERC20VotesArbitrator:VoterSlashed", async ({ event, context }) => {
  await handleVoterSlashed({
    contractName: "ERC20VotesArbitrator",
    event,
    context,
  });
});

ponder.on("MechanismERC20VotesArbitrator:VoterSlashed", async ({ event, context }) => {
  await handleVoterSlashed({
    contractName: "MechanismERC20VotesArbitrator",
    event,
    context,
  });
});
