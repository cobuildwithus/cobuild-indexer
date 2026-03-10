import { beforeEach, describe, expect, it, vi } from "vitest";
import { reassertGraceReminderSourceId } from "../src/helpers/ids";

const {
  emitProtocolNotificationsMock,
  getBudgetLifecycleNotificationContextMock,
  getGoalRowMock,
  getGoalStakeholderAccountsMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitProtocolNotificationsMock: vi.fn(),
  getBudgetLifecycleNotificationContextMock: vi.fn(),
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
  protocolNotificationOutbox: "protocolNotificationOutbox",
  protocolNotificationSchedule: "protocolNotificationSchedule",
  stakePosition: "stakePosition",
  stakeVault: "stakeVault",
  stakeVaultJurorAudience: "stakeVaultJurorAudience",
  tcrItem: "tcrItem",
  tcrRequest: "tcrRequest",
  treasurySuccessAssertionContext: "treasurySuccessAssertionContext",
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

vi.mock("../src/helpers/protocolNotifications", async () => {
  const actual =
    await vi.importActual<typeof import("../src/helpers/protocolNotifications")>(
      "../src/helpers/protocolNotifications"
    );

  return {
    ...actual,
    emitProtocolNotifications: emitProtocolNotificationsMock,
    getBudgetLifecycleNotificationContext: getBudgetLifecycleNotificationContextMock,
    getGoalRow: getGoalRowMock,
    getGoalStakeholderAccounts: getGoalStakeholderAccountsMock,
  };
});

type UpdateCall = {
  table: string;
  key: Record<string, unknown>;
  setArg: unknown;
};

type InsertCall = {
  table: string;
  value: unknown;
  update?: unknown;
  didNothing?: boolean;
};

function createDb() {
  const insertCalls: InsertCall[] = [];
  const updateCalls: UpdateCall[] = [];

  return {
    db: {
      find: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
      insert: (table: string) => ({
        values: (value: unknown) => {
          const call: InsertCall = { table, value };
          insertCalls.push(call);
          return {
            onConflictDoUpdate: async (update: unknown) => {
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

function getRegisteredHandler<TArgs extends Record<string, unknown>>(eventName: string): Handler<TArgs> {
  const entry = ponderOnMock.mock.calls.find((call) => call[0] === eventName);
  if (!entry?.[1]) throw new Error(`Expected registered handler for ${eventName}`);
  return entry[1] as Handler<TArgs>;
}

describe("protocol notification completeness handlers", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000aa";
  const budgetTreasury = "0x00000000000000000000000000000000000000ab";
  const stakeholder = "0x00000000000000000000000000000000000000ac";
  const requester = "0x00000000000000000000000000000000000000ad";
  const proposer = "0x00000000000000000000000000000000000000ae";
  const underwriter = "0x00000000000000000000000000000000000000af";
  const controller = "0x00000000000000000000000000000000000000b0";
  const itemId =
    "0x1111111111111111111111111111111111111111111111111111111111111111";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getGoalRowMock.mockResolvedValue({
      id: goalTreasury,
      owner: "0x00000000000000000000000000000000000000b1",
      stakeVault: "0x00000000000000000000000000000000000000b2",
      canonicalRouteSlug: "alpha",
    });
    getGoalStakeholderAccountsMock.mockResolvedValue([stakeholder]);
    getBudgetLifecycleNotificationContextMock.mockResolvedValue({
      goalRow: {
        id: goalTreasury,
        owner: "0x00000000000000000000000000000000000000b1",
        stakeVault: "0x00000000000000000000000000000000000000b2",
        canonicalRouteSlug: "alpha",
      },
      budgetController: controller,
      itemId,
      requester,
      proposer,
      requestIndex: 3n,
      stakeholderAccounts: [stakeholder],
      underwriterAccounts: [underwriter],
    });
  });

  it("emits goal success assertion notifications to the goal owner and stakeholders", async () => {
    await import("../src/goals/success-assertion-registered");

    const { db, insertCalls, updateCalls } = createDb();

    await getRegisteredHandler<{
      assertionId: `0x${string}`;
      assertedAt: bigint;
    }>("GoalTreasury:SuccessAssertionRegistered")({
      event: {
        log: { address: goalTreasury, logIndex: 7 },
        args: {
          assertionId:
            "0x2222222222222222222222222222222222222222222222222222222222222222",
          assertedAt: 21n,
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

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "goalTreasury",
          key: { id: goalTreasury },
          setArg: expect.objectContaining({
            successAssertionRegisteredAt: 21n,
          }),
        }),
      ])
    );
    expect(insertCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "treasurySuccessAssertionContext",
          value: expect.objectContaining({
            id:
              "0x2222222222222222222222222222222222222222222222222222222222222222",
            scope: "goal",
            treasury: goalTreasury,
          }),
          update: expect.objectContaining({
            scope: "goal",
            treasury: goalTreasury,
          }),
        }),
      ])
    );
    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: stakeholder,
            reason: "goal_success_assertion_registered",
            payload: expect.objectContaining({ role: "goal_stakeholder" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: "0x00000000000000000000000000000000000000b1",
            reason: "goal_success_assertion_registered",
            payload: expect.objectContaining({ role: "goal_owner" }),
          }),
        ]),
      })
    );
  });

  it("emits budget success assertion notifications to underwriters, request actors, and the controller", async () => {
    await import("../src/budgets/success-resolution-disabled");

    const { db, updateCalls } = createDb();

    await getRegisteredHandler<Record<string, never>>("BudgetTreasury:SuccessResolutionDisabled")({
      event: {
        log: { address: budgetTreasury, logIndex: 8 },
        args: {},
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
          from: "0x00000000000000000000000000000000000000b4",
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
          table: "budgetTreasury",
          key: { id: budgetTreasury },
          setArg: expect.objectContaining({
            successResolutionDisabled: true,
          }),
        }),
      ])
    );
    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: controller,
            reason: "budget_success_resolution_disabled",
            payload: expect.objectContaining({ role: "budget_controller" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: underwriter,
            reason: "budget_success_resolution_disabled",
            payload: expect.objectContaining({ role: "budget_underwriter" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: requester,
            reason: "budget_success_resolution_disabled",
            payload: expect.objectContaining({ role: "requester" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: proposer,
            reason: "budget_success_resolution_disabled",
            payload: expect.objectContaining({ role: "proposer" }),
          }),
        ]),
      })
    );
  });

  it("emits budget lifecycle notifications to the expanded audience set", async () => {
    await import("../src/budgets/state-transition");

    const { db, updateCalls } = createDb();

    await getRegisteredHandler<{
      newState: bigint;
    }>("BudgetTreasury:StateTransition")({
      event: {
        log: { address: budgetTreasury, logIndex: 9 },
        args: {
          newState: 3n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
          from: "0x00000000000000000000000000000000000000b5",
        },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "budgetTreasury",
          key: { id: budgetTreasury },
          setArg: expect.objectContaining({
            state: 3,
          }),
        }),
      ])
    );
    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: "0x00000000000000000000000000000000000000b1",
            reason: "budget_failed",
            payload: expect.objectContaining({ role: "goal_owner" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: controller,
            reason: "budget_failed",
            payload: expect.objectContaining({ role: "budget_controller" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: underwriter,
            reason: "budget_failed",
            payload: expect.objectContaining({ role: "budget_underwriter" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: requester,
            reason: "budget_failed",
            payload: expect.objectContaining({ role: "requester" }),
          }),
          expect.objectContaining({
            recipientWalletAddress: proposer,
            reason: "budget_failed",
            payload: expect.objectContaining({ role: "proposer" }),
          }),
        ]),
      })
    );
  });

  it("invalidates the prior goal reassert-grace reminder before clearing the assertion state", async () => {
    await import("../src/goals/success-assertion-cleared");

    const { db, updateCalls } = createDb();
    db.find.mockResolvedValueOnce({
      successAssertionId:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      reassertGraceDeadline: 99n,
    });

    await getRegisteredHandler<Record<string, never>>("GoalTreasury:SuccessAssertionCleared")({
      event: {
        log: { address: goalTreasury, logIndex: 10 },
        args: {},
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
          from: "0x00000000000000000000000000000000000000b6",
        },
        block: { number: 13n, timestamp: 23n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "goalTreasury",
          key: { id: goalTreasury },
          setArg: expect.objectContaining({
            successAssertionId: null,
            successAssertionRegisteredAt: null,
            reassertGraceDeadline: null,
          }),
        }),
      ])
    );
    expect(emitProtocolNotificationsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: stakeholder,
            reason: "goal_success_assertion_reassert_grace_ending_soon",
            action: "invalidate",
            notificationClass: "cycle",
            sourceType: "goal_success_assertion_reassert_grace_reminder",
            sourceId: reassertGraceReminderSourceId(
              goalTreasury,
              "0x2222222222222222222222222222222222222222222222222222222222222222"
            ),
            payload: expect.objectContaining({
              schedule: expect.objectContaining({
                reassertGraceDeadline: "99",
              }),
            }),
          }),
        ]),
      })
    );
    expect(emitProtocolNotificationsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: stakeholder,
            reason: "goal_success_assertion_cleared",
          }),
        ]),
      })
    );
  });

  it("invalidates the prior budget reassert-grace reminder before clearing the assertion state", async () => {
    await import("../src/budgets/success-assertion-cleared");

    const { db, updateCalls } = createDb();
    db.find.mockResolvedValueOnce({
      successAssertionId:
        "0x3333333333333333333333333333333333333333333333333333333333333333",
      reassertGraceDeadline: 111n,
    });

    await getRegisteredHandler<Record<string, never>>("BudgetTreasury:SuccessAssertionCleared")({
      event: {
        log: { address: budgetTreasury, logIndex: 11 },
        args: {},
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000005",
          from: "0x00000000000000000000000000000000000000b7",
        },
        block: { number: 14n, timestamp: 24n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "budgetTreasury",
          key: { id: budgetTreasury },
          setArg: expect.objectContaining({
            successAssertionId: null,
            successAssertionRegisteredAt: null,
            reassertGraceDeadline: null,
          }),
        }),
      ])
    );
    expect(emitProtocolNotificationsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: controller,
            reason: "budget_success_assertion_reassert_grace_ending_soon",
            action: "invalidate",
            notificationClass: "cycle",
            sourceType: "budget_success_assertion_reassert_grace_reminder",
            sourceId: reassertGraceReminderSourceId(
              budgetTreasury,
              "0x3333333333333333333333333333333333333333333333333333333333333333"
            ),
            payload: expect.objectContaining({
              schedule: expect.objectContaining({
                reassertGraceDeadline: "111",
              }),
            }),
          }),
        ]),
      })
    );
    expect(emitProtocolNotificationsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: controller,
            reason: "budget_success_assertion_cleared",
          }),
        ]),
      })
    );
  });
});
