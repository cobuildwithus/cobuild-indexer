import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitBudgetAudienceNotification } from "./notification-fanout";

ponder.on("BudgetTreasury:SuccessAssertionFinalizeFailed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });

  await emitBudgetAudienceNotification({
    context,
    event,
    budgetTreasuryAddress: event.log.address,
    reason: "budget_success_assertion_finalize_failed",
    sourceType: "budget_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.args.assertionId.toLowerCase()}:budget_success_assertion_finalize_failed`,
    includeBudgetController: true,
    includeBudgetUnderwriters: true,
    includeRequestActors: true,
  });
});
