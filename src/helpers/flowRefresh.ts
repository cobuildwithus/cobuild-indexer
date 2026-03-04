import type { Hex } from "viem";
import { flowActualRateRefreshState } from "ponder:schema";

export async function ensureFlowQueuedForActualRateRefresh(args: {
  context: any;
  chainId: number;
  flowId: Hex;
  blockNumber: bigint;
  blockTimestamp: bigint;
}) {
  const { context, chainId, flowId, blockNumber, blockTimestamp } = args;
  const existingState = await context.db.find(flowActualRateRefreshState, { id: chainId });

  if (!existingState) {
    await context.db.insert(flowActualRateRefreshState).values({
      id: chainId,
      flowIds: [flowId],
      cursor: 0,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });
    return;
  }

  const existingFlowIds = existingState.flowIds as Hex[];
  const flowIdLower = flowId.toLowerCase();
  const exists = existingFlowIds.some((existingFlowId) => existingFlowId.toLowerCase() === flowIdLower);
  if (exists) return;

  await context.db.update(flowActualRateRefreshState, { id: chainId }).set({
    flowIds: [...existingFlowIds, flowId],
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}
