import { ponder } from "ponder:registry";

import { tcrItem } from "ponder:schema";
import { tcrItemId } from "../helpers/ids";
import { getBigIntArg, getHexArg } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { getMechanismNotificationContext } from "./helpers";

ponder.on("AllocationMechanismTCR:ItemSubmitted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "AllocationMechanismTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  if (!itemId) return;

  const mechanismContext = await getMechanismNotificationContext({
    context,
    mechanismTcrAddress: tcrAddress,
  });
  const evidenceGroupId = getBigIntArg(event.args, "_evidenceGroupID", "evidenceGroupID");
  const submitter = getHexArg(event.args, "_submitter", "submitter");
  const itemData = getHexArg(event.args, "_data", "data");

  await context.db
    .insert(tcrItem)
    .values({
      id: tcrItemId(tcrAddress, itemId),
      tcrAddress,
      tcrKind: "mechanism",
      itemId,
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      submitter,
      evidenceGroupId,
      itemData,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      tcrKind: "mechanism",
      goalTreasury: mechanismContext.goalRow?.id ?? mechanismContext.goalTreasury,
      budgetTreasury: mechanismContext.budgetTreasury,
      submitter,
      evidenceGroupId,
      itemData,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
