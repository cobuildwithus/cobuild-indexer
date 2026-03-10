import { ponder } from "ponder:registry";
import { tcrItem } from "ponder:schema";
import { tcrItemId } from "../helpers/ids";
import { getBigIntArg, getHexArg } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:ItemStatusChange", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  const requestIndex = getBigIntArg(event.args, "_requestIndex", "requestIndex");
  const itemStatus = getBigIntArg(event.args, "_itemStatus", "itemStatus");
  if (!itemId) return;

  await context.db
    .insert(tcrItem)
    .values({
      id: tcrItemId(tcrAddress, itemId),
      tcrAddress,
      itemId,
      latestRequestIndex: requestIndex,
      currentStatus: itemStatus === null ? null : Number(itemStatus),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      latestRequestIndex: requestIndex,
      currentStatus: itemStatus === null ? null : Number(itemStatus),
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
