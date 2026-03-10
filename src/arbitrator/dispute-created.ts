import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import {
  arbitratorDispute,
  budgetContextByMechanismArbitrator,
  budgetContextByMechanismTcr,
  goalContextByArbitrator,
  juror,
  jurorDisputeMember,
} from "ponder:schema";
import {
  jurorPhaseReminderSourceId,
  arbitratorDisputeId,
  jurorDisputeMemberId,
  jurorId,
} from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotificationSchedules,
  emitProtocolNotifications,
  getGoalRow,
  getStakeVaultJurorAccounts,
  reminderDeliverAt,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

type ArbitratorNotificationContext = Parameters<typeof getGoalRow>[0]["context"];

type ArbitratorDisputeCreatedEvent = Parameters<
  typeof emitProtocolNotifications
>[0]["event"] & {
  args: {
    id: bigint;
    arbitrable: Hex;
    votingStartTime: bigint;
    votingEndTime: bigint;
    revealPeriodEndTime: bigint;
    creationBlock: bigint;
    arbitrationCost: bigint;
    extraData: Hex;
    choices: bigint;
  };
};

async function handleDisputeCreated(args: {
  contractName: "ERC20VotesArbitrator" | "MechanismERC20VotesArbitrator";
  event: ArbitratorDisputeCreatedEvent;
  context: ArbitratorNotificationContext;
}): Promise<void> {
  const { contractName, event, context } = args;
  await insertProtocolEvent({ context, event, contractName });

  const arbitratorAddress = event.log.address;
  const disputeId = event.args.id;
  const disputeKey = arbitratorDisputeId(arbitratorAddress, disputeId);
  const arbitrableAddress = event.args.arbitrable;

  const [goalArbitratorContext, mechanismArbitratorContext, mechanismTcrContext] =
    await Promise.all([
      context.db.find(goalContextByArbitrator, {
        id: arbitratorAddress,
      }),
      context.db.find(budgetContextByMechanismArbitrator, {
        id: arbitratorAddress,
      }),
      context.db.find(budgetContextByMechanismTcr, {
        id: arbitrableAddress,
      }),
    ]);

  const goalTreasury =
    (mechanismArbitratorContext?.goalTreasury ??
      mechanismTcrContext?.goalTreasury ??
      goalArbitratorContext?.goalTreasury ??
      null) as Hex | null;
  const budgetTreasury =
    (mechanismArbitratorContext?.budgetTreasury ??
      mechanismTcrContext?.budgetTreasury ??
      null) as Hex | null;
  const stakeVault =
    (mechanismArbitratorContext?.stakeVault ??
      mechanismTcrContext?.stakeVault ??
      goalArbitratorContext?.stakeVault ??
      null) as Hex | null;
  const tcrAddress =
    (mechanismArbitratorContext?.allocationMechanismTcr ??
      mechanismTcrContext?.id ??
      goalArbitratorContext?.budgetTcr ??
      arbitrableAddress) as Hex;
  const tcrKind =
    mechanismArbitratorContext || mechanismTcrContext ? "mechanism" : "budget";

  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalTreasury,
  });
  const resolvedStakeVault = (stakeVault ?? goalRow?.stakeVault ?? null) as Hex | null;
  const candidateJurors = resolvedStakeVault
    ? await getStakeVaultJurorAccounts({
        context,
        stakeVaultAddress: resolvedStakeVault,
      })
    : [];

  const snapshotJurors = resolvedStakeVault
    ? (
        await Promise.all(
          candidateJurors.map(async (jurorAddress) => {
            const jurorRow = await context.db.find(juror, {
              id: jurorId(resolvedStakeVault, jurorAddress),
            });
            const snapshotWeight = BigInt(jurorRow?.currentJurorWeight ?? 0n);
            if (snapshotWeight <= 0n) return null;
            return {
              jurorAddress,
              snapshotWeight,
            };
          })
        )
      ).filter((value): value is { jurorAddress: Hex; snapshotWeight: bigint } => value !== null)
    : [];

  const jurorAddresses = snapshotJurors.map(({ jurorAddress }) => jurorAddress);

  await context.db
    .insert(arbitratorDispute)
    .values({
      id: disputeKey,
      arbitrator: arbitratorAddress,
      arbitrable: arbitrableAddress,
      goalTreasury,
      stakeVault: resolvedStakeVault,
      budgetTreasury,
      tcrAddress,
      tcrKind,
      disputeId,
      currentRound: 0n,
      jurorAddresses,
      votingStartTime: event.args.votingStartTime,
      votingEndTime: event.args.votingEndTime,
      revealPeriodEndTime: event.args.revealPeriodEndTime,
      creationBlock: event.args.creationBlock,
      arbitrationCost: event.args.arbitrationCost,
      extraData: event.args.extraData,
      choices: event.args.choices,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      arbitrable: arbitrableAddress,
      goalTreasury,
      stakeVault: resolvedStakeVault,
      budgetTreasury,
      tcrAddress,
      tcrKind,
      jurorAddresses,
      votingStartTime: event.args.votingStartTime,
      votingEndTime: event.args.votingEndTime,
      revealPeriodEndTime: event.args.revealPeriodEndTime,
      creationBlock: event.args.creationBlock,
      arbitrationCost: event.args.arbitrationCost,
      extraData: event.args.extraData,
      choices: event.args.choices,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await Promise.all(
    snapshotJurors.map(({ jurorAddress, snapshotWeight }) =>
      context.db
        .insert(jurorDisputeMember)
        .values({
          id: jurorDisputeMemberId(arbitratorAddress, disputeId, jurorAddress),
          arbitrator: arbitratorAddress,
          disputeId,
          goalTreasury,
          stakeVault: resolvedStakeVault,
          jurorAddress,
          snapshotWeight,
          createdAtBlock: event.block.number,
          createdAtTimestamp: event.block.timestamp,
          updatedAtBlock: event.block.number,
          updatedAtTimestamp: event.block.timestamp,
        })
        .onConflictDoNothing()
    )
  );

  const jurorRecipients = collectRecipientRoles({
    jurorAccounts: jurorAddresses,
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: jurorRecipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason: "juror_dispute_created",
      sourceType: "juror_dispute",
      sourceId: `${arbitratorAddress.toLowerCase()}:${disputeId.toString()}:juror_dispute_created`,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "juror_dispute_created",
        budgetTreasury,
        arbitrator: arbitratorAddress,
        disputeId,
        schedule: {
          votingStartTime: event.args.votingStartTime,
          votingEndTime: event.args.votingEndTime,
          revealPeriodEndTime: event.args.revealPeriodEndTime,
        },
      }),
    })),
  });

  await emitProtocolNotificationSchedules({
    context,
    event,
    notifications: [
      ...jurorRecipients.map((recipient) => ({
        recipientWalletAddress: recipient.recipientWalletAddress,
        reason: "juror_voting_open" as const,
        sourceType: "juror_dispute_phase",
        sourceId: `${arbitratorAddress.toLowerCase()}:${disputeId.toString()}:juror_voting_open`,
        deliverAt: event.args.votingStartTime,
        payload: buildGoalNotificationPayload({
          role: recipient.role,
          goalRow,
          reason: "juror_voting_open",
          budgetTreasury,
          arbitrator: arbitratorAddress,
          disputeId,
          schedule: {
            deliverAt: event.args.votingStartTime,
            votingStartTime: event.args.votingStartTime,
            votingEndTime: event.args.votingEndTime,
            revealPeriodEndTime: event.args.revealPeriodEndTime,
          },
        }),
      })),
      ...jurorRecipients.map((recipient) => ({
        recipientWalletAddress: recipient.recipientWalletAddress,
        reason: "juror_reveal_open" as const,
        sourceType: "juror_dispute_phase",
        sourceId: `${arbitratorAddress.toLowerCase()}:${disputeId.toString()}:juror_reveal_open`,
        deliverAt: event.args.votingEndTime,
        payload: buildGoalNotificationPayload({
          role: recipient.role,
          goalRow,
          reason: "juror_reveal_open",
          budgetTreasury,
          arbitrator: arbitratorAddress,
          disputeId,
          schedule: {
            deliverAt: event.args.votingEndTime,
            votingStartTime: event.args.votingStartTime,
            votingEndTime: event.args.votingEndTime,
            revealPeriodEndTime: event.args.revealPeriodEndTime,
          },
        }),
      })),
      ...(() => {
        const deliverAt = reminderDeliverAt({
          windowStartAt: event.args.votingStartTime,
          windowEndAt: event.args.votingEndTime,
        });
        if (deliverAt === null) return [];
        return jurorRecipients.map((recipient) => ({
          recipientWalletAddress: recipient.recipientWalletAddress,
          reason: "juror_vote_deadline_soon" as const,
          sourceType: "juror_dispute_phase_deadline",
          sourceId: jurorPhaseReminderSourceId(
            arbitratorAddress,
            disputeId,
            0n,
            "juror_vote_deadline_soon"
          ),
          deliverAt,
          payload: buildGoalNotificationPayload({
            role: recipient.role,
            goalRow,
            reason: "juror_vote_deadline_soon",
            budgetTreasury,
            arbitrator: arbitratorAddress,
            disputeId,
            schedule: {
              deliverAt,
              votingStartTime: event.args.votingStartTime,
              votingEndTime: event.args.votingEndTime,
              revealPeriodEndTime: event.args.revealPeriodEndTime,
            },
          }),
        }));
      })(),
      ...(() => {
        const deliverAt = reminderDeliverAt({
          windowStartAt: event.args.votingEndTime,
          windowEndAt: event.args.revealPeriodEndTime,
        });
        if (deliverAt === null) return [];
        return jurorRecipients.map((recipient) => ({
          recipientWalletAddress: recipient.recipientWalletAddress,
          reason: "juror_reveal_deadline_soon" as const,
          sourceType: "juror_dispute_phase_deadline",
          sourceId: jurorPhaseReminderSourceId(
            arbitratorAddress,
            disputeId,
            0n,
            "juror_reveal_deadline_soon"
          ),
          deliverAt,
          payload: buildGoalNotificationPayload({
            role: recipient.role,
            goalRow,
            reason: "juror_reveal_deadline_soon",
            budgetTreasury,
            arbitrator: arbitratorAddress,
            disputeId,
            schedule: {
              deliverAt,
              votingStartTime: event.args.votingStartTime,
              votingEndTime: event.args.votingEndTime,
              revealPeriodEndTime: event.args.revealPeriodEndTime,
            },
          }),
        }));
      })(),
    ],
  });
}

ponder.on("ERC20VotesArbitrator:DisputeCreated", async ({ event, context }) => {
  await handleDisputeCreated({
    contractName: "ERC20VotesArbitrator",
    event,
    context,
  });
});

ponder.on("MechanismERC20VotesArbitrator:DisputeCreated", async ({ event, context }) => {
  await handleDisputeCreated({
    contractName: "MechanismERC20VotesArbitrator",
    event,
    context,
  });
});
