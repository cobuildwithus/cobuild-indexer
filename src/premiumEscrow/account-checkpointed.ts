import { ponder } from "ponder:registry";

import {
  goalContextByBudgetTreasury,
  premiumAccount,
  premiumEscrow,
} from "ponder:schema";
import {
  premiumAccountId,
  premiumClaimableCycleSourceId,
} from "../helpers/ids";
import {
  buildProtocolNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:AccountCheckpointed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.account;
  const accountId = premiumAccountId(escrow, account);
  const existingAccount = await context.db.find(premiumAccount, { id: accountId });
  const previousClaimable = BigInt(existingAccount?.claimableAmount ?? 0n);
  const nextClaimable = BigInt(event.args.claimableAmount);
  const existingClaimableNotificationSourceId =
    typeof existingAccount?.claimableNotificationSourceId === "string" &&
    existingAccount.claimableNotificationSourceId.trim() !== ""
      ? existingAccount.claimableNotificationSourceId
      : null;
  const escrowRow = await context.db.find(premiumEscrow, { id: escrow });
  const budgetTreasuryAddress = (escrowRow?.budgetTreasury ?? null) as `0x${string}` | null;
  const nextClaimableNotificationSourceId =
    nextClaimable <= 0n
      ? null
      : existingClaimableNotificationSourceId ??
        (budgetTreasuryAddress
          ? premiumClaimableCycleSourceId(
              escrow,
              account,
              event.transaction.hash,
              event.log.logIndex
            )
          : null);

  await context.db
    .insert(premiumAccount)
    .values({
      id: accountId,
      escrow,
      account,
      currentCoverage: event.args.currentCoverage,
      claimableAmount: event.args.claimableAmount,
      exposureIntegral: event.args.exposureIntegral,
      claimableNotificationSourceId: nextClaimableNotificationSourceId,
      lastCheckpointBlock: event.block.number,
      lastCheckpointTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      currentCoverage: event.args.currentCoverage,
      claimableAmount: event.args.claimableAmount,
      exposureIntegral: event.args.exposureIntegral,
      claimableNotificationSourceId: nextClaimableNotificationSourceId,
      lastCheckpointBlock: event.block.number,
      lastCheckpointTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const goalContext = budgetTreasuryAddress
    ? await context.db.find(goalContextByBudgetTreasury, { id: budgetTreasuryAddress })
    : null;
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });
  const shouldOpenCycle =
    nextClaimable > 0n &&
    budgetTreasuryAddress !== null &&
    (existingClaimableNotificationSourceId === null || previousClaimable !== nextClaimable);
  const shouldInvalidateCycle =
    nextClaimable <= 0n &&
    existingClaimableNotificationSourceId !== null &&
    previousClaimable !== nextClaimable;
  if (!shouldOpenCycle && !shouldInvalidateCycle) return;

  const cycleSourceId =
    shouldOpenCycle
      ? nextClaimableNotificationSourceId
      : existingClaimableNotificationSourceId;
  if (!cycleSourceId) return;

  await emitProtocolNotifications({
    context,
    event,
    notifications: [
      {
        recipientWalletAddress: account,
        reason: "premium_claimable",
        sourceType: "premium_claimable_cycle",
        sourceId: cycleSourceId,
        notificationClass: "cycle" as const,
        action: shouldOpenCycle ? "upsert" : "invalidate",
        payload: buildProtocolNotificationPayload({
          role: "budget_underwriter",
          goalRow,
          reason: "premium_claimable",
          budgetTreasury: budgetTreasuryAddress,
          amounts: {
            claimable: nextClaimable,
          },
        }),
      },
    ],
  });
});
