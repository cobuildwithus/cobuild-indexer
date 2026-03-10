import { ponder } from "ponder:registry";

import { goalContextByBudgetTreasury, premiumAccount, premiumEscrow } from "ponder:schema";
import { premiumAccountId } from "../helpers/ids";
import {
  buildGoalNotificationPayload,
  emitProtocolNotifications,
  getGoalRow,
} from "../helpers/protocolNotifications";
import { insertProtocolEvent } from "../helpers/protocolEvent";

ponder.on("PremiumEscrow:UnderwriterSlashed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "PremiumEscrow" });

  const escrow = event.log.address;
  const account = event.args.underwriter;

  await context.db
    .insert(premiumAccount)
    .values({
      id: premiumAccountId(escrow, account),
      escrow,
      account,
      slashed: true,
      exposureIntegral: event.args.exposureIntegral,
      lastSlashWeight: event.args.slashWeight,
      lastSlashDuration: event.args.duration,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      slashed: true,
      exposureIntegral: event.args.exposureIntegral,
      lastSlashWeight: event.args.slashWeight,
      lastSlashDuration: event.args.duration,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });

  const escrowRow = await context.db.find(premiumEscrow, { id: escrow });
  const budgetTreasuryAddress = (escrowRow?.budgetTreasury ?? null) as `0x${string}` | null;
  const goalContext = budgetTreasuryAddress
    ? await context.db.find(goalContextByBudgetTreasury, { id: budgetTreasuryAddress })
    : null;
  const goalRow = await getGoalRow({
    context,
    goalTreasuryAddress: goalContext?.goalTreasury ?? null,
  });

  await emitProtocolNotifications({
    context,
    event,
    notifications: [
      {
        recipientWalletAddress: account,
        reason: "underwriter_slashed",
        sourceType: "underwriter_slash",
        sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:${event.transaction.hash.toLowerCase()}:${event.log.logIndex}`,
        payload: buildGoalNotificationPayload({
          role: "budget_underwriter",
          goalRow,
          reason: "underwriter_slashed",
          budgetTreasury: budgetTreasuryAddress,
          amounts: {
            slashWeight: event.args.slashWeight,
          },
        }),
      },
    ],
  });
});
