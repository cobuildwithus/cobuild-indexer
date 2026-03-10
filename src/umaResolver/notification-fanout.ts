import { budgetTreasury, goalTreasury, treasurySuccessAssertionContext } from "ponder:schema";
import type { Hex } from "viem";

import { emitBudgetAudienceNotification } from "../budgets/notification-fanout";
import { emitGoalAudienceNotification } from "../goals/notification-fanout";

type ResolverNotificationContext = Parameters<typeof emitGoalAudienceNotification>[0]["context"];
type ResolverNotificationEvent = Parameters<typeof emitGoalAudienceNotification>[0]["event"];

async function resolveTreasuryTarget(args: {
  context: ResolverNotificationContext;
  treasuryAddress?: Hex | null | undefined;
  assertionId?: Hex | null | undefined;
}): Promise<{ scope: "goal" | "budget"; treasury: Hex } | null> {
  const treasuryAddress = (args.treasuryAddress ?? null) as Hex | null;
  if (treasuryAddress) {
    const goalRow = await args.context.db.find(goalTreasury, { id: treasuryAddress });
    if (goalRow) {
      return { scope: "goal", treasury: treasuryAddress };
    }

    const budgetRow = await args.context.db.find(budgetTreasury, { id: treasuryAddress });
    if (budgetRow) {
      return { scope: "budget", treasury: treasuryAddress };
    }
  }

  const assertionId = (args.assertionId ?? null) as Hex | null;
  if (!assertionId) return null;

  const assertionContext = await args.context.db.find(treasurySuccessAssertionContext, {
    id: assertionId,
  });
  if (!assertionContext?.treasury) return null;

  return {
    scope: assertionContext.scope === "budget" ? "budget" : "goal",
    treasury: assertionContext.treasury as Hex,
  };
}

export async function emitResolverLifecycleNotification(args: {
  context: ResolverNotificationContext;
  event: ResolverNotificationEvent;
  treasuryAddress?: Hex | null | undefined;
  assertionId?: Hex | null | undefined;
  goalReason: string;
  budgetReason: string;
  sourceState: string;
  actorWalletAddress?: Hex | null | undefined;
}): Promise<void> {
  const target = await resolveTreasuryTarget({
    context: args.context,
    treasuryAddress: args.treasuryAddress,
    assertionId: args.assertionId,
  });
  if (!target) return;

  const sourceIdBase = args.assertionId
    ? `${target.treasury.toLowerCase()}:${args.assertionId.toLowerCase()}:${args.sourceState}`
    : `${target.treasury.toLowerCase()}:${args.event.transaction.hash.toLowerCase()}:${args.event.log.logIndex}:${args.sourceState}`;

  if (target.scope === "goal") {
    await emitGoalAudienceNotification({
      context: args.context,
      event: args.event,
      goalTreasuryAddress: target.treasury,
      reason: args.goalReason,
      sourceType: "goal_success_assertion",
      sourceId: sourceIdBase,
      actorWalletAddress: (args.actorWalletAddress ?? null) as Hex | null,
    });
    return;
  }

  await emitBudgetAudienceNotification({
    context: args.context,
    event: args.event,
    budgetTreasuryAddress: target.treasury,
    reason: args.budgetReason,
    sourceType: "budget_success_assertion",
    sourceId: sourceIdBase,
    actorWalletAddress: (args.actorWalletAddress ?? null) as Hex | null,
    includeBudgetController: true,
    includeBudgetUnderwriters: true,
    includeRequestActors: true,
  });
}
