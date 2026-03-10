import { ponder } from "ponder:registry";

import { budgetTreasury } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitBudgetAudienceNotification } from "./notification-fanout";

ponder.on("BudgetTreasury:SuccessAssertionResolutionFailClosed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  const existingBudget = await context.db.find(budgetTreasury, { id: event.log.address });

  await emitBudgetAudienceNotification({
    context,
    event,
    budgetTreasuryAddress: event.log.address,
    reason: "budget_success_assertion_resolution_fail_closed",
    sourceType: "budget_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}:budget_success_assertion_resolution_fail_closed`,
    includeBudgetController: true,
    includeBudgetUnderwriters: true,
    includeRequestActors: true,
  });

  if (existingBudget?.successAssertionId && existingBudget?.reassertGraceDeadline) {
    await emitBudgetAudienceNotification({
      context,
      event,
      budgetTreasuryAddress: event.log.address,
      reason: "budget_success_assertion_reassert_grace_ending_soon",
      sourceType: "budget_success_assertion_reassert_grace_reminder",
      sourceId: reassertGraceReminderSourceId(event.log.address, existingBudget.successAssertionId),
      notificationClass: "cycle",
      action: "invalidate",
      includeBudgetController: true,
      includeBudgetUnderwriters: true,
      includeRequestActors: true,
      schedule: {
        reassertGraceDeadline: existingBudget.reassertGraceDeadline,
      },
    });
  }
});
