import { beforeEach, describe, expect, it, vi } from "vitest";

const { ponderOnMock } = vi.hoisted(() => ({
  ponderOnMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("ponder:schema", () => ({
  ERC20ToProjectId: "ERC20ToProjectId",
  participant: "participant",
  project: "project",
}));

type UpdateCall = {
  table: string;
  key: Record<string, unknown>;
};

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  onConflictArg?: unknown;
};

function createDb() {
  const updateCalls: UpdateCall[] = [];
  const insertCalls: InsertCall[] = [];

  return {
    db: {
      find: vi
        .fn()
        .mockResolvedValueOnce({
          chainId: 8453,
          erc20: "0x00000000000000000000000000000000000000aa",
          projectId: 42,
        })
        .mockResolvedValueOnce({
          chainId: 8453,
          projectId: 42,
          isRevnet: true,
          suckerGroupId: "group-42",
        }),
      update: (table: string, key: Record<string, unknown>) => {
        updateCalls.push({ table, key });

        return {
          set: async (_setter: unknown) => undefined,
        };
      },
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
    },
    insertCalls,
    updateCalls,
  };
}

type TransferHandler = (args: {
  event: {
    args: {
      from: `0x${string}`;
      to: `0x${string}`;
      value: bigint;
    };
    log: { address: `0x${string}` };
    block: { timestamp: bigint };
  };
  context: { chain: { id: number }; db: ReturnType<typeof createDb>["db"] };
}) => Promise<void>;

describe("erc20 transfer handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    ponderOnMock.mockReset();
  });

  it("registers both root-token and goal-token transfer handlers", async () => {
    await import("../src/contracts/erc20/transfer");

    expect(ponderOnMock.mock.calls.map(([eventName]) => eventName)).toEqual([
      "ERC20:Transfer",
      "GoalToken:Transfer",
    ]);
  });

  it("uses the goal token mapping to update participants on discovered goal token transfers", async () => {
    await import("../src/contracts/erc20/transfer");

    const handler = ponderOnMock.mock.calls[1]?.[1] as TransferHandler | undefined;
    if (!handler) throw new Error("Expected GoalToken:Transfer handler registration.");

    const { db, insertCalls, updateCalls } = createDb();
    const from = "0x00000000000000000000000000000000000000bb";
    const to = "0x00000000000000000000000000000000000000cc";

    await handler({
      event: {
        args: {
          from,
          to,
          value: 15n,
        },
        log: {
          address: "0x00000000000000000000000000000000000000aa",
        },
        block: {
          timestamp: 123n,
        },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(db.find).toHaveBeenCalledTimes(2);
    expect(updateCalls).toEqual([
      {
        table: "participant",
        key: {
          chainId: 8453,
          address: from,
          projectId: 42,
        },
      },
    ]);
    expect(insertCalls).toEqual([
      {
        table: "participant",
        value: {
          createdAt: 123,
          address: to,
          chainId: 8453,
          projectId: 42,
          balance: 15n,
          firstOwned: 123,
          isRevnet: true,
          suckerGroupId: "group-42",
        },
        onConflictArg: expect.any(Function),
      },
    ]);
  });
});
