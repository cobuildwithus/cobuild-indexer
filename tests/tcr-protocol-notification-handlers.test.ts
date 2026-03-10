import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitProtocolNotificationsMock,
  emitProtocolNotificationSchedulesMock,
  getGoalRowMock,
  getGoalStakeholderAccountsMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitProtocolNotificationsMock: vi.fn(),
  emitProtocolNotificationSchedulesMock: vi.fn(),
  getGoalRowMock: vi.fn(),
  getGoalStakeholderAccountsMock: vi.fn(),
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
  budgetUnderwriterAudience: "budgetUnderwriterAudience",
  budgetUnderwriterCurrent: "budgetUnderwriterCurrent",
  budgetStack: "budgetStack",
  budgetTreasury: "budgetTreasury",
  budgetTreasuryByChildFlow: "budgetTreasuryByChildFlow",
  budgetTreasuryByRecipient: "budgetTreasuryByRecipient",
  flow: "flow",
  flowRecipient: "flowRecipient",
  goalContextByBudgetStakeLedger: "goalContextByBudgetStakeLedger",
  goalContextByBudgetTreasury: "goalContextByBudgetTreasury",
  goalContextByBudgetTcr: "goalContextByBudgetTcr",
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
    emitProtocolNotifications: emitProtocolNotificationsMock,
    emitProtocolNotificationSchedules: emitProtocolNotificationSchedulesMock,
    getGoalRow: getGoalRowMock,
    getGoalStakeholderAccounts: getGoalStakeholderAccountsMock,
  };
});

