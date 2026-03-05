import { ponder } from "ponder:registry";

import { budgetStack } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import {
  terminalizationRetriedStatus,
  upsertBudgetStackStatus
} from "./budget-stack-status";

ponder.on("BudgetTCR:BudgetStackTerminalizationRetried", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTCR" });

  await upsertBudgetStackStatus({
    db: context.db,
    table: budgetStack,
    itemId: event.args.itemID,
    status: terminalizationRetriedStatus(event.args.terminallyResolved),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
});
