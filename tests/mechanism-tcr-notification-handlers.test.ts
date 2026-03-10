import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitProtocolNotificationsMock,
  emitProtocolNotificationSchedulesMock,
  getBudgetUnderwriterAccountsMock,
  getGoalRowMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitProtocolNotificationsMock: vi.fn(),
  emitProtocolNotificationSchedulesMock: vi.fn(),
  getBudgetUnderwriterAccountsMock: vi.fn(),
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
  budgetTreasury: "budgetTreasury",
  budgetUnderwriterAudience: "budgetUnderwriterAudience",
  budgetUnderwriterCurrent: "budgetUnderwriterCurrent",
  budgetContextByMechanismTcr: "budgetContextByMechanismTcr",
  budgetMechanismRegistry: "budgetMechanismRegistry",
  goalStakeholderAudience: "goalStakeholderAudience",
  goalTreasury: "goalTreasury",
  goalUnderwriterAudience: "goalUnderwriterAudience",
  goalUnderwriterCurrent: "goalUnderwriterCurrent",
  juror: "juror",
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
    emitProtocolNotificationSchedules: emitProtocolNotificationSchedulesMock,
    emitProtocolNotifications: emitProtocolNotificationsMock,
    getBudgetUnderwriterAccounts: getBudgetUnderwriterAccountsMock,
    getGoalRow: getGoalRowMock,
  };
});

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
  actual: Record<string, unknown> | undefined,
): boolean {
  if (!actual) return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function createDb(findResults: Record<string, unknown | KeyedFindResult[]>) {
  const insertCalls: InsertCall[] = [];
  const updateCalls: Array<{ table: string; key: Record<string, unknown>; setArg: unknown }> = [];
  const client = {
    readContract: vi.fn(async () => [0n, 50n] as const),
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
    client,
    insertCalls,
    updateCalls,
  };
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
    client?: ReturnType<typeof createDb>["client"];
  };
}) => Promise<void>;

function scheduledNotifications() {
  const emitArgs = emitProtocolNotificationSchedulesMock.mock.calls[0]?.[0] as
    | {
        notifications: Array<{
          recipientWalletAddress: string;
          reason: string;
          deliverAt: bigint;
          payload: { role?: string };
        }>;
      }
    | undefined;
  if (!emitArgs) return [];

  return emitArgs.notifications.map((notification) => ({
    recipientWalletAddress: notification.recipientWalletAddress,
    reason: notification.reason,
    deliverAt: notification.deliverAt,
    role: typeof notification.payload.role === "string" ? notification.payload.role : null,
  }));
}

function getLastRegisteredHandler(): Handler {
  const handler = ponderOnMock.mock.calls.at(-1)?.[1];
  if (!handler) throw new Error("Expected a registered handler.");
  return handler as Handler;
}

