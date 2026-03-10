import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitProtocolNotificationsMock,
  getGoalRowMock,
  getGoalStakeholderAccountsMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitProtocolNotificationsMock: vi.fn(),
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
  budgetStack: "budgetStack",
  budgetTreasury: "budgetTreasury",
  budgetTreasuryByChildFlow: "budgetTreasuryByChildFlow",
  budgetTreasuryByRecipient: "budgetTreasuryByRecipient",
  flow: "flow",
  flowRecipient: "flowRecipient",
  goalContextByBudgetStakeLedger: "goalContextByBudgetStakeLedger",
  goalContextByBudgetTcr: "goalContextByBudgetTcr",
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

function createDb(findResults: Record<string, unknown>) {
  const insertCalls: InsertCall[] = [];
  const updateCalls: UpdateCall[] = [];

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

describe("tcr protocol notification handlers", () => {
  const tcrAddress = "0x00000000000000000000000000000000000000aa";
  const goalTreasury = "0x00000000000000000000000000000000000000bb";
  const submitter = "0x00000000000000000000000000000000000000cc";
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
      canonicalRouteSlug: "alpha",
    });
    getGoalStakeholderAccountsMock.mockResolvedValue([stakeholder]);
  });

  it("uses ItemSubmitted.submitter as the canonical requester for registration requests", async () => {
    await import("../src/tcr/request-submitted");

    const { db, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { submitter },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 7 },
        args: { itemID: itemId, requestIndex: 0n, requestType: 2n },
        transaction: { hash: "0x01", from: txFrom },
        block: { number: 10n, timestamp: 20n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.requester).toBe(submitter);
    expect(requestInsert?.update?.requester).toBe(submitter);

    expect(notificationRoles()).toEqual(
      expect.arrayContaining([
        {
          recipientWalletAddress: stakeholder,
          actorWalletAddress: submitter,
          role: "goal_stakeholder",
        },
        {
          recipientWalletAddress: goalOwner,
          actorWalletAddress: submitter,
          role: "goal_owner",
        },
        {
          recipientWalletAddress: submitter,
          actorWalletAddress: submitter,
          role: "requester",
        },
      ]),
    );
    expect(notificationRoles().some((notification) => notification.actorWalletAddress === txFrom)).toBe(false);
  });

  it("treats removal requester identity as unknown when the event does not expose it", async () => {
    await import("../src/tcr/request-submitted");

    const { db, insertCalls } = createDb({
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
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.requester).toBeNull();
    expect(requestInsert?.update?.requester).toBeNull();
    expect(
      notificationRoles().every((notification) => notification.actorWalletAddress === null),
    ).toBe(true);
    expect(notificationRoles().some((notification) => notification.role === "requester")).toBe(false);
    expect(notificationRoles().some((notification) => notification.role === "submitter")).toBe(true);
  });

  it("does not persist tx.from as a canonical challenger", async () => {
    await import("../src/tcr/dispute");

    const { db, insertCalls } = createDb({
      goalContextByBudgetTcr: { goalTreasury },
      tcrItem: { latestRequestIndex: 2n, submitter },
      tcrRequest: {
        goalTreasury,
        requestType: "registration",
        requester: submitter,
        challenger: null,
      },
    });

    await getLastRegisteredHandler()({
      event: {
        log: { address: tcrAddress, logIndex: 9 },
        args: { itemID: itemId, disputeID: 12n },
        transaction: { hash: "0x03", from: txFrom },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    const requestInsert = insertCalls.find((call) => call.table === "tcrRequest");
    expect(requestInsert?.value.challenger).toBeNull();
    expect(requestInsert?.update?.challenger).toBeNull();
    expect(
      notificationRoles().every((notification) => notification.actorWalletAddress === null),
    ).toBe(true);
    expect(notificationRoles().some((notification) => notification.role === "challenger")).toBe(false);
    expect(notificationRoles().some((notification) => notification.role === "requester")).toBe(true);
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
        requester: submitter,
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
          recipientWalletAddress: submitter,
          actorWalletAddress: submitter,
          role: "requester",
        },
      ]),
    );
    expect(notificationRoles().some((notification) => notification.actorWalletAddress === txFrom)).toBe(false);
  });
});
