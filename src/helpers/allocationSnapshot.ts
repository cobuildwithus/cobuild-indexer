import { hexToBytes, type Hex } from "viem";

// Mirrors constants in FlowProtocolConstants + Flow.sol
export const PPM_SCALE = 1_000_000n;
export const WEIGHT_SCALE = 1_000_000_000_000_000n; // 1e15
export const DEFAULT_DISTRIBUTION_UNITS = 10n;

export type PackedSnapshotEntry = {
  recipientIndex: number; // uint32
  allocationScaled: number; // uint32 (PPM)
};

/**
 * Decode AllocationSnapshot.pack() encoding:
 * - uint16 count (big-endian)
 * - `count` entries of (uint32 recipientIndex, uint32 allocationScaled) big-endian
 */
export function decodePackedSnapshot(packed: Hex): PackedSnapshotEntry[] {
  const bytes = hexToBytes(packed);
  if (bytes.length < 2) return [];

  const count = ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
  const expectedLen = 2 + count * 8;
  if (bytes.length < expectedLen) {
    // Truncated data; return best-effort decode of complete entries.
  }

  const entries: PackedSnapshotEntry[] = [];
  for (let i = 0; i < count; i++) {
    const offset = 2 + i * 8;
    if (offset + 8 > bytes.length) break;

    const idx =
      ((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0);

    const alloc =
      ((bytes[offset + 4] ?? 0) << 24) |
      ((bytes[offset + 5] ?? 0) << 16) |
      ((bytes[offset + 6] ?? 0) << 8) |
      (bytes[offset + 7] ?? 0);

    // >>> 0 forces unsigned 32-bit
    entries.push({ recipientIndex: idx >>> 0, allocationScaled: alloc >>> 0 });
  }

  return entries;
}

/**
 * Replicates FlowUnitMath.poolUnitsFromScaledAllocation(weight, allocationScaled, PPM_SCALE)
 * This returns the per-allocationKey "computed units" (does NOT include DEFAULT_DISTRIBUTION_UNITS).
 */
export function computedUnitsFromScaledAllocation(weight: bigint, allocationScaled: number): bigint {
  if (allocationScaled === 0) return 0n;
  const scaled = BigInt(allocationScaled);
  const weightedAllocation = (scaled * weight) / PPM_SCALE;
  return weightedAllocation / WEIGHT_SCALE;
}
