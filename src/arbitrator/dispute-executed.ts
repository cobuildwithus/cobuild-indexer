import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
  arbitratorDispute,
  jurorDisputeMember,
  jurorVoteReceipt,
  tcrItem,
  tcrRequest,
} from "ponder:schema";
import {
  arbitratorDisputeId,
  jurorDisputeMemberId,
  jurorVoteReceiptId,
  tcrItemId,
  tcrRequestId,
} from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleDisputeExecuted(args: {
  contractName: "ERC20VotesArbitrator" | "MechanismERC20VotesArbitrator";
  event: Parameters<typeof emitProtocolNotifications>[0]["event"] & {
    args: {
      disputeId: bigint;
      ruling: number;
    };
    log: { address: Hex; logIndex: number };
  };
  context: Parameters<typeof insertProtocolEvent>[0]["context"];
}): Promise<void> {
  const { contractName, event, context } = args;
  await insertProtocolEvent({ context, event, contractName });

  const arbitratorAddress = event.log.address as Hex;
  const disputeKey = arbitratorDisputeId(arbitratorAddress, event.args.disputeId);
  const disputeRow = await context.db.find(arbitratorDispute, { id: disputeKey });

  await context.db
    .insert(arbitratorDispute)
    .values({
      id: disputeKey,
      arbitrator: arbitratorAddress,
      disputeId: event.args.disputeId,
      currentRound: 0n,
      jurorAddresses: [],
      ruling: Number(event.args.ruling),
      executedAt: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      ruling: Number(event.args.ruling),
      executedAt: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: disputeRow?.goalTreasury ?? null,
  });
  const jurorAddresses = Array.isArray(disputeRow?.jurorAddresses)
    ? (disputeRow?.jurorAddresses as Hex[])
    : [];

  const requestRow =
    disputeRow?.tcrAddress && disputeRow.itemId && disputeRow.requestIndex !== null && disputeRow.requestIndex !== undefined
      ? await context.db.find(tcrRequest, {
          id: tcrRequestId(disputeRow.tcrAddress, disputeRow.itemId, disputeRow.requestIndex),
        })
      : null;
  const itemRow =
    disputeRow?.tcrAddress && disputeRow.itemId
      ? await context.db.find(tcrItem, {
          id: tcrItemId(disputeRow.tcrAddress, disputeRow.itemId),
        })
      : null;

  const finalRecipients = collectRecipientRoles({
    jurorAccounts: jurorAddresses,
    requestActors: [
      {
        address: (requestRow?.requester ?? null) as `0x${string}` | null,
        role: "requester",
      },
      {
        address: (requestRow?.challenger ?? null) as `0x${string}` | null,
        role: "challenger",
      },
      {
        address: (itemRow?.submitter ?? null) as `0x${string}` | null,
        role: "proposer",
      },
    ],
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: finalRecipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason: "juror_ruling_final",
      sourceType: "juror_dispute",
      sourceId: `${arbitratorAddress.toLowerCase()}:${event.args.disputeId.toString()}:juror_ruling_final`,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "juror_ruling_final",
        itemId: disputeRow?.itemId ?? null,
        requestIndex: disputeRow?.requestIndex ?? null,
        budgetTreasury: (disputeRow?.budgetTreasury ?? null) as `0x${string}` | null,
        arbitrator: arbitratorAddress,
        disputeId: event.args.disputeId,
      }),
    })),
  });

  const slashableNotifications = [];
  const rulingValue = BigInt(event.args.ruling);
  for (const jurorAddress of jurorAddresses) {
    const member = await context.db.find(jurorDisputeMember, {
      id: jurorDisputeMemberId(arbitratorAddress, event.args.disputeId, jurorAddress),
    });
    const snapshotWeight = BigInt(member?.snapshotWeight ?? 0n);
    if (snapshotWeight <= 0n) continue;

    const receipt = await context.db.find(jurorVoteReceipt, {
      id: jurorVoteReceiptId(arbitratorAddress, event.args.disputeId, 0n, jurorAddress),
    });
    const hasRevealed = Boolean(receipt?.hasRevealed);
    const choice =
      receipt?.choice === null || receipt?.choice === undefined ? null : BigInt(receipt.choice);
    const slashable =
      !hasRevealed || (rulingValue !== 0n && choice !== null && choice !== rulingValue);
    if (!slashable) continue;

    slashableNotifications.push({
      recipientWalletAddress: jurorAddress,
      reason: "juror_slashable",
      sourceType: "juror_dispute",
      sourceId: `${arbitratorAddress.toLowerCase()}:${event.args.disputeId.toString()}:juror_slashable`,
      payload: buildGoalNotificationPayload({
        role: "juror",
        goalRow,
        reason: "juror_slashable",
        itemId: disputeRow?.itemId ?? null,
        requestIndex: disputeRow?.requestIndex ?? null,
        budgetTreasury: (disputeRow?.budgetTreasury ?? null) as `0x${string}` | null,
        arbitrator: arbitratorAddress,
        disputeId: event.args.disputeId,
        amounts: {
          snapshotWeight,
        },
      }),
    });
  }

  await emitProtocolNotifications({
    context,
    event,
    notifications: slashableNotifications,
  });
}

ponder.on("ERC20VotesArbitrator:DisputeExecuted", async ({ event, context }) => {
  await handleDisputeExecuted({
    contractName: "ERC20VotesArbitrator",
    event,
    context,
  });
});

ponder.on("MechanismERC20VotesArbitrator:DisputeExecuted", async ({ event, context }) => {
  await handleDisputeExecuted({
    contractName: "MechanismERC20VotesArbitrator",
    event,
    context,
  });
});
