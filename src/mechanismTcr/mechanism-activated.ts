import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { budgetMechanismRegistry, tcrItem, tcrRequest } from "ponder:schema";
import { tcrItemId, tcrRequestId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  collectRecipientRoles,
  emitProtocolNotifications,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { getMechanismNotificationContext } from "./helpers";

ponder.on("AllocationMechanismTCR:MechanismActivated", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "AllocationMechanismTCR" });

  const tcrAddress = event.log.address as Hex;
  const itemId = event.args.itemID as Hex;
  const mechanismContext = await getMechanismNotificationContext({
    context,
    mechanismTcrAddress: tcrAddress,
  });
  const goalRow = mechanismContext.goalRow;
  if (!goalRow) return;

  await context.db.update(budgetMechanismRegistry, { id: tcrAddress }).set({
    activeItemId: itemId,
    activeMechanism: event.args.mechanism,
    activeFundingEscrow: event.args.fundingEscrow,
    activePayoutRecipient: event.args.payoutRecipient,
    activeDeploymentArbitrator: event.args.arbitrator,
    activeAuxiliary: event.args.auxiliary,
    activatedAt: event.block.timestamp,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  const existingItem = await context.db.find(tcrItem, {
    id: tcrItemId(tcrAddress, itemId),
  });
  const requestIndex = BigInt(existingItem?.latestRequestIndex ?? -1);
  if (requestIndex < 0n) return;

  const existingRequest = await context.db.find(tcrRequest, {
    id: tcrRequestId(tcrAddress, itemId, requestIndex),
  });
  const requester = (existingRequest?.requester ?? null) as `0x${string}` | null;
  const recipients = collectRecipientRoles({
    budgetController: mechanismContext.budgetController,
    budgetUnderwriterAccounts: mechanismContext.underwriterAccounts,
    requestActors: [
      { address: requester, role: "requester" },
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
      reason: "mechanism_activated",
      sourceType: "mechanism_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:mechanism_activated`,
      actorWalletAddress: requester,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "mechanism_activated",
        itemId,
        requestIndex,
        budgetTreasury: mechanismContext.budgetTreasury,
        actorWalletAddress: requester,
      }),
    })),
  });
});
