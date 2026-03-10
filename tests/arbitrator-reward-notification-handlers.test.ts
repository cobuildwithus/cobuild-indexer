import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitProtocolNotificationsMock,
  getGoalRowMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitProtocolNotificationsMock: vi.fn(),
  getGoalRowMock: vi.fn(),
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
  budgetTreasury: "budgetTreasury",
  budgetUnderwriterAudience: "budgetUnderwriterAudience",
  budgetUnderwriterCurrent: "budgetUnderwriterCurrent",
  goalContextByBudgetStakeLedger: "goalContextByBudgetStakeLedger",
  goalContextByBudgetTreasury: "goalContextByBudgetTreasury",
  goalStakeholderAudience: "goalStakeholderAudience",
  goalTreasury: "goalTreasury",
  goalUnderwriterAudience: "goalUnderwriterAudience",
  goalUnderwriterCurrent: "goalUnderwriterCurrent",
  juror: "juror",
  jurorVoteReceipt: "jurorVoteReceipt",
  protocolNotificationOutbox: "protocolNotificationOutbox",
  protocolNotificationSchedule: "protocolNotificationSchedule",
  stakePosition: "stakePosition",
  stakeVault: "stakeVault",
  stakeVaultJurorAudience: "stakeVaultJurorAudience",
  tcrItem: "tcrItem",
  tcrRequest: "tcrRequest",
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
    getGoalRow: getGoalRowMock,
  };
});

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  didNothing?: boolean;
};

type UpdateCall = {
  table: string;
  key: Record<string, unknown>;
  setArg: unknown;
};

type KeyedFindResult = {
  key: Record<string, unknown>;
  value: unknown;
};

function matchesFindKey(
  expected: Record<string, unknown>,
  actual: Record<string, unknown> | undefined,
): boolean {
  if (!actual) return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function createDb(findResults: Record<string, unknown | KeyedFindResult[]>) {
  const insertCalls: InsertCall[] = [];
  const updateCalls: UpdateCall[] = [];
  const client = {
    readContract: vi.fn(),
  };

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
            onConflictDoNothing: async () => {
              call.didNothing = true;
            },
          };
        },
      }),
      update: (table: string, key: Record<string, unknown>) => ({
        set: async (setArg: unknown) => {
          updateCalls.push({ table, key, setArg });
        },
      }),
    },
    client,
    insertCalls,
    updateCalls,
  };
}

function allNotifications() {
  return emitProtocolNotificationsMock.mock.calls.flatMap((call) => {
    const args = call[0] as { notifications: Array<Record<string, unknown>> };
    return args.notifications;
  });
}

type Handler = (args: {
  event: {
    log: { address: `0x${string}`; logIndex: number };
    args: Record<string, unknown>;
    transaction: { hash: `0x${string}`; from: `0x${string}` };
    block: { number: bigint; timestamp: bigint };
  };
  context: {
    chain: { id: number };
    db: ReturnType<typeof createDb>["db"];
    client: ReturnType<typeof createDb>["client"];
  };
}) => Promise<void>;

function getRegisteredHandler(eventName: string): Handler {
  const entry = ponderOnMock.mock.calls.find((call) => call[0] === eventName);
  if (!entry?.[1]) throw new Error(`Expected registered handler for ${eventName}`);
  return entry[1] as Handler;
}

