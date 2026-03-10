import { ponder } from "ponder:registry";

import {
  goalContextByBudgetTreasury,
  premiumAccount,
  premiumClaim,
  premiumEscrow,
} from "ponder:schema";
import {
  premiumAccountId,
  premiumClaimableCycleSourceId,
} from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:Claimed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.account;
  const amount = event.args.amount;
  const blockNumber = event.block.number;
  const blockTimestamp = event.block.timestamp;
  const id = premiumAccountId(escrow, account);

  const existingClaim = await context.db.find(premiumClaim, { id: event.id });
  if (existingClaim) return;

  const existingAccount = await context.db.find(premiumAccount, { id });
  const previousClaimable = BigInt(existingAccount?.claimableAmount ?? 0n);
  const nextClaimable = previousClaimable > amount ? previousClaimable - amount : 0n;
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
    .insert(premiumClaim)
    .values({
      escrow,
      account,
      id: event.id,
      to: event.args.to,
      amount,
      txHash: event.transaction.hash,
      blockNumber,
      timestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db
    .insert(premiumAccount)
    .values({
      id,
      escrow,
      account,
      claimableAmount: 0n,
      claimableNotificationSourceId: null,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoNothing();

  await context.db.update(premiumAccount, { id }).set({
    claimableAmount: nextClaimable,
    claimableNotificationSourceId: nextClaimableNotificationSourceId,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });

  const goalContext = budgetTreasuryAddress
    ? await context.db.find(goalContextByBudgetTreasury, { id: budgetTreasuryAddress })
    : null;
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });
  const shouldOpenOrRefreshClaimable =
    nextClaimable > 0n &&
    budgetTreasuryAddress !== null &&
    (existingClaimableNotificationSourceId === null || previousClaimable !== nextClaimable);
  const shouldInvalidateClaimable =
    nextClaimable <= 0n &&
    existingClaimableNotificationSourceId !== null &&
    previousClaimable !== nextClaimable;
  const premiumClaimableNotification =
    shouldOpenOrRefreshClaimable && nextClaimableNotificationSourceId
      ? {
          recipientWalletAddress: account,
          reason: "premium_claimable",
          sourceType: "premium_claimable_cycle",
          sourceId: nextClaimableNotificationSourceId,
          notificationClass: "cycle" as const,
          action: "upsert" as const,
          payload: buildGoalNotificationPayload({
            role: "budget_underwriter",
            goalRow,
            reason: "premium_claimable",
            budgetTreasury: budgetTreasuryAddress,
            amounts: {
              claimable: nextClaimable,
            },
          }),
        }
      : shouldInvalidateClaimable && existingClaimableNotificationSourceId
        ? {
            recipientWalletAddress: account,
            reason: "premium_claimable",
            sourceType: "premium_claimable_cycle",
            sourceId: existingClaimableNotificationSourceId,
            notificationClass: "cycle" as const,
            action: "invalidate" as const,
            payload: buildGoalNotificationPayload({
              role: "budget_underwriter",
              goalRow,
              reason: "premium_claimable",
              budgetTreasury: budgetTreasuryAddress,
              amounts: {
                claimable: nextClaimable,
              },
            }),
          }
        : null;

  await emitProtocolNotifications({
    context,
    event,
    notifications: [
      {
        recipientWalletAddress: account,
        reason: "premium_claimed",
        sourceType: "premium_claim",
        notificationClass: "edge" as const,
        sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}`,
        payload: buildGoalNotificationPayload({
          role: "budget_underwriter",
          goalRow,
          reason: "premium_claimed",
          budgetTreasury: budgetTreasuryAddress,
          amounts: {
            claimedAmount: amount,
          },
        }),
      },
      ...(premiumClaimableNotification ? [premiumClaimableNotification] : []),
    ],
  });
});
