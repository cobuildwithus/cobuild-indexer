import { ponder } from "ponder:registry";

import { stakeVault } from "ponder:schema";
import {
  buildGoalNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
  getGoalStakeholderAccounts,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("GoalStakeVault:GoalResolved", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalStakeVault" });

  const existingVault = await context.db.find(stakeVault, { id: event.log.address });

  await context.db
    .insert(stakeVault)
    .values({
      id: event.log.address,
      kind: "goal",
      treasury: existingVault?.treasury ?? null,
      resolved: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      kind: "goal",
      treasury: existingVault?.treasury ?? null,
      resolved: true,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const goalTreasuryAddress = (existingVault?.treasury ?? null) as `0x${string}` | null;
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress,
  });
  const goalStakeholderAccounts = await getGoalStakeholderAccounts({
    context,
    goalTreasuryAddress,
  });
  if (!goalRow || goalStakeholderAccounts.length === 0) return;

  await emitProtocolNotifications({
    context,
    event,
    notifications: goalStakeholderAccounts.map((account) => ({
      recipientWalletAddress: account,
      reason: "underwriter_withdrawal_prep_required",
      sourceType: "underwriter_withdrawal_prep_state",
      sourceId: `${goalRow.id.toLowerCase()}:${account.toLowerCase()}`,
      notificationClass: "open_close" as const,
      action: "upsert" as const,
      payload: buildGoalNotificationPayload({
        role: "goal_stakeholder",
        goalRow,
        reason: "underwriter_withdrawal_prep_required",
      }),
    })),
  });
});
