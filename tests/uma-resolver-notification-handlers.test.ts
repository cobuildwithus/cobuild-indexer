import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitBudgetAudienceNotificationMock,
  emitGoalAudienceNotificationMock,
  insertProtocolEventMock,
  ponderOnMock,
} = vi.hoisted(() => ({
  emitBudgetAudienceNotificationMock: vi.fn(),
  emitGoalAudienceNotificationMock: vi.fn(),
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
  goalTreasury: "goalTreasury",
  treasurySuccessAssertionContext: "treasurySuccessAssertionContext",
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

vi.mock("../src/goals/notification-fanout", () => ({
  emitGoalAudienceNotification: emitGoalAudienceNotificationMock,
}));

vi.mock("../src/budgets/notification-fanout", () => ({
  emitBudgetAudienceNotification: emitBudgetAudienceNotificationMock,
}));

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
  return {
    db: {
      find: vi.fn(async (table: string, key?: Record<string, unknown>) => {
        const result = findResults[table];
        if (Array.isArray(result)) {
          return result.find((entry) => matchesFindKey(entry.key, key))?.value ?? null;
        }
        return result ?? null;
      }),
    },
  };
}

type Handler<TArgs extends Record<string, unknown>> = (args: {
  event: {
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

describe("UMA resolver notification handlers", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000aa";
  const budgetTreasury = "0x00000000000000000000000000000000000000ab";
  const assertionId =
    "0x1111111111111111111111111111111111111111111111111111111111111111";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("routes disputed resolver events through assertion-context goal lookups", async () => {
    await import("../src/umaResolver/success-assertion-disputed");

    const { db } = createDb({
      treasurySuccessAssertionContext: {
        scope: "goal",
        treasury: goalTreasury,
      },
    });

    await getRegisteredHandler<{
      assertionId: `0x${string}`;
      disputer: `0x${string}`;
    }>("UMATreasurySuccessResolver:AssertionDisputed")({
      event: {
        log: { address: "0x00000000000000000000000000000000000000f1", logIndex: 7 },
        args: {
          assertionId,
          disputer: "0x00000000000000000000000000000000000000b1",
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
          from: "0x00000000000000000000000000000000000000b2",
        },
        block: { number: 10n, timestamp: 20n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(emitGoalAudienceNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        goalTreasuryAddress: goalTreasury,
        reason: "goal_success_assertion_disputed",
        sourceType: "goal_success_assertion",
        sourceId: `${goalTreasury}:${assertionId}:disputed`,
        actorWalletAddress: "0x00000000000000000000000000000000000000b1",
      }),
    );
  });

  it("routes resolved resolver events through direct treasury addresses", async () => {
    await import("../src/umaResolver/success-assertion-resolved");

    const { db } = createDb({
      budgetTreasury: {
        id: budgetTreasury,
      },
    });

    await getRegisteredHandler<{
      treasury: `0x${string}`;
    }>("UMATreasurySuccessResolver:TreasurySuccessResolved")({
      event: {
        log: { address: "0x00000000000000000000000000000000000000f2", logIndex: 8 },
        args: {
          treasury: budgetTreasury,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
          from: "0x00000000000000000000000000000000000000b3",
        },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(emitBudgetAudienceNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetTreasuryAddress: budgetTreasury,
        reason: "budget_success_assertion_resolved",
        sourceType: "budget_success_assertion",
        sourceId: `${budgetTreasury}:0x0000000000000000000000000000000000000000000000000000000000000002:8:resolved`,
      }),
    );
  });

  it("routes settled resolver events through assertion-context budget lookups", async () => {
    await import("../src/umaResolver/success-assertion-finalized");

    const { db } = createDb({
      treasurySuccessAssertionContext: {
        scope: "budget",
        treasury: budgetTreasury,
      },
    });

    await getRegisteredHandler<{
      assertionId: `0x${string}`;
      settleCaller: `0x${string}`;
    }>("UMATreasurySuccessResolver:AssertionSettled")({
      event: {
        log: { address: "0x00000000000000000000000000000000000000f3", logIndex: 9 },
        args: {
          assertionId,
          settleCaller: "0x00000000000000000000000000000000000000b4",
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

    expect(emitBudgetAudienceNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        budgetTreasuryAddress: budgetTreasury,
        reason: "budget_success_assertion_settled",
        sourceType: "budget_success_assertion",
        sourceId: `${budgetTreasury}:${assertionId}:settled`,
        actorWalletAddress: "0x00000000000000000000000000000000000000b4",
      }),
    );
  });
});
