import { ponder } from "ponder:registry";

import { tcrItem } from "ponder:schema";
import { tcrItemId } from "../helpers/ids";
import { getBigIntArg, getHexArg } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { getMechanismNotificationContext } from "./helpers";

ponder.on("AllocationMechanismTCR:ItemStatusChange", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "AllocationMechanismTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  const itemStatus = getBigIntArg(event.args, "_itemStatus", "itemStatus");
  if (!itemId) return;

  const mechanismContext = await getMechanismNotificationContext({
    context,
    mechanismTcrAddress: tcrAddress,
  });

  await context.db
    .insert(tcrItem)
    .values({
      id: tcrItemId(tcrAddress, itemId),
      tcrAddress,
      tcrKind: "mechanism",
      itemId,
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      latestRequestIndex: requestIndex,
      currentStatus: itemStatus === null ? null : Number(itemStatus),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      tcrKind: "mechanism",
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      latestRequestIndex: requestIndex,
      currentStatus: itemStatus === null ? null : Number(itemStatus),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
