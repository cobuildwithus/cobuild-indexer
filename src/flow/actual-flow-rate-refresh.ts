import { flowAbi } from "@cobuild/wire";
import { ponder } from "ponder:registry";
import { flow, flowActualRateRefreshState } from "ponder:schema";
import type { Hex } from "viem";

const MAX_FLOWS_PER_TICK = 1_500;
const MULTICALL_CHUNK_SIZE = 150;
const STALE_BLOCK_THRESHOLD = 180n; // ~6 minutes on Base (2s blocks)
const FAILURE_REASON_MAX_CHARS = 1_024;

type FlowRow = {
  id: Hex;
  targetOutflowRate: bigint;
  currentFlowRate: bigint;
  currentFlowRateObservedAtBlock: bigint | null;
  currentFlowRateStale: boolean;
  currentFlowRateFailureCount: number;
};

type MulticallSuccess = { status: "success"; result: bigint };
type MulticallFailure = { status: "failure"; error: unknown };
type MulticallResult = MulticallSuccess | MulticallFailure;

function pickRoundRobin(args: { flowIds: Hex[]; cursor: number; maxItems: number }): {
  selectedFlowIds: Hex[];
  nextCursor: number;
} {
  const { flowIds, cursor, maxItems } = args;
  const total = flowIds.length;
  if (total === 0 || maxItems <= 0) return { selectedFlowIds: [], nextCursor: 0 };

  const selectedCount = Math.min(total, maxItems);
  const start = cursor >= 0 ? cursor % total : 0;
  const selectedFlowIds: Hex[] = [];

  for (let i = 0; i < selectedCount; i += 1) {
    selectedFlowIds.push(flowIds[(start + i) % total]!);
  }

  return { selectedFlowIds, nextCursor: (start + selectedCount) % total };
}

function shouldRefreshFlow(args: { row: FlowRow; currentBlockNumber: bigint }): boolean {
  const { row, currentBlockNumber } = args;
  const observedAtBlock = row.currentFlowRateObservedAtBlock;
  const isStaleByAge =
    observedAtBlock === null || currentBlockNumber - observedAtBlock >= STALE_BLOCK_THRESHOLD;
  return (
    row.targetOutflowRate !== 0n ||
    row.currentFlowRate !== 0n ||
    row.currentFlowRateStale ||
    isStaleByAge
  );
}

function normalizeFailureReason(error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);
  return reason.length > FAILURE_REASON_MAX_CHARS
    ? reason.slice(0, FAILURE_REASON_MAX_CHARS)
    : reason;
}

async function refreshChunk(args: {
  context: any;
  blockNumber: bigint;
  blockTimestamp: bigint;
  candidates: { id: Hex; row: FlowRow }[];
}) {
  const { context, blockNumber, blockTimestamp, candidates } = args;
  if (candidates.length === 0) return;
  const commonUpdateFields = {
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  };

  const contracts = candidates.map((candidate) => ({
    address: candidate.id,
    abi: flowAbi,
    functionName: "getActualFlowRate" as const,
  }));

  let results: MulticallResult[];
  try {
    results = (await context.client.multicall({
      contracts,
      allowFailure: true,
      blockNumber,
    })) as MulticallResult[];
  } catch (error) {
    // Fallback protects the run when multicall infra has transient failures.
    results = await Promise.all(
      contracts.map(async (contract): Promise<MulticallResult> => {
        try {
          const result = (await context.client.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName: contract.functionName,
            blockNumber,
          })) as bigint;
          return { status: "success", result };
        } catch (readError) {
          return { status: "failure", error: readError };
        }
      })
    );
    console.warn(
      `[FlowActualRateRefresh] Multicall failed at block ${blockNumber.toString()}, used readContract fallback: ${normalizeFailureReason(error)}`
    );
  }

  const updates: Promise<unknown>[] = [];
  for (const [i, candidate] of candidates.entries()) {
    const result = results[i];
    if (!result) continue;

    if (result.status === "success") {
      updates.push(
        context.db.update(flow, { id: candidate.id }).set({
          currentFlowRate: result.result,
          currentFlowRateObservedAtBlock: blockNumber,
          currentFlowRateObservedAtTimestamp: blockTimestamp,
          currentFlowRateStale: false,
          currentFlowRateFailureCount: 0,
          currentFlowRateLastFailureAt: null,
          currentFlowRateLastFailureReason: null,
          ...commonUpdateFields,
        })
      );
      continue;
    }

    updates.push(
      context.db.update(flow, { id: candidate.id }).set({
        currentFlowRateStale: true,
        currentFlowRateFailureCount: candidate.row.currentFlowRateFailureCount + 1,
        currentFlowRateLastFailureAt: blockTimestamp,
        currentFlowRateLastFailureReason: normalizeFailureReason(result.error),
        ...commonUpdateFields,
      })
    );
  }

  await Promise.all(updates);
}

ponder.on("FlowActualRateRefresh:block", async ({ context, event }) => {
  const chainId = context.chain.id;
  const state = await context.db.find(flowActualRateRefreshState, { id: chainId });
  if (!state?.flowIds || state.flowIds.length === 0) return;

  const flowIds = state.flowIds as Hex[];
  const { selectedFlowIds, nextCursor } = pickRoundRobin({
    flowIds,
    cursor: state.cursor,
    maxItems: MAX_FLOWS_PER_TICK,
  });
  if (selectedFlowIds.length === 0) return;

  const selectedRows = await Promise.all(
    selectedFlowIds.map(async (id) => {
      const row = (await context.db.find(flow, { id })) as FlowRow | null;
      if (!row) return null;
      return { id, row };
    })
  );

  const refreshCandidates: { id: Hex; row: FlowRow }[] = [];
  for (const entry of selectedRows) {
    if (!entry) continue;
    if (!shouldRefreshFlow({ row: entry.row, currentBlockNumber: event.block.number })) continue;
    refreshCandidates.push(entry);
  }

  for (let i = 0; i < refreshCandidates.length; i += MULTICALL_CHUNK_SIZE) {
    const chunk = refreshCandidates.slice(i, i + MULTICALL_CHUNK_SIZE);
    await refreshChunk({
      context,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      candidates: chunk,
    });
  }

  await context.db.update(flowActualRateRefreshState, { id: chainId }).set({
    cursor: nextCursor,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });

  if (selectedFlowIds.length === MAX_FLOWS_PER_TICK && flowIds.length > MAX_FLOWS_PER_TICK) {
    console.warn(
      `[FlowActualRateRefresh] Hit max flows per tick (${MAX_FLOWS_PER_TICK}) on chain ${chainId}; total queued flows=${flowIds.length}`
    );
  }
});
