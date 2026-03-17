import { ponder } from "ponder:registry";
import {
  batchReactionSwap,
  transactionHashToBatchReactionSwaps,
} from "ponder:schema";
import { contracts } from "../../../addresses";

ponder.on("CobuildSwap:BatchReactionSwap", async ({ event, context }) => {
  const { tokenIn, tokenOut, amountIn, fee, amountOut, router } = event.args;

  const chainId = context.chain.id;
  const timestamp = event.block.timestamp;
  const id = `${event.transaction.hash}-${event.log.logIndex}`;

  if (tokenIn.toLowerCase() !== contracts.USDCBase.toLowerCase()) {
    throw new Error(
      `Expected tokenIn to be USDC (${contracts.USDCBase}), got ${tokenIn}`
    );
  }

  const inserted = await context.db.insert(batchReactionSwap).values({
    id,
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    amountOut,
    router: router,
    from: event.transaction.from,
    logIndex: event.log.logIndex,
    blockNumber: event.block.number,
    blockTimestamp: timestamp,
    txHash: event.transaction.hash,
    chainId,
  });

  const existing = await context.db.find(transactionHashToBatchReactionSwaps, {
    txHash: event.transaction.hash,
  });

  if (existing) {
    await context.db
      .update(transactionHashToBatchReactionSwaps, {
        txHash: event.transaction.hash,
      })
      .set((existing) => ({
        batchReactionSwapIds: [...existing.batchReactionSwapIds, inserted.id],
      }));
  } else {
    await context.db.insert(transactionHashToBatchReactionSwaps).values({
      txHash: event.transaction.hash,
      batchReactionSwapIds: [inserted.id],
    });
  }
});
