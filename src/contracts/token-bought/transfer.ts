import { Context, ponder } from "ponder:registry";
import {
  batchReactionSwap,
  swapExecuted,
  transactionHashToBatchReactionSwaps,
} from "ponder:schema";
import { contracts } from "../../../addresses";

const mulDiv = (a: bigint, b: bigint, c: bigint) => (a * b) / c;

const feeCollectors = [
  "0xc2da16091546ab32c0c33759a66f6445b933cf5c",
  "0xc4079dc1f8f84711eee0942c192829f473fc3c28",
].map((address) => address.toLowerCase());

ponder.on("TokenBought:Transfer", async ({ event, context }) => {
  const { from, to: recipient, value } = event.args;

  // only interested in transfers from the CobuildSwap contract
  if (from.toLowerCase() !== contracts.CobuildSwap.toLowerCase()) {
    return;
  }

  if (feeCollectors.includes(recipient.toLowerCase())) {
    return;
  }

  const chainId = context.chain.id;
  const timestamp = event.block.timestamp;
  const id = `${event.transaction.hash}-${event.log.logIndex}`;

  const batchSwap = await getBatchSwapForTransaction(
    context.db,
    event.transaction.hash
  );

  const {
    amountOut: totalTokenOut,
    amountIn: totalAmountIn,
    fee: totalFee,
    tokenIn,
    tokenOut,
  } = batchSwap;

  // this user's portion of the swap is the amount of token they got in this transfer from the CobuildSwap contract
  // over the total amount in the swap batch
  const amountIn = mulDiv(totalAmountIn, value, totalTokenOut);
  const fee = mulDiv(totalFee, value, totalTokenOut);
  const amountOut = mulDiv(totalTokenOut, value, totalTokenOut);

  await context.db.insert(swapExecuted).values({
    id,
    recipient,
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    amountOut,
    from,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    blockNumber: event.block.number,
    blockTimestamp: timestamp,
    chainId,
  });
});

async function getBatchSwapForTransaction(
  db: Context["db"],
  txHash: `0x${string}`
) {
  const batchSwapMapping = await db.find(transactionHashToBatchReactionSwaps, {
    txHash,
  });

  if (!batchSwapMapping || !batchSwapMapping.batchReactionSwapIds[0]) {
    throw new Error(
      `Expected batch swap to be found for transaction ${txHash}`
    );
  }

  const batchSwap = await db.find(batchReactionSwap, {
    id: batchSwapMapping.batchReactionSwapIds[0],
  });

  if (!batchSwap) {
    throw new Error(
      `Expected batch swap to be found for transaction ${txHash}`
    );
  }

  return batchSwap;
}
