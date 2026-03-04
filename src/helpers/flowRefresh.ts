import type { Hex } from "viem";
import { flowActualRateRefreshState } from "ponder:schema";

function hasFlowIdIgnoreCase(flowIds: Hex[], candidateFlowId: Hex): boolean {
  const candidateLower = candidateFlowId.toLowerCase();
  return flowIds.some((flowId) => flowId.toLowerCase() === candidateLower);
}

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
  if (hasFlowIdIgnoreCase(existingFlowIds, flowId)) return;

  await context.db.update(flowActualRateRefreshState, { id: chainId }).set({
    flowIds: [...existingFlowIds, flowId],
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function queueFlowForActualRateRefresh(args: {
  context: any;
  event: { block: { number: bigint; timestamp: bigint } };
  flowId: Hex;
}) {
  const { context, event, flowId } = args;
  await ensureFlowQueuedForActualRateRefresh({
    context,
    chainId: context.chain.id,
    flowId,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
  });
}