describe("mechanism TCR notification handlers", () => {
  const mechanismTcr = "0x00000000000000000000000000000000000000aa";
  const goalTreasury = "0x00000000000000000000000000000000000000ab";
  const budgetTreasury = "0x00000000000000000000000000000000000000ac";
  const requester = "0x00000000000000000000000000000000000000ad";
  const proposer = "0x00000000000000000000000000000000000000ae";
  const underwriter = "0x00000000000000000000000000000000000000af";
  const controller = "0x00000000000000000000000000000000000000b2";
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
    getBudgetUnderwriterAccountsMock.mockResolvedValue([underwriter]);
  });

  it("uses the emitted requester for mechanism proposals", async () => {
    await import("../src/mechanismTcr/request-submitted");

    const { db, client, insertCalls } = createDb({
      budgetContextByMechanismTcr: {
        goalTreasury,
        budgetTreasury,
      },
      budgetTreasury: {
        controller,
      },
      tcrItem: {
        submitter: proposer,
      },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: mechanismTcr, logIndex: 7 },
        args: {
          itemID: itemId,
          requestIndex: 0n,
          requestType: 2n,
          requester,
        },
        transaction: {
          hash: "0x01",
          from: "0x00000000000000000000000000000000000000b2",
        },
        block: { number: 10n, timestamp: 20n },
      },
      context: {
        chain: { id: 8453 },
        db,
        client,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.tcrKind).toBe("mechanism");
    expect(requestInsert?.value.requester).toBe(requester);

    const emitArgs = emitProtocolNotificationsMock.mock.calls[0]?.[0] as {
      notifications: Array<{
        recipientWalletAddress: string;
        actorWalletAddress?: string | null;
        reason: string;
        payload: { role?: string; resource?: { budgetTreasury?: string | null } };
      }>;
    };
    expect(emitArgs.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientWalletAddress: underwriter,
          actorWalletAddress: requester,
          reason: "mechanism_proposed",
        }),
        expect.objectContaining({
          recipientWalletAddress: requester,
          actorWalletAddress: requester,
          reason: "mechanism_proposed",
          payload: expect.objectContaining({ role: "requester" }),
        }),
        expect.objectContaining({
          recipientWalletAddress: controller,
          actorWalletAddress: requester,
          reason: "mechanism_proposed",
          payload: expect.objectContaining({ role: "budget_controller" }),
        }),
        expect.objectContaining({
          recipientWalletAddress: proposer,
          actorWalletAddress: requester,
          reason: "mechanism_proposed",
          payload: expect.objectContaining({ role: "proposer" }),
        }),
      ]),
    );
    expect(
      emitArgs.notifications.every(
        (notification) => notification.payload.resource?.budgetTreasury === budgetTreasury,
      ),
    ).toBe(true);
    expect(scheduledNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientWalletAddress: underwriter,
          reason: "mechanism_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "budget_underwriter",
        }),
        expect.objectContaining({
          recipientWalletAddress: requester,
          reason: "mechanism_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "requester",
        }),
        expect.objectContaining({
          recipientWalletAddress: controller,
          reason: "mechanism_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "budget_controller",
        }),
        expect.objectContaining({
          recipientWalletAddress: proposer,
          reason: "mechanism_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "proposer",
        }),
      ]),
    );
  });

  it("reuses the stored requester for mechanism activation and updates active topology", async () => {
    await import("../src/mechanismTcr/mechanism-activated");

    const { db, updateCalls } = createDb({
      budgetContextByMechanismTcr: {
        goalTreasury,
        budgetTreasury,
      },
      budgetTreasury: {
        controller,
      },
      tcrItem: {
        latestRequestIndex: 2n,
        submitter: proposer,
      },
      tcrRequest: {
        requester,
      },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: mechanismTcr, logIndex: 8 },
        args: {
          itemID: itemId,
          mechanism: "0x00000000000000000000000000000000000000b3",
          fundingEscrow: "0x00000000000000000000000000000000000000b4",
          payoutRecipient: "0x00000000000000000000000000000000000000b5",
          arbitrator: "0x00000000000000000000000000000000000000b6",
          auxiliary: "0x00000000000000000000000000000000000000b7",
        },
        transaction: {
          hash: "0x02",
          from: "0x00000000000000000000000000000000000000b8",
        },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "budgetMechanismRegistry",
          key: { id: mechanismTcr },
          setArg: expect.objectContaining({
            activeItemId: itemId,
            activeMechanism: "0x00000000000000000000000000000000000000b3",
            activeFundingEscrow: "0x00000000000000000000000000000000000000b4",
            activePayoutRecipient: "0x00000000000000000000000000000000000000b5",
            activeDeploymentArbitrator: "0x00000000000000000000000000000000000000b6",
          }),
        }),
      ]),
    );

    const emitArgs = emitProtocolNotificationsMock.mock.calls[0]?.[0] as {
      notifications: Array<{
        recipientWalletAddress: string;
        actorWalletAddress?: string | null;
        reason: string;
      }>;
    };
    expect(emitArgs.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientWalletAddress: requester,
          actorWalletAddress: requester,
          reason: "mechanism_activated",
        }),
        expect.objectContaining({
          recipientWalletAddress: controller,
          actorWalletAddress: requester,
          reason: "mechanism_activated",
        }),
        expect.objectContaining({
          recipientWalletAddress: underwriter,
          actorWalletAddress: requester,
          reason: "mechanism_activated",
        }),
      ]),
    );
  });
});
