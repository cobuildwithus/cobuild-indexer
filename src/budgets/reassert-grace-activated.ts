import { ponder } from "ponder:registry";
import { eq } from "drizzle-orm";

import { budgetTreasury } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("BudgetTreasury:ReassertGraceActivated", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  await context.db.sql
    .update(budgetTreasury)
    .set({
      successAssertionId: event.args.clearedAssertionId,
      reassertGraceDeadline: event.args.graceDeadline,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .where(eq(budgetTreasury.id, event.log.address));
});
