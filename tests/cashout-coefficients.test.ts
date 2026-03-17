import { describe, expect, it, vi } from "vitest";

vi.mock("ponder:schema", () => ({
  cashoutCoefficientSnapshot: "cashoutCoefficientSnapshot",
  project: "project",
  ruleset: "ruleset",
}));

import {
  calculateCashoutA,
  calculateCashoutB,
  refreshProjectCashoutCoefficients,
} from "../src/lib/cashout-coefficients";

function createDb(args: {
  projectRow: Record<string, unknown> | null;
  rulesetRow?: Record<string, unknown> | null;
}) {
  const updateSets: Array<Record<string, unknown>> = [];
  const insertValues: Array<Record<string, unknown>> = [];

  const find = vi.fn(async (table: unknown) => {
    if (table === "project") return args.projectRow;
    if (table === "ruleset") return args.rulesetRow ?? null;
    return null;
  });

  return {
    db: {
      find,
      update: () => ({
        set: async (value: Record<string, unknown>) => {
          updateSets.push(value);
        },
      }),
      insert: () => ({
        values: async (value: Record<string, unknown>) => {
          insertValues.push(value);
        },
      }),
    },
    find,
    insertValues,
    updateSets,
  };
}

describe("refreshProjectCashoutCoefficients", () => {
  it("treats currentRulesetId=0 as zero-tax instead of throwing", async () => {
    const projectRow = {
      chainId: 8453,
      projectId: 5,
      currentRulesetId: 0n,
      balance: 200n,
      erc20Supply: 10n,
      pendingReservedTokens: 5n,
      suckerGroupId: "group-5",
    };
    const { db, find, insertValues, updateSets } = createDb({ projectRow });

    await refreshProjectCashoutCoefficients({
      db: db as never,
      chainId: 8453,
      projectId: 5,
      snapshot: {
        timestamp: 123n,
        txHash: "0x1234",
      },
    });

    expect(find).toHaveBeenCalledTimes(1);
    expect(updateSets).toEqual([
      {
        cashout__A: calculateCashoutA(200n, 0n, 15n),
        cashout__B: calculateCashoutB(200n, 0n, 15n),
      },
    ]);
    expect(insertValues).toEqual([
      {
        chainId: 8453,
        projectId: 5,
        suckerGroupId: "group-5",
        timestamp: 123n,
        txHash: "0x1234",
        cashoutA: calculateCashoutA(200n, 0n, 15n),
        cashoutB: calculateCashoutB(200n, 0n, 15n),
        balance: 200n,
        totalSupply: 15n,
        cashOutTaxRate: 0,
      },
    ]);
  });

  it("still throws if a nonzero currentRulesetId cannot be resolved", async () => {
    const { db } = createDb({
      projectRow: {
        chainId: 8453,
        projectId: 5,
        currentRulesetId: 99n,
        balance: 200n,
        erc20Supply: 10n,
        pendingReservedTokens: 5n,
        suckerGroupId: "group-5",
      },
      rulesetRow: null,
    });

    await expect(
      refreshProjectCashoutCoefficients({
        db: db as never,
        chainId: 8453,
        projectId: 5,
      })
    ).rejects.toThrow("Ruleset 99 not found for project 5 on chain 8453");
  });
});
