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

async function handleAllocationCommitted(args: { event: any; context: any; contractName: string }) {
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

  // Load previous key state (for delta computation).
  const prevRows = await context.db.sql
    .select()
    .from(allocationKeyState)
    .where(eq(allocationKeyState.id, keyId))
    .limit(1);

  const prev = prevRows[0];
  const oldWeight: bigint = prev?.weight ?? 0n;
  const oldPackedSnapshot: Hex = (prev?.packedSnapshot as Hex) ?? EMPTY_HEX;

  const oldEntries = decodePackedSnapshot(oldPackedSnapshot);
  const newEntries = decodePackedSnapshot(newPackedSnapshot);

  const oldByIndex = new Map<number, number>();
  for (const e of oldEntries) oldByIndex.set(e.recipientIndex, e.allocationScaled);

  const newByIndex = new Map<number, number>();
  for (const e of newEntries) newByIndex.set(e.recipientIndex, e.allocationScaled);

  const indexSet = new Set<number>();
  for (const k of oldByIndex.keys()) indexSet.add(k);
  for (const k of newByIndex.keys()) indexSet.add(k);

  const indices = Array.from(indexSet.values());
  if (indices.length === 0) {
    // Still persist the latest key state.
    await context.db
      .insert(allocationKeyState)
      .values({
        id: keyId,
        flowId,
        strategy,
        allocationKey,
        commitment: newCommitment,
        weight: newWeight,
        snapshotVersion,
        packedSnapshot: newPackedSnapshot,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .onConflictDoUpdate({
          commitment: newCommitment,
          weight: newWeight,
          snapshotVersion,
          packedSnapshot: newPackedSnapshot,
          updatedAtBlock: event.block.number,
          updatedAtTimestamp: event.block.timestamp,
    });
    return;
  }

  // Fetch recipient rows for all indices in old/new snapshots.
  const recipients = await context.db.sql
    .select()
    .from(flowRecipient)
    .where(and(eq(flowRecipient.flowId, flowId), inArray(flowRecipient.recipientIndex, indices)));

  const recipientByIndex = new Map<number, (typeof recipients)[number]>();
  for (const r of recipients) recipientByIndex.set(r.recipientIndex, r);

  // For each recipient affected by this allocationKey, compute delta-units and persist state.
  for (const idx of indices) {
    const r = recipientByIndex.get(idx);
    if (!r) continue; // missing mapping (likely startBlock misconfig)

    // On-chain, removed recipients are skipped entirely by FlowAllocations.
    if (r.isRemoved) continue;

    const oldScaled = oldByIndex.get(idx) ?? 0;
    const newScaled = newByIndex.get(idx) ?? 0;

    const oldComputedUnits = computedUnitsFromScaledAllocation(oldWeight, oldScaled);
    const newComputedUnits = computedUnitsFromScaledAllocation(newWeight, newScaled);

    const deltaUnits = newComputedUnits - oldComputedUnits;

    // 1) Upsert per-key per-recipient entry state.
    await context.db
      .insert(allocationEntryState)
      .values({
        id: allocationEntryStateId(flowId, strategy, allocationKey, r.recipientId as Hex),
        flowId,
        strategy,
        allocationKey,
        recipientId: r.recipientId,
        recipient: r.recipient,
        recipientIndex: r.recipientIndex,
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
    const currentSum: bigint = r.allocationUnitsSum ?? 0n;
    let nextSum = currentSum + deltaUnits;
    if (nextSum < 0n) nextSum = 0n;

    await context.db.sql
      .update(flowRecipient)
      .set({
        allocationUnitsSum: nextSum,
        distributionUnits: DEFAULT_DISTRIBUTION_UNITS + nextSum,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
      })
      .where(eq(flowRecipient.id, r.id));
  }

  // Persist latest key state (commitment, weight, snapshot).
  await context.db
    .insert(allocationKeyState)
    .values({
      id: keyId,
      flowId,
      strategy,
      allocationKey,
      commitment: newCommitment,
      weight: newWeight,
      snapshotVersion,
      packedSnapshot: newPackedSnapshot,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
        commitment: newCommitment,
        weight: newWeight,
        snapshotVersion,
        packedSnapshot: newPackedSnapshot,
        updatedAtBlock: event.block.number,
        updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalFlow:AllocationCommitted", async ({ event, context }) => {
  await handleAllocationCommitted({ event, context, contractName: "GoalFlow" });
});

ponder.on("ChildFlow:AllocationCommitted", async ({ event, context }) => {
  await handleAllocationCommitted({ event, context, contractName: "ChildFlow" });
});
