import { ponder } from "ponder:registry";
import { and, eq, inArray } from "drizzle-orm";
import type { Hex } from "viem";

import { allocationEntryState, allocationKeyState, flowRecipient } from "ponder:schema";
import { insertProtocolEvent } from "../helpers/protocolEvent";
import { allocationEntryStateId, allocationKeyStateId } from "../helpers/ids";
import {
  DEFAULT_DISTRIBUTION_UNITS,
  computedUnitsFromScaledAllocation,
  decodePackedSnapshot,
} from "../helpers/allocationSnapshot";

const EMPTY_HEX = "0x" as Hex;

function scaledAllocationsByIndex(packedSnapshot: Hex) {
  const byIndex = new Map<number, number>();
  for (const entry of decodePackedSnapshot(packedSnapshot)) {
    byIndex.set(entry.recipientIndex, entry.allocationScaled);
  }
  return byIndex;
}

async function loadAllocationKeyState(args: { context: any; keyId: string }) {
  const { context, keyId } = args;
  return context.db.find(allocationKeyState, { id: keyId });
}

async function upsertAllocationKeyState(args: {
  context: any;
  event: any;
  keyId: string;
  flowId: Hex;
  strategy: Hex;
  allocationKey: bigint;
  commitment: Hex;
  weight: bigint;
  snapshotVersion: number;
  packedSnapshot: Hex;
}) {
  const {
    context,
    event,
    keyId,
    flowId,
    strategy,
    allocationKey,
    commitment,
    weight,
    snapshotVersion,
    packedSnapshot,
  } = args;

  await context.db
    .insert(allocationKeyState)
    .values({
      id: keyId,
      flowId,
      strategy,
      allocationKey,
      commitment,
      weight,
      snapshotVersion,
      packedSnapshot,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      commitment,
      weight,
      snapshotVersion,
      packedSnapshot,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
}

async function applyAllocationStateTransition(args: {
  event: any;
  context: any;
  flowId: Hex;
  strategy: Hex;
  allocationKey: bigint;
  keyId: string;
  oldWeight: bigint;
  newWeight: bigint;
  oldPackedSnapshot: Hex;
  newPackedSnapshot: Hex;
  snapshotVersion: number;
  newCommitment: Hex;
}) {
  const {
    event,
    context,
    flowId,
    strategy,
    allocationKey,
    keyId,
    oldWeight,
    newWeight,
    oldPackedSnapshot,
    newPackedSnapshot,
    snapshotVersion,
    newCommitment,
  } = args;

  const keyStateUpsertArgs = {
    context,
    event,
    keyId,
    flowId,
    strategy,
    allocationKey,
    commitment: newCommitment,
    weight: newWeight,
    snapshotVersion,
    packedSnapshot: newPackedSnapshot,
  };

  const oldByIndex = scaledAllocationsByIndex(oldPackedSnapshot);
  const newByIndex = scaledAllocationsByIndex(newPackedSnapshot);
  const indices = Array.from(new Set([...oldByIndex.keys(), ...newByIndex.keys()]));
  if (indices.length === 0) {
    await upsertAllocationKeyState(keyStateUpsertArgs);
    return;
  }

  // Fetch recipient rows for all indices in old/new snapshots.
  const recipients = await context.db.sql
    .select()
    .from(flowRecipient)
    .where(and(eq(flowRecipient.flowId, flowId), inArray(flowRecipient.recipientIndex, indices)));

  const recipientByIndex = new Map<number, (typeof recipients)[number]>();
  for (const recipientRow of recipients) recipientByIndex.set(recipientRow.recipientIndex, recipientRow);

  // For each recipient affected by this allocationKey, compute delta-units and persist state.
  for (const idx of indices) {
    const recipientRow = recipientByIndex.get(idx);
    if (!recipientRow) continue; // missing mapping (likely startBlock misconfig)

    // On-chain, removed recipients are skipped entirely by FlowAllocations.
    if (recipientRow.isRemoved) continue;

    const oldScaled = oldByIndex.get(idx) ?? 0;
    const newScaled = newByIndex.get(idx) ?? 0;

    const oldComputedUnits = computedUnitsFromScaledAllocation(oldWeight, oldScaled);
    const newComputedUnits = computedUnitsFromScaledAllocation(newWeight, newScaled);
    const deltaUnits = newComputedUnits - oldComputedUnits;

    // 1) Upsert per-key per-recipient entry state.
    await context.db
      .insert(allocationEntryState)
      .values({
        id: allocationEntryStateId(flowId, strategy, allocationKey, recipientRow.recipientId as Hex),
        flowId,
        strategy,
        allocationKey,
        recipientId: recipientRow.recipientId,
        recipient: recipientRow.recipient,
        recipientIndex: recipientRow.recipientIndex,
        allocationScaled: newScaled,
        computedUnits: newComputedUnits,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
        allocationScaled: newScaled,
        computedUnits: newComputedUnits,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      });

    // 2) Incrementally maintain recipient-level allocationUnitsSum and distributionUnits.
    const currentSum: bigint = recipientRow.allocationUnitsSum ?? 0n;
    let nextSum = currentSum + deltaUnits;
    if (nextSum < 0n) nextSum = 0n;

    await context.db.update(flowRecipient, { id: recipientRow.id }).set({
      allocationUnitsSum: nextSum,
      distributionUnits: DEFAULT_DISTRIBUTION_UNITS + nextSum,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
  }

  await upsertAllocationKeyState(keyStateUpsertArgs);
}

async function handleAllocationCommitted(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId: Hex = event.log.address;
  const strategy: Hex = event.args.strategy;
  const allocationKey: bigint = event.args.allocationKey;
  const newCommitment: Hex = event.args.commit;
  const newWeight: bigint = event.args.weight;
  const keyId = allocationKeyStateId(flowId, strategy, allocationKey);

  // Weight-only updates keep the same commit hash. Commit changes are applied by AllocationSnapshotUpdated.
  const prev = await loadAllocationKeyState({ context, keyId });
  if (!prev) return;
  if ((prev.commitment as Hex) !== newCommitment) return;

  const prevPackedSnapshot: Hex = (prev.packedSnapshot as Hex) ?? EMPTY_HEX;
  await applyAllocationStateTransition({
    event,
    context,
    flowId,
    strategy,
    allocationKey,
    keyId,
    oldWeight: prev.weight ?? 0n,
    newWeight,
    oldPackedSnapshot: prevPackedSnapshot,
    newPackedSnapshot: prevPackedSnapshot,
    snapshotVersion: Number(prev.snapshotVersion ?? 0),
    newCommitment,
  });
}

async function handleAllocationSnapshotUpdated(args: { event: any; context: any; contractName: string }) {
  const { event, context, contractName } = args;
  await insertProtocolEvent({ context, event, contractName });

  const flowId: Hex = event.log.address;
  const strategy: Hex = event.args.strategy;
  const allocationKey: bigint = event.args.allocationKey;
  const newCommitment: Hex = event.args.commit;
  const newWeight: bigint = event.args.weight;
  const snapshotVersion = Number(event.args.snapshotVersion);
  const newPackedSnapshot: Hex = event.args.packedSnapshot;
  const keyId = allocationKeyStateId(flowId, strategy, allocationKey);
  const prev = await loadAllocationKeyState({ context, keyId });
  const oldWeight: bigint = prev?.weight ?? 0n;
  const oldPackedSnapshot: Hex = (prev?.packedSnapshot as Hex) ?? EMPTY_HEX;

  await applyAllocationStateTransition({
    event,
    context,
    flowId,
    strategy,
    allocationKey,
    keyId,
    oldWeight,
    newWeight,
    oldPackedSnapshot,
    newPackedSnapshot,
    snapshotVersion,
    newCommitment,
  });
}

ponder.on("GoalFlow:AllocationCommitted", async ({ event, context }) => {
  await handleAllocationCommitted({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:AllocationCommitted", async ({ event, context }) => {
  await handleAllocationCommitted({ event, context, contractName: "ChildFlow" });
});

ponder.on("GoalFlow:AllocationSnapshotUpdated", async ({ event, context }) => {
  await handleAllocationSnapshotUpdated({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:AllocationSnapshotUpdated", async ({ event, context }) => {
  await handleAllocationSnapshotUpdated({ event, context, contractName: "ChildFlow" });
});