describe("arbitrator reward notification handlers", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000aa";
  const budgetTreasury = "0x00000000000000000000000000000000000000ab";
  const arbitrator = "0x00000000000000000000000000000000000000ac";
  const juror = "0x00000000000000000000000000000000000000ad";
  const itemId =
    "0x1111111111111111111111111111111111111111111111111111111111111111";

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

  it("opens a claimable reward cycle when onchain claimability appears", async () => {
    const { syncJurorRewardClaimableNotification } = await import(
      "../src/arbitrator/reward-notifications"
    );
    const { db, client, updateCalls } = createDb({
      arbitratorDispute: {
        goalTreasury,
        budgetTreasury,
        itemId,
        requestIndex: 3n,
      },
      jurorVoteReceipt: null,
    });
    client.readContract.mockResolvedValue({
      claimableReward: 10n,
      claimableGoalSlashReward: 4n,
      claimableCobuildSlashReward: 1n,
    });
    const context = {
      chain: { id: 8453, name: "base" },
      db,
      client,
    } as unknown as Parameters<typeof syncJurorRewardClaimableNotification>[0]["context"];

    await syncJurorRewardClaimableNotification({
      context,
      event: {
        transaction: { hash: "0x01" },
        block: { number: 10n, timestamp: 20n },
        log: { address: arbitrator, logIndex: 7 },
      },
      arbitratorAddress: arbitrator,
      disputeId: 12n,
      round: 0n,
      jurorAddress: juror,
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "jurorVoteReceipt",
          key: {
            id: `${arbitrator}:12:0:${juror}`,
          },
          setArg: expect.objectContaining({
            claimableRewardAmount: 10n,
            claimableGoalSlashRewardAmount: 4n,
            claimableCobuildSlashRewardAmount: 1n,
            claimableNotificationSourceId: expect.any(String),
          }),
        }),
      ]),
    );

    expect(allNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "juror_reward_claimable",
          sourceType: "juror_reward_claimable_cycle",
          action: "upsert",
          notificationClass: "cycle",
          recipientWalletAddress: juror,
          payload: expect.objectContaining({
            role: "juror",
            amounts: expect.objectContaining({
              claimable: "15",
              claimableReward: "10",
              claimableGoalSlashReward: "4",
              claimableCobuildSlashReward: "1",
            }),
          }),
        }),
      ]),
    );
  });

  it("aggregates slash rewards into juror reward claims and invalidates the prior claimable cycle", async () => {
    await import("../src/arbitrator/reward-withdrawn");

    const existingClaimableSourceId = "cycle-source-id";
    const { db, client, updateCalls } = createDb({
      arbitratorDispute: {
        goalTreasury,
        budgetTreasury,
        itemId,
        requestIndex: 3n,
      },
      jurorVoteReceipt: {
        pendingSlashClaimTxHash: "0x02",
        pendingSlashClaimGoalAmount: 4n,
        pendingSlashClaimCobuildAmount: 5n,
        claimableRewardAmount: 7n,
        claimableGoalSlashRewardAmount: 4n,
        claimableCobuildSlashRewardAmount: 5n,
        claimableNotificationSourceId: existingClaimableSourceId,
      },
    });
    client.readContract.mockResolvedValue({
      claimableReward: 0n,
      claimableGoalSlashReward: 0n,
      claimableCobuildSlashReward: 0n,
    });

    await getRegisteredHandler("ERC20VotesArbitrator:RewardWithdrawn")({
      event: {
        log: { address: arbitrator, logIndex: 8 },
        args: {
          disputeId: 12n,
          round: 0n,
          voter: juror,
          amount: 7n,
        },
        transaction: {
          hash: "0x02",
          from: "0x00000000000000000000000000000000000000b2",
        },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
        client,
      },
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "jurorVoteReceipt",
          setArg: expect.objectContaining({
            rewardAmount: 7n,
            pendingSlashClaimTxHash: null,
            pendingSlashClaimGoalAmount: null,
            pendingSlashClaimCobuildAmount: null,
          }),
        }),
        expect.objectContaining({
          table: "jurorVoteReceipt",
          setArg: expect.objectContaining({
            claimableRewardAmount: 0n,
            claimableGoalSlashRewardAmount: 0n,
            claimableCobuildSlashRewardAmount: 0n,
            claimableNotificationSourceId: null,
          }),
        }),
      ]),
    );

    expect(allNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "juror_reward_claimed",
          sourceType: "juror_reward_claim",
          recipientWalletAddress: juror,
          payload: expect.objectContaining({
            role: "juror",
            amounts: expect.objectContaining({
              claimedAmount: "16",
              claimedReward: "7",
              claimedGoalSlashReward: "4",
              claimedCobuildSlashReward: "5",
            }),
          }),
        }),
        expect.objectContaining({
          reason: "juror_reward_claimable",
          sourceType: "juror_reward_claimable_cycle",
          sourceId: existingClaimableSourceId,
          action: "invalidate",
          notificationClass: "cycle",
          recipientWalletAddress: juror,
        }),
      ]),
    );
  });
});
