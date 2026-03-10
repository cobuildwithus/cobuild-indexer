import { erc20VotesArbitratorAbi as ERC20VotesArbitratorAbi } from "@cobuild/wire";
import type { Context } from "ponder:registry";
import { arbitratorDispute, jurorVoteReceipt } from "ponder:schema";
import type { Hex } from "viem";

import {
  arbitratorDisputeId,
  jurorRewardClaimableCycleSourceId,
  jurorVoteReceiptId,
} from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";

export type RewardNotificationContext = Pick<
  Context<"ERC20VotesArbitrator:RewardWithdrawn">,
  "db" | "chain" | "client"
>;
type RewardNotificationEvent = Parameters<typeof emitProtocolNotifications>[0]["event"] & {
  transaction: { hash: Hex };
  block: { number: bigint; timestamp: bigint };
  log: { address: Hex; logIndex: number };
};

type GoalNotificationRow = Awaited<ReturnType<typeof getGoalRow>>;
type DisputeNotificationRow = {
  goalTreasury?: Hex | null;
  budgetTreasury?: Hex | null;
  itemId?: Hex | null;
  requestIndex?: bigint | null;
};

type RewardBucket = {
  bucket: string;
  bucketLabel: string;
};

function buildRewardBucket(args: {
  rewardAmount?: bigint | null;
  goalSlashAmount?: bigint | null;
  cobuildSlashAmount?: bigint | null;
}): RewardBucket | null {
  const rewardAmount = BigInt(args.rewardAmount ?? 0n);
  const goalSlashAmount = BigInt(args.goalSlashAmount ?? 0n);
  const cobuildSlashAmount = BigInt(args.cobuildSlashAmount ?? 0n);

  const buckets: RewardBucket[] = [];
  if (rewardAmount > 0n) {
    buckets.push({ bucket: "appeal_bonus", bucketLabel: "appeal bonus" });
  }
  if (goalSlashAmount > 0n) {
    buckets.push({ bucket: "goal_slash", bucketLabel: "goal slash" });
  }
  if (cobuildSlashAmount > 0n) {
    buckets.push({ bucket: "cobuild_slash", bucketLabel: "cobuild slash" });
  }

  if (buckets.length === 0) return null;
  if (buckets.length === 1) return buckets[0]!;
  return {
    bucket: "mixed",
    bucketLabel: "mixed",
  };
}

async function resolveDisputeRow(args: {
  context: RewardNotificationContext;
  arbitratorAddress: Hex;
  disputeId: bigint;
}): Promise<DisputeNotificationRow | null> {
  return (await args.context.db.find(arbitratorDispute, {
    id: arbitratorDisputeId(args.arbitratorAddress, args.disputeId),
  })) as DisputeNotificationRow | null;
}

async function resolveGoalRow(args: {
  context: RewardNotificationContext;
  disputeRow: DisputeNotificationRow | null;
}): Promise<GoalNotificationRow> {
  return getGoalRow({
    context: args.context,
    goalTreasuryAddress: (args.disputeRow?.goalTreasury ?? null) as Hex | null,
  });
}

