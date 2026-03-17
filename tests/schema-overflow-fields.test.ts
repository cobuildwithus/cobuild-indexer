import { describe, expect, it } from "vitest";
import type { Hex } from "viem";

import {
  WEIGHT_SCALE,
  computedUnitsFromScaledAllocation,
  decodePackedSnapshot,
} from "../src/helpers/allocationSnapshot";
import { unpackMetadata } from "../src/lib/ruleset-metadata";

describe("schema overflow field helpers", () => {
  it("preserves uint32 baseCurrency values as bigint", () => {
    const baseCurrency = 3_084_054_493n;
    const metadata = baseCurrency << 36n;

    expect(unpackMetadata(metadata).baseCurrency).toBe(baseCurrency);
  });

  it("decodes packed uint32 allocation fields as bigint", () => {
    const packed = "0x0001f0000001b7cd1234" as Hex;

    expect(decodePackedSnapshot(packed)).toEqual([
      {
        recipientIndex: 0xf0000001n,
        allocationScaled: 0xb7cd1234n,
      },
    ]);
  });

  it("computes units from bigint scaled allocations", () => {
    expect(computedUnitsFromScaledAllocation(WEIGHT_SCALE, 1_000_000n)).toBe(1n);
  });
});
