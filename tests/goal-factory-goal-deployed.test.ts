import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertProtocolEventMock, ponderOnMock } = vi.hoisted(() => ({
  insertProtocolEventMock: vi.fn(),
  ponderOnMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("ponder:schema", () => ({
  ERC20ToProjectId: "ERC20ToProjectId",
  goalContextByArbitrator: "goalContextByArbitrator",
  goalContextByBudgetStakeLedger: "goalContextByBudgetStakeLedger",
  goalContextByBudgetTcr: "goalContextByBudgetTcr",
  goalFactoryDeployment: "goalFactoryDeployment",
  project: "project",
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  onConflictArg?: unknown;
};

type UpdateCall = {
  table: string;
  key: Record<string, unknown>;
  setArg?: unknown;
};

function createDb() {
  const insertCalls: InsertCall[] = [];
  const updateCalls: UpdateCall[] = [];

  return {
    db: {
      insert: (table: string) => ({
        values: (value: Record<string, unknown>) => {
          const call: InsertCall = { table, value };
          insertCalls.push(call);

          return {
            onConflictDoUpdate: async (arg: unknown) => {
              call.onConflictArg = arg;
            },
          };
        },
      }),
      update: (table: string, key: Record<string, unknown>) => {
        const call: UpdateCall = { table, key };
        updateCalls.push(call);

        return {
          set: async (arg: unknown) => {
            call.setArg = arg;
          },
        };
      },
    },
    insertCalls,
    updateCalls,
  };
}

type GoalDeployedHandler = (args: {
  event: {
    args: {
      caller: `0x${string}`;
      goalRevnetId: bigint;
      stack: {
        goalToken: `0x${string}`;
        goalSuperToken: `0x${string}`;
        goalTreasury: `0x${string}`;
        goalFlow: `0x${string}`;
        stakeVault: `0x${string}`;
        budgetStakeLedger: `0x${string}`;
        splitHook: `0x${string}`;
        jurorSlasherRouter: `0x${string}`;
        underwriterSlasherRouter: `0x${string}`;
        successResolver: `0x${string}`;
        budgetTCR: `0x${string}`;
        arbitrator: `0x${string}`;
      };
    };
    log: { address: `0x${string}` };
    transaction: { hash: `0x${string}` };
    block: { number: bigint; timestamp: bigint };
  };
  context: { chain: { id: number }; db: ReturnType<typeof createDb>["db"] };
}) => Promise<void>;

describe("GoalFactory:GoalDeployed handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("seeds goal token lookup and project revnet linkage from the factory event", async () => {
    await import("../src/goalFactory/goal-deployed");

    const handler = ponderOnMock.mock.calls.at(-1)?.[1] as GoalDeployedHandler | undefined;
    if (!handler) throw new Error("Expected GoalFactory:GoalDeployed handler registration.");

    const { db, insertCalls, updateCalls } = createDb();
    const goalToken = "0x00000000000000000000000000000000000000aa" as const;
    const goalTreasury = "0x00000000000000000000000000000000000000ab" as const;
    const budgetTCR = "0x00000000000000000000000000000000000000ac" as const;
    const budgetStakeLedger = "0x00000000000000000000000000000000000000ad" as const;
    const stakeVault = "0x00000000000000000000000000000000000000ae" as const;

    const event: Parameters<GoalDeployedHandler>[0]["event"] = {
      args: {
        caller: "0x00000000000000000000000000000000000000f1",
        goalRevnetId: 77n,
        stack: {
          goalToken,
          goalSuperToken: "0x00000000000000000000000000000000000000b0",
          goalTreasury,
          goalFlow: "0x00000000000000000000000000000000000000b1",
          stakeVault,
          budgetStakeLedger,
          splitHook: "0x00000000000000000000000000000000000000b2",
          jurorSlasherRouter: "0x00000000000000000000000000000000000000b3",
          underwriterSlasherRouter: "0x00000000000000000000000000000000000000b4",
          successResolver: "0x00000000000000000000000000000000000000b5",
          budgetTCR,
          arbitrator: "0x00000000000000000000000000000000000000b6",
        },
      },
      log: { address: "0x00000000000000000000000000000000000000f0" },
      transaction: {
        hash: "0x00000000000000000000000000000000000000000000000000000000000000f2",
      },
      block: { number: 101n, timestamp: 202n },
    };

    const context = {
      chain: { id: 8453 },
      db,
    };

    await handler({ event, context });

    expect(insertProtocolEventMock).toHaveBeenCalledWith({
      context,
      event,
      contractName: "GoalFactory",
    });

    expect(insertCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "ERC20ToProjectId",
          value: {
            erc20: goalToken,
            chainId: 8453,
            projectId: 77,
          },
          onConflictArg: {
            projectId: 77,
          },
        }),
        expect.objectContaining({
          table: "goalContextByBudgetTcr",
          value: expect.objectContaining({
            id: budgetTCR,
            goalTreasury,
          }),
        }),
        expect.objectContaining({
          table: "goalContextByBudgetStakeLedger",
          value: expect.objectContaining({
            id: budgetStakeLedger,
            goalTreasury,
            budgetTcr: budgetTCR,
          }),
        }),
        expect.objectContaining({
          table: "goalContextByArbitrator",
          value: expect.objectContaining({
            goalTreasury,
            stakeVault,
            budgetTcr: budgetTCR,
          }),
        }),
      ])
    );

    expect(updateCalls).toEqual([
      {
        table: "project",
        key: {
          chainId: 8453,
          projectId: 77,
        },
        setArg: {
          isRevnet: true,
          erc20: goalToken,
        },
      },
    ]);
  });
});
