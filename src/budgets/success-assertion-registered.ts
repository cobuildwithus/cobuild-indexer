import { ponder } from "ponder:registry";

import { budgetTreasury, treasurySuccessAssertionContext } from "ponder:schema";
import { reassertGraceReminderSourceId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitBudgetAudienceNotification } from "./notification-fanout";

ponder.on("BudgetTreasury:SuccessAssertionRegistered", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  const existingBudget = await context.db.find(budgetTreasury, { id: event.log.address });
  const previousAssertionId = existingBudget?.successAssertionId ?? null;
  const previousReassertGraceDeadline = existingBudget?.reassertGraceDeadline ?? null;

  await context.db
    .update(budgetTreasury, { id: event.log.address })
    .set({
      successAssertionId: event.args.assertionId,
      successAssertionRegisteredAt: event.args.assertedAt,
      reassertGraceDeadline: null,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await context.db
    .insert(treasurySuccessAssertionContext)
    .values({
      id: event.args.assertionId,
      scope: "budget",
      treasury: event.log.address,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      scope: "budget",
      treasury: event.log.address,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  await emitBudgetAudienceNotification({
    context,
    event,
    budgetTreasuryAddress: event.log.address,
    reason: "budget_success_assertion_registered",
    sourceType: "budget_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}:budget_success_assertion_registered`,
    includeBudgetController: true,
    includeBudgetUnderwriters: true,
    includeRequestActors: true,
  });

  if (previousAssertionId && previousReassertGraceDeadline) {
    await emitBudgetAudienceNotification({
      context,
      event,
      budgetTreasuryAddress: event.log.address,
      reason: "budget_success_assertion_reassert_grace_ending_soon",
      sourceType: "budget_success_assertion_reassert_grace_reminder",
      sourceId: reassertGraceReminderSourceId(event.log.address, previousAssertionId),
      notificationClass: "cycle",
      action: "invalidate",
      includeBudgetController: true,
      includeBudgetUnderwriters: true,
      includeRequestActors: true,
      schedule: {
        reassertGraceDeadline: previousReassertGraceDeadline,
      },
    });
  }
});