type InsertCall = {
  table: string;
  value: Record<string, unknown>;
  update?: Record<string, unknown>;
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
    readContract: vi.fn(async () => [0n, 50n] as const),
  };

  return {
    db: {
      find: vi.fn(
        async (table: string, key?: Record<string, unknown>) => {
          const result = findResults[table];
          if (Array.isArray(result)) {
            return result.find((entry) => matchesFindKey(entry.key, key))?.value ?? null;
          }
          return result ?? null;
        },
      ),
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

function getLastRegisteredHandler(): Handler {
  const handler = ponderOnMock.mock.calls.at(-1)?.[1];
  if (!handler) throw new Error("Expected a registered handler.");
  return handler as Handler;
}

function notificationRoles() {
  const emitArgs = emitProtocolNotificationsMock.mock.calls[0]?.[0] as
    | { notifications: Array<{ recipientWalletAddress: string; actorWalletAddress?: string | null; payload: Record<string, unknown> }> }
    | undefined;
  if (!emitArgs) return [];

  return emitArgs.notifications.map((notification) => ({
    recipientWalletAddress: notification.recipientWalletAddress,
    actorWalletAddress: notification.actorWalletAddress ?? null,
    role:
      typeof notification.payload.role === "string"
        ? notification.payload.role
        : null,
  }));
}

function scheduledNotifications() {
  const emitArgs = emitProtocolNotificationSchedulesMock.mock.calls[0]?.[0] as
    | {
        notifications: Array<{
          recipientWalletAddress: string;
          reason: string;
          deliverAt: bigint;
          payload: Record<string, unknown>;
        }>;
      }
    | undefined;
  if (!emitArgs) return [];

  return emitArgs.notifications.map((notification) => ({
    recipientWalletAddress: notification.recipientWalletAddress,
    reason: notification.reason,
    deliverAt: notification.deliverAt,
    role:
      typeof notification.payload.role === "string"
        ? notification.payload.role
        : null,
  }));
}

describe("tcr protocol notification handlers", () => {
  const tcrAddress = "0x00000000000000000000000000000000000000aa";
  const goalTreasury = "0x00000000000000000000000000000000000000bb";
  const submitter = "0x00000000000000000000000000000000000000cc";
  const requester = "0x00000000000000000000000000000000000000c1";
  const challenger = "0x00000000000000000000000000000000000000c2";
  const staleRequester = "0x00000000000000000000000000000000000000c3";
  const goalOwner = "0x00000000000000000000000000000000000000dd";
  const stakeholder = "0x00000000000000000000000000000000000000ee";
  const txFrom = "0x00000000000000000000000000000000000000ff";
  const budgetTreasury = "0x0000000000000000000000000000000000000011";
  const childFlow = "0x0000000000000000000000000000000000000012";
  const parentFlow = "0x0000000000000000000000000000000000000013";
  const itemId =
    "0x1111111111111111111111111111111111111111111111111111111111111111";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getGoalRowMock.mockResolvedValue({
      id: goalTreasury,
      owner: goalOwner,
      stakeVault: "0x00000000000000000000000000000000000000ab",
      canonicalRouteSlug: "alpha",
    });
    getGoalStakeholderAccountsMock.mockResolvedValue([stakeholder]);
  });

  it("uses the emitted requester as the canonical requester for registration requests", async () => {
    await import("../src/tcr/request-submitted");

    const { db, client, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { submitter },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 7 },
        args: { itemID: itemId, requestIndex: 0n, requestType: 2n, requester },
        transaction: { hash: "0x01", from: txFrom },
        block: { number: 10n, timestamp: 20n },
      },
      context: {
        chain: { id: 8453 },
        db,
        client,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.requester).toBe(requester);
    expect(requestInsert?.update?.requester).toBe(requester);

    expect(notificationRoles()).toEqual(
      expect.arrayContaining([
        {
          recipientWalletAddress: stakeholder,
          actorWalletAddress: requester,
          role: "goal_stakeholder",
        },
        {
          recipientWalletAddress: goalOwner,
          actorWalletAddress: requester,
          role: "goal_owner",
        },
        {
          recipientWalletAddress: requester,
          actorWalletAddress: requester,
          role: "requester",
        },
      ]),
    );
    expect(notificationRoles().some((notification) => notification.actorWalletAddress === txFrom)).toBe(false);
    expect(scheduledNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientWalletAddress: stakeholder,
          reason: "budget_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "goal_stakeholder",
        }),
        expect.objectContaining({
          recipientWalletAddress: goalOwner,
          reason: "budget_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "goal_owner",
        }),
        expect.objectContaining({
          recipientWalletAddress: requester,
          reason: "budget_proposal_challenge_window_ending_soon",
          deliverAt: 35n,
          role: "requester",
        }),
      ]),
    );
  });

  it("uses the emitted requester for removal requests", async () => {
    await import("../src/tcr/request-submitted");

    const { db, client, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { submitter },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 8 },
        args: { itemID: itemId, requestIndex: 1n, requestType: 3n, requester },
        transaction: { hash: "0x02", from: txFrom },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
        client,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.requester).toBe(requester);
    expect(requestInsert?.update?.requester).toBe(requester);
    expect(
      notificationRoles().every((notification) => notification.actorWalletAddress === requester),
    ).toBe(true);
    expect(
      notificationRoles().some(
        (notification) =>
          notification.role === "requester" &&
          notification.recipientWalletAddress === requester,
      ),
    ).toBe(true);
    expect(notificationRoles().some((notification) => notification.role === "proposer")).toBe(true);
    expect(scheduledNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientWalletAddress: requester,
          reason: "budget_removal_challenge_window_ending_soon",
          deliverAt: 36n,
          role: "requester",
        }),
        expect.objectContaining({
          recipientWalletAddress: submitter,
          reason: "budget_removal_challenge_window_ending_soon",
          deliverAt: 36n,
          role: "proposer",
        }),
      ]),
    );
  });

  it("does not fall back to submitter or tx.from when requester is missing", async () => {
    await import("../src/tcr/request-submitted");

    const { db, client, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { submitter },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 8 },
        args: { itemID: itemId, requestIndex: 1n, requestType: 3n },
        transaction: { hash: "0x02", from: txFrom },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
        client,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.requester).toBeNull();
    expect(requestInsert?.update?.requester).toBeNull();
    expect(notificationRoles().every((notification) => notification.actorWalletAddress === null)).toBe(true);
    expect(notificationRoles().some((notification) => notification.role === "requester")).toBe(false);
    expect(notificationRoles().some((notification) => notification.role === "proposer")).toBe(true);
    expect(notificationRoles().some((notification) => notification.actorWalletAddress === txFrom)).toBe(false);
    expect(scheduledNotifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientWalletAddress: stakeholder,
          reason: "budget_removal_challenge_window_ending_soon",
          deliverAt: 36n,
          role: "goal_stakeholder",
        }),
        expect.objectContaining({
          recipientWalletAddress: goalOwner,
          reason: "budget_removal_challenge_window_ending_soon",
          deliverAt: 36n,
          role: "goal_owner",
        }),
        expect.objectContaining({
          recipientWalletAddress: submitter,
          reason: "budget_removal_challenge_window_ending_soon",
          deliverAt: 36n,
          role: "proposer",
        }),
      ]),
    );
  });

  it("uses the emitted requestIndex and challenger for disputes", async () => {
    await import("../src/tcr/dispute");

    const { db, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { latestRequestIndex: 5n, submitter },
      tcrRequest: [
        {
          key: { id: `${tcrAddress}:${itemId}:2` },
          value: {
            goalTreasury,
            requestType: "registration",
            requester,
            challenger: null,
          },
        },
        {
          key: { id: `${tcrAddress}:${itemId}:5` },
          value: {
            goalTreasury,
            requestType: "clearing",
            requester: staleRequester,
            challenger: null,
          },
        },
      ],
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 9 },
        args: { itemID: itemId, disputeID: 12n, requestIndex: 2n, challenger },
        transaction: { hash: "0x03", from: txFrom },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.id).toBe(`${tcrAddress}:${itemId}:2`);
    expect(requestInsert?.value.requestType).toBe("registration");
    expect(requestInsert?.value.requester).toBe(requester);
    expect(requestInsert?.value.challenger).toBe(challenger);
    expect(requestInsert?.update?.challenger).toBe(challenger);
    expect(
      notificationRoles().every((notification) => notification.actorWalletAddress === challenger),
    ).toBe(true);
    expect(
      notificationRoles().some(
        (notification) =>
          notification.role === "challenger" &&
          notification.recipientWalletAddress === challenger,
      ),
    ).toBe(true);
    expect(notificationRoles().some((notification) => notification.role === "requester")).toBe(true);
  });

  it("does not schedule juror phase notifications from TCR disputes", async () => {
    await import("../src/tcr/dispute");

    const juror = "0x00000000000000000000000000000000000000c4";
    const arbitrator = "0x00000000000000000000000000000000000000a1";
    const { db } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { submitter },
      tcrRequest: [
        {
          key: { id: `${tcrAddress}:${itemId}:2` },
          value: {
            goalTreasury,
            requestType: "registration",
            requester,
            challenger: null,
          },
        },
      ],
      arbitratorDispute: {
        arbitrator,
        disputeId: 12n,
        jurorAddresses: [juror],
        votingStartTime: 1_000n,
        votingEndTime: 2_000n,
        revealPeriodEndTime: 100_000n,
      },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 9 },
        args: {
          itemID: itemId,
          disputeID: 12n,
          requestIndex: 2n,
          challenger,
          arbitrator,
        },
        transaction: { hash: "0x03", from: txFrom },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(scheduledNotifications()).toEqual([]);
  });

  it("does not process disputes when the emitted requestIndex is missing", async () => {
    await import("../src/tcr/dispute");

    const { db, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { latestRequestIndex: 5n, submitter },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 9 },
        args: { itemID: itemId, disputeID: 12n, challenger },
        transaction: { hash: "0x03", from: txFrom },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(insertCalls.some((call) => call.table === "tcrRequest")).toBe(false);
    expect(emitProtocolNotificationsMock).not.toHaveBeenCalled();
  });

  it("does not process disputes when the emitted challenger is missing", async () => {
    await import("../src/tcr/dispute");

    const { db, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { latestRequestIndex: 5n, submitter },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 9 },
        args: { itemID: itemId, disputeID: 12n, requestIndex: 2n },
        transaction: { hash: "0x03", from: txFrom },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(insertCalls.some((call) => call.table === "tcrRequest")).toBe(false);
    expect(emitProtocolNotificationsMock).not.toHaveBeenCalled();
  });

  it("reuses the stored canonical requester for later budget activation notifications", async () => {
    await import("../src/stakeLedger/budget-registered");

    const { db } = createDb({
      budgetTreasury: { childFlow },
      flow: { parentFlow },
      goalContextByBudgetStakeLedger: { goalTreasury, budgetTcr: tcrAddress },
      tcrItem: { latestRequestIndex: 2n, submitter },
      tcrRequest: {
        goalTreasury,
        requestType: "registration",
        requester,
      },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: "0x0000000000000000000000000000000000000021", logIndex: 10 },
        args: { recipientId: itemId, budget: budgetTreasury },
        transaction: { hash: "0x04", from: txFrom },
        block: { number: 13n, timestamp: 23n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(notificationRoles()).toEqual(
      expect.arrayContaining([
        {
          recipientWalletAddress: requester,
          actorWalletAddress: requester,
          role: "requester",
        },
      ]),
    );
    expect(notificationRoles().some((notification) => notification.actorWalletAddress === txFrom)).toBe(false);
  });
});
