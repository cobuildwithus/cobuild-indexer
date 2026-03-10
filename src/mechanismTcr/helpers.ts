import { budgetContextByMechanismTcr, budgetTreasury as budgetTreasuryTable } from "ponder:schema";
import type { Hex } from "viem";

import {
  getBudgetUnderwriterAccounts,
  getGoalRow,
} from "../helpers/protocolNotifications";

type NotificationContext = Parameters<typeof getGoalRow>[0]["context"];
type GoalRow = Awaited<ReturnType<typeof getGoalRow>>;

export async function getMechanismNotificationContext(args: {
  context: NotificationContext;
  mechanismTcrAddress: Hex;
}): Promise<{
  goalRow: GoalRow;
  budgetTreasury: Hex | null;
  budgetController: Hex | null;
  goalTreasury: Hex | null;
  stakeVault: Hex | null;
  budgetTcr: Hex | null;
  recipientId: Hex | null;
  underwriterAccounts: Hex[];
}> {
  const mechanismContext = await args.context.db.find(budgetContextByMechanismTcr, {
    id: args.mechanismTcrAddress,
  });
  const goalRow = await getGoalRow({
    context: args.context,
    goalTreasuryAddress: (mechanismContext?.goalTreasury ?? null) as Hex | null,
  });
  const budgetTreasury = (mechanismContext?.budgetTreasury ?? null) as Hex | null;
  const budgetRow = budgetTreasury
    ? await args.context.db.find(budgetTreasuryTable, { id: budgetTreasury })
    : null;
  const underwriterAccounts = await getBudgetUnderwriterAccounts({
    context: args.context,
    budgetTreasuryAddress: budgetTreasury,
  });

  return {
    goalRow,
    budgetTreasury,
    budgetController: (budgetRow?.controller ?? null) as Hex | null,
    goalTreasury: (mechanismContext?.goalTreasury ?? null) as Hex | null,
    stakeVault: (mechanismContext?.stakeVault ?? null) as Hex | null,
    budgetTcr: (mechanismContext?.budgetTcr ?? null) as Hex | null,
    recipientId: (mechanismContext?.recipientId ?? null) as Hex | null,
    underwriterAccounts,
  };
}
