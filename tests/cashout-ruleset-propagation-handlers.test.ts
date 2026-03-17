import { beforeEach, describe, expect, it, vi } from "vitest";

const { ponderOnMock, refreshProjectCashoutCoefficientsMock } = vi.hoisted(() => ({
  ponderOnMock: vi.fn(),
  refreshProjectCashoutCoefficientsMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("ponder:schema", () => ({
  project: "project",
}));

vi.mock("../src/lib/cashout-coefficients", () => ({
  refreshProjectCashoutCoefficients: refreshProjectCashoutCoefficientsMock,
}));

function createDb() {
  const updateSets: Array<Record<string, unknown>> = [];

  return {
    db: {
      update: () => ({
        set: async (
          setter:
            | Record<string, unknown>
            | ((row: { balance: bigint; pendingReservedTokens: bigint }) => Record<string, unknown>)
        ) => {
          const row = { balance: 100n, pendingReservedTokens: 25n };
          const value = typeof setter === "function" ? setter(row) : setter;
          updateSets.push(value);
          return value;
        },
      }),
    },
    updateSets,
  };
}

describe("cashout ruleset propagation handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    ponderOnMock.mockReset();
    refreshProjectCashoutCoefficientsMock.mockReset();
  });

  it("propagates rulesetId in SendPayouts before refreshing coefficients", async () => {
    await import("../src/contracts/jb-multi-terminal/send-payouts");

    const handler = ponderOnMock.mock.calls[0]?.[1] as
      | ((args: {
          event: {
            args: { projectId: bigint; rulesetId: bigint; amountPaidOut: bigint };
            block: { timestamp: bigint };
            transaction: { hash: `0x${string}` };
          };
          context: { chain: { id: number }; db: ReturnType<typeof createDb>["db"] };
        }) => Promise<void>)
      | undefined;
    if (!handler) throw new Error("Expected SendPayouts handler registration.");

    const { db, updateSets } = createDb();
    await handler({
      event: {
        args: { projectId: 5n, rulesetId: 42n, amountPaidOut: 10n },
        block: { timestamp: 123n },
        transaction: { hash: "0x1234" },
      },
      context: { chain: { id: 8453 }, db },
    });

    expect(updateSets).toEqual([
      {
        balance: 90n,
        currentRulesetId: 42n,
      },
    ]);
    expect(refreshProjectCashoutCoefficientsMock).toHaveBeenCalledWith({
      db,
      chainId: 8453,
      projectId: 5,
      snapshot: {
        timestamp: 123n,
        txHash: "0x1234",
      },
    });
  });

  it("propagates rulesetId in UseAllowance before refreshing coefficients", async () => {
    await import("../src/contracts/jb-multi-terminal/use-allowance");

    const handler = ponderOnMock.mock.calls[0]?.[1] as
      | ((args: {
          event: {
            args: { projectId: bigint; rulesetId: bigint; amountPaidOut: bigint };
            block: { timestamp: bigint };
            transaction: { hash: `0x${string}` };
          };
          context: { chain: { id: number }; db: ReturnType<typeof createDb>["db"] };
        }) => Promise<void>)
      | undefined;
    if (!handler) throw new Error("Expected UseAllowance handler registration.");

    const { db, updateSets } = createDb();
    await handler({
      event: {
        args: { projectId: 5n, rulesetId: 43n, amountPaidOut: 11n },
        block: { timestamp: 124n },
        transaction: { hash: "0x2345" },
      },
      context: { chain: { id: 8453 }, db },
    });

    expect(updateSets).toEqual([
      {
        balance: 89n,
        currentRulesetId: 43n,
      },
    ]);
    expect(refreshProjectCashoutCoefficientsMock).toHaveBeenCalledWith({
      db,
      chainId: 8453,
      projectId: 5,
      snapshot: {
        timestamp: 124n,
        txHash: "0x2345",
      },
    });
  });

  it("propagates rulesetId in SendReservedTokensToSplits before refreshing coefficients", async () => {
    await import("../src/contracts/jb-controller/send-reserved-tokens-to-splits");

    const handler = ponderOnMock.mock.calls[0]?.[1] as
      | ((args: {
          event: {
            args: { projectId: bigint; rulesetId: bigint; tokenCount: bigint };
            block: { timestamp: bigint };
            transaction: { hash: `0x${string}` };
          };
          context: { chain: { id: number }; db: ReturnType<typeof createDb>["db"] };
        }) => Promise<void>)
      | undefined;
    if (!handler) throw new Error("Expected SendReservedTokensToSplits handler registration.");

    const { db, updateSets } = createDb();
    await handler({
      event: {
        args: { projectId: 5n, rulesetId: 0n, tokenCount: 7n },
        block: { timestamp: 125n },
        transaction: { hash: "0x3456" },
      },
      context: { chain: { id: 8453 }, db },
    });

    expect(updateSets).toEqual([
      {
        pendingReservedTokens: 18n,
        currentRulesetId: 0n,
      },
    ]);
    expect(refreshProjectCashoutCoefficientsMock).toHaveBeenCalledWith({
      db,
      chainId: 8453,
      projectId: 5,
      snapshot: {
        timestamp: 125n,
        txHash: "0x3456",
      },
    });
  });
});
