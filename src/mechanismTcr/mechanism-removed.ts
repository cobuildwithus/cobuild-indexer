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

ponder.on("AllocationMechanismTCR:MechanismRemoved", async ({ event, context }) => {
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
    activeItemId: null,
    activeMechanism: null,
    activeFundingEscrow: null,
    activePayoutRecipient: null,
    activeDeploymentArbitrator: null,
    activeAuxiliary: null,
    activatedAt: null,
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
      reason: "mechanism_removed",
      sourceType: "mechanism_request",
      sourceId: `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}:mechanism_removed`,
      actorWalletAddress: requester,
      payload: buildGoalNotificationPayload({
        role: recipient.role,
        goalRow,
        reason: "mechanism_removed",
        itemId,
        requestIndex,
        budgetTreasury: mechanismContext.budgetTreasury,
        actorWalletAddress: requester,
      }),
    })),
  });
});
