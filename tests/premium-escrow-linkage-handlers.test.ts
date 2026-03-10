import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGoalRowMock, insertProtocolEventMock, ponderOnMock } = vi.hoisted(() => ({
  getGoalRowMock: vi.fn(),
  insertProtocolEventMock: vi.fn(),
  ponderOnMock: vi.fn(),
}));

const { queueFlowForActualRateRefreshMock } = vi.hoisted(() => ({
  queueFlowForActualRateRefreshMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("ponder:schema", () => ({
  budgetContextByMechanismArbitrator: "budgetContextByMechanismArbitrator",
  budgetContextByMechanismTcr: "budgetContextByMechanismTcr",
  budgetMechanismRegistry: "budgetMechanismRegistry",
  budgetStack: "budgetStack",
  budgetTreasury: "budgetTreasury",
  budgetTreasuryByChildFlow: "budgetTreasuryByChildFlow",
  budgetTreasuryByRecipient: "budgetTreasuryByRecipient",
  flow: "flow",
  flowRecipient: "flowRecipient",
  goalContextByBudgetTcr: "goalContextByBudgetTcr",
  premiumEscrow: "premiumEscrow",
  premiumEscrowByBudgetTreasury: "premiumEscrowByBudgetTreasury",
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

vi.mock("../src/helpers/protocolNotifications", () => ({
  getGoalRow: getGoalRowMock,
}));

vi.mock("../src/helpers/flowRefresh", () => ({
  queueFlowForActualRateRefresh: queueFlowForActualRateRefreshMock,
}));

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  update?: Record<string, unknown>;
};

type KeyedFindResult = {
  key: Record<string, unknown>;
  value: unknown;
};

function matchesFindKey(
  expected: Record<string, unknown>,
  actual: Record<string, unknown> | undefined
): boolean {
  if (!actual) return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function createDb(findResults: Record<string, unknown | KeyedFindResult[]>) {
  const insertCalls: InsertCall[] = [];
  const updateCalls: Array<{ table: string; key: Record<string, unknown>; setArg: unknown }> = [];

  return {
    db: {
      find: vi.fn(async (table: string, key?: Record<string, unknown>) => {
        const result = findResults[table];
        if (Array.isArray(result)) {
          return result.find((entry) => matchesFindKey(entry.key, key))?.value ?? null;
        }
        return result ?? null;
      }),
      insert: (table: string) => ({
        values: (value: Record<string, unknown>) => {
          const call: InsertCall = { table, value };
          insertCalls.push(call);

          return {
            onConflictDoUpdate: async (update: Record<string, unknown>) => {
              call.update = update;
            },
            onConflictDoNothing: async () => undefined,
          };
        },
      }),
      update: (table: string, key: Record<string, unknown>) => ({
        set: async (setArg: unknown) => {
          updateCalls.push({ table, key, setArg });
        },
      }),
    },
    insertCalls,
    updateCalls,
  };
}

type Handler<TArgs extends Record<string, unknown>> = (args: {
  event: {
    id?: string;
    log: { address: `0x${string}`; logIndex: number };
    args: TArgs;
    transaction: { hash: `0x${string}`; from: `0x${string}` };
    block: { number: bigint; timestamp: bigint };
  };
  context: {
    chain: { id: number };
    db: ReturnType<typeof createDb>["db"];
  };
}) => Promise<void>;

function getLastRegisteredHandler<TArgs extends Record<string, unknown>>(): Handler<TArgs> {
  const handler = ponderOnMock.mock.calls.at(-1)?.[1];
  if (!handler) throw new Error("Expected a registered handler.");
  return handler as Handler<TArgs>;
}

describe("premium escrow linkage handlers", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000aa";
  const childFlow = "0x00000000000000000000000000000000000000ab";
  const budgetTreasury = "0x00000000000000000000000000000000000000ac";
  const recipientId = "0x00000000000000000000000000000000000000ad";
  const premiumEscrowAddress = "0x00000000000000000000000000000000000000ae";
  const mechanismTcr = "0x00000000000000000000000000000000000000af";
  const managerRewardPoolAddress = "0x00000000000000000000000000000000000000b2";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getGoalRowMock.mockResolvedValue({
      id: goalTreasury,
      owner: "0x00000000000000000000000000000000000000b0",
      stakeVault: "0x00000000000000000000000000000000000000b1",
      canonicalRouteSlug: "alpha",
    });
  });

  it("does not alias the child manager reward pool into budget topology during ChildFlowDeployed", async () => {
    await import("../src/flow/child-flow-deployed");

    const { db, insertCalls, updateCalls } = createDb({
      budgetTreasuryByRecipient: {
        budgetTreasury,
      },
      budgetTreasuryByChildFlow: null,
    });

    await getLastRegisteredHandler<{
      recipient: `0x${string}`;
      recipientId: `0x${string}`;
      recipientAdmin: `0x${string}`;
      flowOperator: `0x${string}`;
      sweeper: `0x${string}`;
      managerRewardPool: `0x${string}`;
      strategy: `0x${string}`;
    }>()({
      event: {
        log: { address: mechanismTcr, logIndex: 0 },
        args: {
          recipient: childFlow,
          recipientId,
          recipientAdmin: "0x00000000000000000000000000000000000000b3",
          flowOperator: "0x00000000000000000000000000000000000000b4",
          sweeper: "0x00000000000000000000000000000000000000b5",
          managerRewardPool: managerRewardPoolAddress,
          strategy: "0x00000000000000000000000000000000000000b6",
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          from: "0x00000000000000000000000000000000000000b7",
        },
        block: { number: 9n, timestamp: 19n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    const flowInsert = insertCalls.find((call) => call.table === "flow");
    const budgetStackInsert = insertCalls.find((call) => call.table === "budgetStack");
    const budgetTreasuryUpdate = updateCalls.find((call) => call.table === "budgetTreasury");

    expect(flowInsert?.value.managerRewardPool).toBe(managerRewardPoolAddress);
    expect(budgetStackInsert?.value.premiumEscrow).toBeUndefined();
    expect(insertCalls.find((call) => call.table === "premiumEscrow")).toBeUndefined();
    expect(insertCalls.find((call) => call.table === "premiumEscrowByBudgetTreasury")).toBeUndefined();
    expect((budgetTreasuryUpdate?.setArg as Record<string, unknown> | undefined)?.premiumEscrow).toBeUndefined();
    expect(queueFlowForActualRateRefreshMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: childFlow,
      })
    );
  });

  it("leaves premiumEscrow unset when BudgetConfigured runs before escrow links exist", async () => {
    await import("../src/budgets/budget-configured");

    const { db, insertCalls } = createDb({
      budgetTreasury: null,
      budgetTreasuryByChildFlow: null,
      premiumEscrowByBudgetTreasury: null,
      flow: null,
    });

    await getLastRegisteredHandler<{
      controller: `0x${string}`;
      flow: `0x${string}`;
      fundingDeadline: bigint;
      executionDuration: bigint;
      activationThreshold: bigint;
      runwayCap: bigint;
    }>()({
      event: {
        log: { address: budgetTreasury, logIndex: 1 },
        args: {
          controller: "0x00000000000000000000000000000000000000b2",
          flow: childFlow,
          fundingDeadline: 10n,
          executionDuration: 20n,
          activationThreshold: 30n,
          runwayCap: 40n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
          from: "0x00000000000000000000000000000000000000b3",
        },
        block: { number: 10n, timestamp: 20n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    const budgetInsert = insertCalls.find((call) => call.table === "budgetTreasury");
    const premiumEscrowInsert = insertCalls.find((call) => call.table === "premiumEscrow");
    const premiumEscrowByBudgetInsert = insertCalls.find(
      (call) => call.table === "premiumEscrowByBudgetTreasury"
    );
    expect(budgetInsert?.value.premiumEscrow).toBeNull();
    expect(budgetInsert?.update?.premiumEscrow).toBeNull();
    expect(premiumEscrowInsert).toBeUndefined();
    expect(premiumEscrowByBudgetInsert).toBeUndefined();
  });

  it("uses the factory-emitted premiumEscrow when BudgetStackDeployed arrives", async () => {
    await import("../src/tcrFactory/budget-stack-deployed");

    const { db, insertCalls } = createDb({
      flow: {
        managerRewardPool: managerRewardPoolAddress,
        parentFlow: null,
      },
    });

    await getLastRegisteredHandler<{
      itemID: `0x${string}`;
      childFlow: `0x${string}`;
      budgetTreasury: `0x${string}`;
      premiumEscrow: `0x${string}`;
      strategy: `0x${string}`;
    }>()({
      event: {
        log: { address: mechanismTcr, logIndex: 2 },
        args: {
          itemID: recipientId,
          childFlow,
          budgetTreasury,
          premiumEscrow: premiumEscrowAddress,
          strategy: "0x00000000000000000000000000000000000000b4",
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
          from: "0x00000000000000000000000000000000000000b5",
        },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(insertCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "budgetStack",
          value: expect.objectContaining({
            premiumEscrow: premiumEscrowAddress,
          }),
        }),
        expect.objectContaining({
          table: "budgetTreasury",
          value: expect.objectContaining({
            premiumEscrow: premiumEscrowAddress,
          }),
        }),
        expect.objectContaining({
          table: "premiumEscrow",
          value: expect.objectContaining({
            id: premiumEscrowAddress,
            budgetTreasury,
            childFlow,
          }),
        }),
        expect.objectContaining({
          table: "premiumEscrowByBudgetTreasury",
          value: expect.objectContaining({
            id: budgetTreasury,
            premiumEscrow: premiumEscrowAddress,
          }),
        }),
      ])
    );
  });

  it("does not fall back to the child manager reward pool for mechanism fundingEscrow", async () => {
    await import("../src/tcr/budget-allocation-mechanism-deployed");

    const { db, insertCalls } = createDb({
      goalContextByBudgetTcr: {
        goalTreasury,
      },
      budgetTreasuryByRecipient: {
        budgetTreasury,
        childFlow,
      },
      budgetTreasury: {
        childFlow,
        premiumEscrow: null,
        strategy: "0x00000000000000000000000000000000000000b6",
      },
      premiumEscrowByBudgetTreasury: null,
      flow: {
        managerRewardPool: managerRewardPoolAddress,
      },
    });

    await getLastRegisteredHandler<{
      itemID: `0x${string}`;
      allocationMechanism: `0x${string}`;
      allocationMechanismArbitrator: `0x${string}`;
      roundFactory: `0x${string}`;
    }>()({
      event: {
        log: { address: mechanismTcr, logIndex: 3 },
        args: {
          itemID: recipientId,
          allocationMechanism: "0x00000000000000000000000000000000000000b7",
          allocationMechanismArbitrator: "0x00000000000000000000000000000000000000b8",
          roundFactory: "0x00000000000000000000000000000000000000b9",
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
          from: "0x00000000000000000000000000000000000000ba",
        },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    const registryInsert = insertCalls.find((call) => call.table === "budgetMechanismRegistry");
    expect(registryInsert?.value.fundingEscrow).toBeNull();
    expect(registryInsert?.update?.fundingEscrow).toBeNull();
  });
});
