import { ponder } from "ponder:registry";
import { arbitratorDispute, budgetTreasuryByRecipient, goalContextByBudgetTcr, tcrItem, tcrRequest } from "ponder:schema";
import { arbitratorDisputeId, tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
  getBigIntArg,
  getBudgetUnderwriterAccounts,
  getGoalRow,
  getGoalStakeholderAccounts,
  getHexArg,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCRProtocolEvents:Dispute", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const disputeId = getBigIntArg(event.args, "_disputeID", "disputeID");
  const arbitratorAddress = getHexArg(event.args, "_arbitrator", "arbitrator");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  const challenger = getHexArg(event.args, "_challenger", "challenger");
  if (!itemId || disputeId === null || requestIndex === null || !challenger) return;

  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });

  const requestId = tcrRequestId(tcrAddress, itemId, requestIndex);
  const existingRequest = await context.db.find(tcrRequest, { id: requestId });
  const goalContext = await context.db.find(goalContextByBudgetTcr, { id: tcrAddress });
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: existingRequest?.goalTreasury ?? goalContext?.goalTreasury ?? null,
  });
  if (!goalRow) return;

  const stakeholders = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress: goalRow.id,
  });
  const budgetLink =
    existingRequest?.requestType === "clearing"
      ? await context.db.find(budgetTreasuryByRecipient, { id: itemId })
      : null;
  const budgetTreasury = (budgetLink?.budgetTreasury ?? null) as `0x${string}` | null;

  await context.db
    .insert(tcrRequest)
    .values({
      id: requestId,
      tcrAddress,
      tcrKind: "budget",
      itemId,
      requestIndex,
      goalTreasury: goalRow.id,
      budgetTreasury,
      requestType: existingRequest?.requestType ?? "unknown",
      requester: existingRequest?.requester ?? null,
      challenger,
      disputeId,
      challengedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalRow.id,
      tcrKind: "budget",
      budgetTreasury,
      requester: existingRequest?.requester ?? null,
      challenger,
      disputeId,
      challengedAt: event.block.timestamp,
      txHash: event.transaction.hash,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const reason =
    existingRequest?.requestType === "clearing"
      ? "budget_removal_challenged"
      : "budget_proposal_challenged";
  const budgetUnderwriters =
    existingRequest?.requestType === "clearing"
      ? await getBudgetUnderwriterAccounts({
          context,
          budgetTreasuryAddress: budgetTreasury,
        })
      : [];
  const disputeRow = arbitratorAddress
    ? await context.db.find(arbitratorDispute, {
        id: arbitratorDisputeId(arbitratorAddress, disputeId),
      })
    : null;
  if (arbitratorAddress) {
    await context.db
      .insert(arbitratorDispute)
      .values({
        id: arbitratorDisputeId(arbitratorAddress, disputeId),
        arbitrator: arbitratorAddress,
        arbitrable: tcrAddress,
        goalTreasury: goalRow.id,
        stakeVault: goalRow.stakeVault,
        budgetTreasury,
        tcrAddress,
        tcrKind: "budget",
        itemId,
        requestIndex,
        disputeId,
        currentRound: 0n,
        jurorAddresses: Array.isArray(disputeRow?.jurorAddresses)
          ? (disputeRow.jurorAddresses as `0x${string}`[])
          : [],
        votingStartTime: disputeRow?.votingStartTime ?? null,
        votingEndTime: disputeRow?.votingEndTime ?? null,
        revealPeriodEndTime: disputeRow?.revealPeriodEndTime ?? null,
        creationBlock: disputeRow?.creationBlock ?? null,
        arbitrationCost: disputeRow?.arbitrationCost ?? null,
        extraData: disputeRow?.extraData ?? null,
        choices: disputeRow?.choices ?? null,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        arbitrable: tcrAddress,
        goalTreasury: goalRow.id,
        stakeVault: goalRow.stakeVault,
        budgetTreasury,
        tcrAddress,
        tcrKind: "budget",
        itemId,
        requestIndex,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });
  }

  const recipients = collectRecipientRoles({
    goalOwner: (goalRow.owner ?? null) as `0x${string}` | null,
    stakeholderAccounts: stakeholders,
    budgetUnderwriterAccounts: budgetUnderwriters,
    requestActors: [
      {
        address: (existingRequest?.requester ?? null) as `0x${string}` | null,
        role: "requester",
      },
      { address: challenger, role: "challenger" },
      {
        address: (existingItem?.submitter ?? null) as `0x${string}` | null,
        role: "proposer",
      },
    ],
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: recipients.map((recipient) => ({
      recipientWalletAddress: recipient.recipientWalletAddress,
      reason,
      sourceType: "budget_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:${reason}`,
      actorWalletAddress: challenger,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason,
        itemId,
        requestIndex,
        budgetTreasury,
        actorWalletAddress: challenger,
        arbitrator: arbitratorAddress,
        disputeId,
      }),
    })),
  });
});
