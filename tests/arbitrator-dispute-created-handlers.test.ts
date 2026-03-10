import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitProtocolNotificationsMock,
  emitProtocolNotificationSchedulesMock,
  getGoalRowMock,
  getStakeVaultJurorAccountsMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitProtocolNotificationsMock: vi.fn(),
  emitProtocolNotificationSchedulesMock: vi.fn(),
  getGoalRowMock: vi.fn(),
  getStakeVaultJurorAccountsMock: vi.fn(),
  insertProtocolEventMock: vi.fn(),
  ponderOnMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("ponder:schema", () => ({
  arbitratorDispute: "arbitratorDispute",
  budgetContextByMechanismArbitrator: "budgetContextByMechanismArbitrator",
  budgetContextByMechanismTcr: "budgetContextByMechanismTcr",
  goalContextByArbitrator: "goalContextByArbitrator",
  juror: "juror",
  jurorDisputeMember: "jurorDisputeMember",
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

vi.mock("../src/helpers/protocolNotifications", async () => {
  const actual =
    await vi.importActual<typeof import("../src/helpers/protocolNotifications")>(
      "../src/helpers/protocolNotifications",
    );

  return {
    ...actual,
    emitProtocolNotifications: emitProtocolNotificationsMock,
    emitProtocolNotificationSchedules: emitProtocolNotificationSchedulesMock,
    getGoalRow: getGoalRowMock,
    getStakeVaultJurorAccounts: getStakeVaultJurorAccountsMock,
  };
});

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  update?: Record<string, unknown>;
  didNothing?: boolean;
};

function createDb(findResults: Record<string, unknown>) {
  const insertCalls: InsertCall[] = [];

  return {
    db: {
      find: vi.fn(async (table: string) => findResults[table] ?? null),
      insert: (table: string) => ({
        values: (value: Record<string, unknown>) => {
          const call: InsertCall = { table, value };
          insertCalls.push(call);

          return {
            onConflictDoUpdate: async (update: Record<string, unknown>) => {
              call.update = update;
            },
            onConflictDoNothing: async () => {
              call.didNothing = true;
            },
          };
        },
      }),
    },
    insertCalls,
  };
}

type Handler = (args: {
  event: {
    log: { address: `0x${string}`; logIndex: number };
    args: {
      id: bigint;
      arbitrable: `0x${string}`;
      votingStartTime: bigint;
      votingEndTime: bigint;
      revealPeriodEndTime: bigint;
      creationBlock: bigint;
      arbitrationCost: bigint;
      extraData: `0x${string}`;
      choices: bigint;
    };
    transaction: {
      hash: `0x${string}`;
      from: `0x${string}`;
      gas: bigint;
      input: `0x${string}`;
      nonce: number;
      r: `0x${string}` | null;
      s: `0x${string}` | null;
      to: `0x${string}` | null;
      transactionIndex: number;
      v: bigint | null;
      value: bigint;
    };
    block: {
      number: bigint;
      timestamp: bigint;
    };
  };
  context: {
    chain: { id: number };
    db: ReturnType<typeof createDb>["db"];
  };
}) => Promise<void>;

function getRegisteredHandler(eventName: string): Handler {
  const entry = ponderOnMock.mock.calls.find((call) => call[0] === eventName);
  if (!entry?.[1]) throw new Error(`Expected registered handler for ${eventName}`);
  return entry[1] as Handler;
}

describe("arbitrator dispute-created handlers", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000aa";
  const budgetTreasury = "0x00000000000000000000000000000000000000ab";
  const stakeVault = "0x00000000000000000000000000000000000000ac";
  const budgetTcr = "0x00000000000000000000000000000000000000ad";
  const mechanismTcr = "0x00000000000000000000000000000000000000ae";
  const arbitrator = "0x00000000000000000000000000000000000000af";
  const juror = "0x00000000000000000000000000000000000000b0";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getGoalRowMock.mockResolvedValue({
      id: goalTreasury,
      owner: "0x00000000000000000000000000000000000000b1",
      stakeVault,
      canonicalRouteSlug: "alpha",
    });
    getStakeVaultJurorAccountsMock.mockResolvedValue([juror]);
  });

  it("emits juror notifications and schedules from goal arbitrator disputes", async () => {
    await import("../src/arbitrator/dispute-created");

    const { db, insertCalls } = createDb({
      goalContextByArbitrator: {
        goalTreasury,
        stakeVault,
        budgetTcr,
      },
      juror: {
        currentJurorWeight: 5n,
      },
    });

    await getRegisteredHandler("ERC20VotesArbitrator:DisputeCreated")({
      event: {
        log: { address: arbitrator, logIndex: 3 },
        args: {
          id: 12n,
          arbitrable: budgetTcr,
          votingStartTime: 1_000n,
          votingEndTime: 2_000n,
          revealPeriodEndTime: 3_000n,
          creationBlock: 99n,
          arbitrationCost: 7n,
          extraData: "0x1234",
          choices: 2n,
        },
        transaction: {
          hash: "0x01",
          from: "0x00000000000000000000000000000000000000b2",
          gas: 1n,
          input: "0x",
          nonce: 1,
          r: null,
          s: null,
          to: budgetTcr,
          transactionIndex: 0,
          v: null,
          value: 0n,
        },
        block: {
          number: 100n,
          timestamp: 200n,
        },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(
      insertCalls.some(
        (call) =>
          call.table === "arbitratorDispute" &&
          call.value.tcrKind === "budget" &&
          call.value.tcrAddress === budgetTcr,
      ),
    ).toBe(true);
    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: juror,
            reason: "juror_dispute_created",
          }),
        ],
      }),
    );
    expect(emitProtocolNotificationSchedulesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: juror,
            reason: "juror_voting_open",
            deliverAt: 1_000n,
          }),
          expect.objectContaining({
            recipientWalletAddress: juror,
            reason: "juror_reveal_open",
            deliverAt: 2_000n,
          }),
        ],
      }),
    );
  });

  it("uses mechanism context for mechanism arbitrator disputes", async () => {
    await import("../src/arbitrator/dispute-created");

    const { db, insertCalls } = createDb({
      budgetContextByMechanismArbitrator: {
        allocationMechanismTcr: mechanismTcr,
        goalTreasury,
        budgetTreasury,
        stakeVault,
      },
      juror: {
        currentJurorWeight: 9n,
      },
    });

    await getRegisteredHandler("MechanismERC20VotesArbitrator:DisputeCreated")({
      event: {
        log: { address: arbitrator, logIndex: 4 },
        args: {
          id: 15n,
          arbitrable: mechanismTcr,
          votingStartTime: 5_000n,
          votingEndTime: 6_000n,
          revealPeriodEndTime: 7_000n,
          creationBlock: 120n,
          arbitrationCost: 11n,
          extraData: "0x5678",
          choices: 3n,
        },
        transaction: {
          hash: "0x02",
          from: "0x00000000000000000000000000000000000000b3",
          gas: 1n,
          input: "0x",
          nonce: 2,
          r: null,
          s: null,
          to: mechanismTcr,
          transactionIndex: 0,
          v: null,
          value: 0n,
        },
        block: {
          number: 101n,
          timestamp: 201n,
        },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(
      insertCalls.some(
        (call) =>
          call.table === "arbitratorDispute" &&
          call.value.tcrKind === "mechanism" &&
          call.value.tcrAddress === mechanismTcr &&
          call.value.budgetTreasury === budgetTreasury,
      ),
    ).toBe(true);
    const firstEmitCall = emitProtocolNotificationsMock.mock.calls[0]?.[0] as
      | {
          notifications: Array<{ payload: { resource: { budgetTreasury: string | null } } }>;
        }
      | undefined;
    expect(firstEmitCall?.notifications[0]?.payload.resource.budgetTreasury).toBe(budgetTreasury);
  });
});
