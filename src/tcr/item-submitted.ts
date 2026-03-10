import { ponder } from "ponder:registry";
import { goalContextByBudgetTcr, tcrItem } from "ponder:schema";
import { tcrItemId } from "../helpers/ids";
import { getBigIntArg, getHexArg } from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTCR:ItemSubmitted", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  const tcrAddress = event.log.address;
  const itemId = getHexArg(event.args, "_itemID", "itemID");
  if (!itemId) return;

  const goalContext = await context.db.find(goalContextByBudgetTcr, { id: tcrAddress });
  const evidenceGroupId = getBigIntArg(event.args, "_evidenceGroupID", "evidenceGroupID");
  const submitter = getHexArg(event.args, "_submitter", "submitter");
  const itemData = getHexArg(event.args, "_data", "data");

  await context.db
    .insert(tcrItem)
    .values({
      id: tcrItemId(tcrAddress, itemId),
      tcrAddress,
      itemId,
      goalTreasury: goalContext?.goalTreasury ?? null,
      submitter,
      evidenceGroupId,
      itemData,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: goalContext?.goalTreasury ?? null,
      submitter,
      evidenceGroupId,
      itemData,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
});