export async function syncJurorRewardClaimableNotification(args: {
  context: RewardNotificationContext;
  event: RewardNotificationEvent;
  arbitratorAddress: Hex;
  disputeId: bigint;
  round: bigint;
  jurorAddress: Hex;
  disputeRow?: DisputeNotificationRow | null;
  goalRow?: GoalNotificationRow;
}): Promise<void> {
  const {
    context,
    event,
    arbitratorAddress,
    disputeId,
    round,
    jurorAddress,
  } = args;
  const disputeRow = args.disputeRow ?? (await resolveDisputeRow({ context, arbitratorAddress, disputeId }));
  if (!disputeRow) return;

  const goalRow = args.goalRow ?? (await resolveGoalRow({ context, disputeRow }));
  const receiptId = jurorVoteReceiptId(arbitratorAddress, disputeId, round, jurorAddress);
  const existingReceipt = await context.db.find(jurorVoteReceipt, {
    id: receiptId,
  });

  const status = await context.client.readContract({
    address: arbitratorAddress,
    abi: ERC20VotesArbitratorAbi,
    functionName: "getVoterRoundStatus",
    args: [disputeId, round, jurorAddress],
    blockNumber: event.block.number,
  });

  const nextClaimableReward = BigInt(status.claimableReward ?? 0n);
  const nextClaimableGoalSlashReward = BigInt(status.claimableGoalSlashReward ?? 0n);
  const nextClaimableCobuildSlashReward = BigInt(status.claimableCobuildSlashReward ?? 0n);
  const nextClaimableTotal =
    nextClaimableReward + nextClaimableGoalSlashReward + nextClaimableCobuildSlashReward;

  const previousClaimableReward = BigInt(existingReceipt?.claimableRewardAmount ?? 0n);
  const previousClaimableGoalSlashReward = BigInt(
    existingReceipt?.claimableGoalSlashRewardAmount ?? 0n
  );
  const previousClaimableCobuildSlashReward = BigInt(
    existingReceipt?.claimableCobuildSlashRewardAmount ?? 0n
  );
  const existingSourceId =
    typeof existingReceipt?.claimableNotificationSourceId === "string" &&
    existingReceipt.claimableNotificationSourceId.trim() !== ""
      ? existingReceipt.claimableNotificationSourceId
      : null;
  const nextSourceId =
    nextClaimableTotal <= 0n
      ? null
      : existingSourceId ??
        jurorRewardClaimableCycleSourceId(
          arbitratorAddress,
          disputeId,
          round,
          jurorAddress,
          event.transaction.hash,
          event.log.logIndex
        );

  await context.db
    .insert(jurorVoteReceipt)
    .values({
      id: receiptId,
      arbitrator: arbitratorAddress,
      disputeId,
      round,
      jurorAddress,
      hasCommitted: false,
      hasRevealed: false,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(jurorVoteReceipt, { id: receiptId }).set({
    claimableRewardAmount: nextClaimableReward,
    claimableGoalSlashRewardAmount: nextClaimableGoalSlashReward,
    claimableCobuildSlashRewardAmount: nextClaimableCobuildSlashReward,
    claimableNotificationSourceId: nextSourceId,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  const claimableChanged =
    previousClaimableReward !== nextClaimableReward ||
    previousClaimableGoalSlashReward !== nextClaimableGoalSlashReward ||
    previousClaimableCobuildSlashReward !== nextClaimableCobuildSlashReward;
  const shouldUpsert = nextClaimableTotal > 0n && (existingSourceId === null || claimableChanged);
  const shouldInvalidate = nextClaimableTotal <= 0n && existingSourceId !== null && claimableChanged;
  if (!shouldUpsert && !shouldInvalidate) return;

  const sourceId = shouldUpsert ? nextSourceId : existingSourceId;
  if (!sourceId) return;

  await emitProtocolNotifications({
    context,
    event,
    notifications: [
      {
        recipientWalletAddress: jurorAddress,
        reason: "juror_reward_claimable",
        sourceType: "juror_reward_claimable_cycle",
        sourceId,
        notificationClass: "cycle",
        action: shouldUpsert ? "upsert" : "invalidate",
        payload: buildProtocolNotificationPayload({
          role: "juror",
          goalRow,
          reason: "juror_reward_claimable",
          itemId: (disputeRow.itemId ?? null) as Hex | null,
          requestIndex: disputeRow.requestIndex ?? null,
          budgetTreasury: (disputeRow.budgetTreasury ?? null) as Hex | null,
          arbitrator: arbitratorAddress,
          disputeId,
          amounts: {
            claimable: nextClaimableTotal,
            claimableReward: nextClaimableReward,
            claimableGoalSlashReward: nextClaimableGoalSlashReward,
            claimableCobuildSlashReward: nextClaimableCobuildSlashReward,
          },
          reward: buildRewardBucket({
            rewardAmount: nextClaimableReward,
            goalSlashAmount: nextClaimableGoalSlashReward,
            cobuildSlashAmount: nextClaimableCobuildSlashReward,
          }),
        }),
      },
    ],
  });
}

export async function emitJurorRewardClaimedNotification(args: {
  context: RewardNotificationContext;
  event: RewardNotificationEvent;
  arbitratorAddress: Hex;
  disputeId: bigint;
  round: bigint;
  jurorAddress: Hex;
  rewardAmount: bigint;
  goalSlashAmount: bigint;
  cobuildSlashAmount: bigint;
}): Promise<void> {
  const totalClaimed = args.rewardAmount + args.goalSlashAmount + args.cobuildSlashAmount;
  if (totalClaimed <= 0n) return;

  const disputeRow = await resolveDisputeRow({
    context: args.context,
    arbitratorAddress: args.arbitratorAddress,
    disputeId: args.disputeId,
  });
  if (!disputeRow) return;
  const goalRow = await resolveGoalRow({
    context: args.context,
    disputeRow,
  });

  await emitProtocolNotifications({
    context: args.context,
    event: args.event,
    notifications: [
      {
        recipientWalletAddress: args.jurorAddress,
        reason: "juror_reward_claimed",
        sourceType: "juror_reward_claim",
        sourceId: [
          args.arbitratorAddress.toLowerCase(),
          args.disputeId.toString(),
          args.round.toString(),
          args.jurorAddress.toLowerCase(),
          args.event.transaction.hash.toLowerCase(),
          args.event.log.logIndex.toString(),
        ].join(":"),
        payload: buildProtocolNotificationPayload({
          role: "juror",
          goalRow,
          reason: "juror_reward_claimed",
          itemId: (disputeRow.itemId ?? null) as Hex | null,
          requestIndex: disputeRow.requestIndex ?? null,
          budgetTreasury: (disputeRow.budgetTreasury ?? null) as Hex | null,
          arbitrator: args.arbitratorAddress,
          disputeId: args.disputeId,
          amounts: {
            claimedAmount: totalClaimed,
            claimedReward: args.rewardAmount,
            claimedGoalSlashReward: args.goalSlashAmount,
            claimedCobuildSlashReward: args.cobuildSlashAmount,
          },
          reward: buildRewardBucket({
            rewardAmount: args.rewardAmount,
            goalSlashAmount: args.goalSlashAmount,
            cobuildSlashAmount: args.cobuildSlashAmount,
          }),
        }),
      },
    ],
  });
}
