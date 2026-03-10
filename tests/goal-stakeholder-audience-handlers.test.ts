import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertProtocolEventMock,
  ponderOnMock,
  syncGoalStakeholderAudienceMock,
} = vi.hoisted(() => ({
  insertProtocolEventMock: vi.fn(),
  ponderOnMock: vi.fn(),
  syncGoalStakeholderAudienceMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("ponder:schema", () => ({
  stakePosition: "stakePosition",
  stakeVault: "stakeVault",
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

vi.mock("../src/helpers/protocolNotifications", () => ({
  syncGoalStakeholderAudience: syncGoalStakeholderAudienceMock,
}));

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  didNothing?: boolean;
};

function createDb() {
  const insertCalls: InsertCall[] = [];

  return {
    db: {
      insert: (table: string) => ({
        values: (value: Record<string, unknown>) => {
          const call: InsertCall = { table, value };
          insertCalls.push(call);

          return {
            onConflictDoNothing: async () => {
              call.didNothing = true;
            },
          };
        },
      }),
      update: (_table: string, _key: Record<string, unknown>) => ({
        set: async (_setArg: unknown) => {},
      }),
    },
    insertCalls,
  };
}

type Handler = (args: {
  event: {
    log: { address: `0x${string}` };
    args: { amount: bigint; user: `0x${string}` };
    block: { number: bigint; timestamp: bigint };
  };
  context: { db: ReturnType<typeof createDb>["db"]; chain: { id: number } };
}) => Promise<void>;

function getLastRegisteredHandler(): Handler {
  const handler = ponderOnMock.mock.calls.at(-1)?.[1];
  if (!handler) throw new Error("Expected a registered handler.");
  return handler as Handler;
}

describe("goal stakeholder audience stake handlers", () => {
  const vault = "0x00000000000000000000000000000000000000aa";
  const user = "0x00000000000000000000000000000000000000bb";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("updates the stakeholder audience after goal stake events", async () => {
    await import("../src/stakeVault/goal-staked");

    const { db, insertCalls } = createDb();

    await getLastRegisteredHandler()({
      event: {
        log: { address: vault },
        args: { amount: 5n, user },
        block: { number: 100n, timestamp: 200n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(insertCalls.map((call) => call.table)).toEqual(["stakeVault", "stakePosition"]);
    expect(syncGoalStakeholderAudienceMock).toHaveBeenCalledWith({
      context: {
        chain: { id: 8453 },
        db,
      },
      stakeVaultAddress: vault,
      account: user,
      blockNumber: 100n,
      blockTimestamp: 200n,
    });
  });

  it("updates the stakeholder audience after goal withdraw events", async () => {
    await import("../src/stakeVault/goal-withdrawn");

    const { db } = createDb();

    await getLastRegisteredHandler()({
      event: {
        log: { address: vault },
        args: { amount: 3n, user },
        block: { number: 101n, timestamp: 201n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(syncGoalStakeholderAudienceMock).toHaveBeenCalledWith({
      context: {
        chain: { id: 8453 },
        db,
      },
      stakeVaultAddress: vault,
      account: user,
      blockNumber: 101n,
      blockTimestamp: 201n,
    });
  });
});
