import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
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
    block: { number: bigint; timestamp: bigint };
    transaction: { hash: `0x${string}` };
  };
  context: { chain: { id: number }; db: ReturnType<typeof createDb>["db"] };
}) => Promise<void>;

describe("goal factory goal deployed handler", () => {
  beforeEach(() => {
    vi.resetModules();
    ponderOnMock.mockReset();
    insertProtocolEventMock.mockReset();
  });

  it("seeds goal token project mapping and project revnet linkage from the factory event", async () => {
    await import("../src/goalFactory/goal-deployed");

    const handler = ponderOnMock.mock.calls[0]?.[1] as GoalDeployedHandler | undefined;
    if (!handler) throw new Error("Expected GoalFactory:GoalDeployed handler registration.");

    const { db, insertCalls, updateCalls } = createDb();
    const stack = {
      goalToken: "0x0000000000000000000000000000000000000011",
      goalSuperToken: "0x0000000000000000000000000000000000000012",
      goalTreasury: "0x0000000000000000000000000000000000000013",
      goalFlow: "0x0000000000000000000000000000000000000014",
      stakeVault: "0x0000000000000000000000000000000000000015",
      budgetStakeLedger: "0x0000000000000000000000000000000000000016",
      splitHook: "0x0000000000000000000000000000000000000017",
      jurorSlasherRouter: "0x0000000000000000000000000000000000000018",
      underwriterSlasherRouter: "0x0000000000000000000000000000000000000019",
      successResolver: "0x0000000000000000000000000000000000000020",
      budgetTCR: "0x0000000000000000000000000000000000000021",
      arbitrator: "0x0000000000000000000000000000000000000022",
    } as const;

    await handler({
      event: {
        args: {
          caller: "0x0000000000000000000000000000000000000001",
          goalRevnetId: 42n,
          stack,
        },
        log: {
          address: "0x0000000000000000000000000000000000000002",
        },
        block: {
          number: 100n,
          timestamp: 200n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
        },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(insertProtocolEventMock).toHaveBeenCalledWith({
      context: {
        chain: { id: 8453 },
        db,
      },
      event: expect.objectContaining({
        args: expect.objectContaining({
          goalRevnetId: 42n,
        }),
      }),
      contractName: "GoalFactory",
    });

    expect(insertCalls.map((call) => call.table)).toEqual([
      "goalFactoryDeployment",
      "ERC20ToProjectId",
      "goalContextByBudgetTcr",
      "goalContextByBudgetStakeLedger",
      "goalContextByArbitrator",
    ]);
    expect(insertCalls[1]).toEqual({
      table: "ERC20ToProjectId",
      value: {
        erc20: stack.goalToken,
        chainId: 8453,
        projectId: 42,
      },
      onConflictArg: {
        projectId: 42,
      },
    });
    expect(updateCalls).toEqual([
      {
        table: "project",
        key: {
          chainId: 8453,
          projectId: 42,
        },
        setArg: {
          isRevnet: true,
          erc20: stack.goalToken,
        },
      },
    ]);
  });
});
