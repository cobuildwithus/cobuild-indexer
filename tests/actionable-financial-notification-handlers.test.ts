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
  budgetUnderwriterAudience: "budgetUnderwriterAudience",
  budgetUnderwriterCurrent: "budgetUnderwriterCurrent",
  goalContextByBudgetTreasury: "goalContextByBudgetTreasury",
  goalStakeholderAudience: "goalStakeholderAudience",
  goalTreasury: "goalTreasury",
  goalUnderwriterAudience: "goalUnderwriterAudience",
  goalUnderwriterCurrent: "goalUnderwriterCurrent",
  juror: "juror",
  premiumAccount: "premiumAccount",
  premiumClaim: "premiumClaim",
  premiumEscrow: "premiumEscrow",
  protocolNotificationOutbox: "protocolNotificationOutbox",
  protocolNotificationSchedule: "protocolNotificationSchedule",
  stakePosition: "stakePosition",
  stakeVault: "stakeVault",
  stakeVaultJurorAudience: "stakeVaultJurorAudience",
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

type BaseEvent = {
  log: { address: `0x${string}`; logIndex: number };
  transaction: { hash: `0x${string}`; from: `0x${string}` };
  block: { number: bigint; timestamp: bigint };
};

type Handler<TArgs extends Record<string, unknown>> = (args: {
  event: BaseEvent & { args: TArgs; id: string };
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

describe("actionable financial notification handlers", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000aa";
  const stakeVaultAddress = "0x00000000000000000000000000000000000000ab";
  const budgetTreasury = "0x00000000000000000000000000000000000000ac";
  const escrow = "0x00000000000000000000000000000000000000ad";
  const account = "0x00000000000000000000000000000000000000ae";

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getGoalRowMock.mockResolvedValue({
      id: goalTreasury,
      owner: "0x00000000000000000000000000000000000000af",
      stakeVault: stakeVaultAddress,
      canonicalRouteSlug: "alpha",
    });
    getGoalStakeholderAccountsMock.mockResolvedValue([account]);
  });

  it("opens premium_claimable cycles on account checkpoints", async () => {
    await import("../src/premiumEscrow/account-checkpointed");

    const { db } = createDb({
      premiumAccount: {
        currentCoverage: 3n,
        claimableAmount: 0n,
      },
      premiumEscrow: {
        budgetTreasury,
      },
      goalContextByBudgetTreasury: {
        goalTreasury,
      },
    });

    await getRegisteredHandler<{
      account: `0x${string}`;
      currentCoverage: bigint;
      claimableAmount: bigint;
      exposureIntegral: bigint;
      totalCoverage: bigint;
    }>("PremiumEscrow:AccountCheckpointed")({
      event: {
        id: "event-1",
        log: { address: escrow, logIndex: 7 },
        args: {
          account,
          currentCoverage: 5n,
          claimableAmount: 11n,
          exposureIntegral: 19n,
          totalCoverage: 23n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
          from: "0x00000000000000000000000000000000000000b0",
        },
        block: { number: 10n, timestamp: 20n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimable",
            action: "upsert",
            notificationClass: "cycle",
            sourceType: "premium_claimable_cycle",
            sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:0x0000000000000000000000000000000000000000000000000000000000000001:7`,
            payload: expect.objectContaining({
              role: "budget_underwriter",
              amounts: expect.objectContaining({
                claimable: "11",
              }),
            }),
          }),
        ],
      }),
    );
  });

  it("opens a premium_claimable cycle after escrow linkage appears even when the amount is unchanged", async () => {
    await import("../src/premiumEscrow/account-checkpointed");

    const checkpointHandler = getRegisteredHandler<{
      account: `0x${string}`;
      currentCoverage: bigint;
      claimableAmount: bigint;
      exposureIntegral: bigint;
      totalCoverage: bigint;
    }>("PremiumEscrow:AccountCheckpointed");

    const firstPass = createDb({
      premiumAccount: {
        currentCoverage: 3n,
        claimableAmount: 0n,
      },
      premiumEscrow: {
        budgetTreasury: null,
      },
      goalContextByBudgetTreasury: null,
    });

    await checkpointHandler({
      event: {
        id: "event-link-missing",
        log: { address: escrow, logIndex: 12 },
        args: {
          account,
          currentCoverage: 5n,
          claimableAmount: 11n,
          exposureIntegral: 19n,
          totalCoverage: 23n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000010",
          from: "0x00000000000000000000000000000000000000b0",
        },
        block: { number: 14n, timestamp: 24n },
      },
      context: {
        chain: { id: 8453 },
        db: firstPass.db,
      },
    });

    expect(emitProtocolNotificationsMock).not.toHaveBeenCalled();
    const firstAccountInsert = firstPass.insertCalls.find((call) => call.table === "premiumAccount");
    expect(firstAccountInsert?.value.claimableNotificationSourceId).toBeNull();

    emitProtocolNotificationsMock.mockClear();

    const secondPass = createDb({
      premiumAccount: {
        currentCoverage: 5n,
        claimableAmount: 11n,
        claimableNotificationSourceId: null,
      },
      premiumEscrow: {
        budgetTreasury,
      },
      goalContextByBudgetTreasury: {
        goalTreasury,
      },
    });

    await checkpointHandler({
      event: {
        id: "event-link-restored",
        log: { address: escrow, logIndex: 13 },
        args: {
          account,
          currentCoverage: 5n,
          claimableAmount: 11n,
          exposureIntegral: 21n,
          totalCoverage: 23n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000011",
          from: "0x00000000000000000000000000000000000000b1",
        },
        block: { number: 15n, timestamp: 25n },
      },
      context: {
        chain: { id: 8453 },
        db: secondPass.db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimable",
            action: "upsert",
            notificationClass: "cycle",
            sourceType: "premium_claimable_cycle",
            sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:0x0000000000000000000000000000000000000000000000000000000000000011:13`,
          }),
        ],
      }),
    );
  });

  it("emits premium_claimed and invalidates premium_claimable when the remaining claimable amount hits zero", async () => {
    await import("../src/premiumEscrow/claimed");

    const { db } = createDb({
      premiumAccount: {
        claimableAmount: 9n,
        claimableNotificationSourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:cycle-open`,
      },
      premiumEscrow: {
        budgetTreasury,
      },
      goalContextByBudgetTreasury: {
        goalTreasury,
      },
      premiumClaim: null,
    });

    await getRegisteredHandler<{
      account: `0x${string}`;
      to: `0x${string}`;
      amount: bigint;
    }>("PremiumEscrow:Claimed")({
      event: {
        id: "claim-1",
        log: { address: escrow, logIndex: 8 },
        args: {
          account,
          to: "0x00000000000000000000000000000000000000b1",
          amount: 9n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000002",
          from: "0x00000000000000000000000000000000000000b2",
        },
        block: { number: 11n, timestamp: 21n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimed",
            notificationClass: "edge",
            sourceType: "premium_claim",
          }),
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimable",
            action: "invalidate",
            notificationClass: "cycle",
            sourceType: "premium_claimable_cycle",
            sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:cycle-open`,
          }),
        ]),
      }),
    );
  });

  it("reuses the existing premium_claimable cycle on partial claims", async () => {
    await import("../src/premiumEscrow/claimed");

    const { db } = createDb({
      premiumAccount: {
        claimableAmount: 9n,
        claimableNotificationSourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:cycle-open`,
      },
      premiumEscrow: {
        budgetTreasury,
      },
      goalContextByBudgetTreasury: {
        goalTreasury,
      },
      premiumClaim: null,
    });

    await getRegisteredHandler<{
      account: `0x${string}`;
      to: `0x${string}`;
      amount: bigint;
    }>("PremiumEscrow:Claimed")({
      event: {
        id: "claim-partial",
        log: { address: escrow, logIndex: 18 },
        args: {
          account,
          to: "0x00000000000000000000000000000000000000b6",
          amount: 4n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000012",
          from: "0x00000000000000000000000000000000000000b7",
        },
        block: { number: 16n, timestamp: 26n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimed",
            notificationClass: "edge",
            sourceType: "premium_claim",
          }),
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimable",
            action: "upsert",
            notificationClass: "cycle",
            sourceType: "premium_claimable_cycle",
            sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:cycle-open`,
            payload: expect.objectContaining({
              amounts: expect.objectContaining({
                claimable: "5",
              }),
            }),
          }),
        ]),
      }),
    );
  });

  it("opens a fresh premium_claimable cycle after a prior cycle is fully resolved", async () => {
    await import("../src/premiumEscrow/claimed");
    await import("../src/premiumEscrow/account-checkpointed");

    const claimHandler = getRegisteredHandler<{
      account: `0x${string}`;
      to: `0x${string}`;
      amount: bigint;
    }>("PremiumEscrow:Claimed");
    const checkpointHandler = getRegisteredHandler<{
      account: `0x${string}`;
      currentCoverage: bigint;
      claimableAmount: bigint;
      exposureIntegral: bigint;
      totalCoverage: bigint;
    }>("PremiumEscrow:AccountCheckpointed");

    const claimPass = createDb({
      premiumAccount: {
        claimableAmount: 9n,
        claimableNotificationSourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:cycle-open`,
      },
      premiumEscrow: {
        budgetTreasury,
      },
      goalContextByBudgetTreasury: {
        goalTreasury,
      },
      premiumClaim: null,
    });

    await claimHandler({
      event: {
        id: "claim-reset",
        log: { address: escrow, logIndex: 18 },
        args: {
          account,
          to: "0x00000000000000000000000000000000000000b8",
          amount: 9n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000013",
          from: "0x00000000000000000000000000000000000000b9",
        },
        block: { number: 17n, timestamp: 27n },
      },
      context: {
        chain: { id: 8453 },
        db: claimPass.db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            reason: "premium_claimable",
            action: "invalidate",
            sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:cycle-open`,
          }),
        ]),
      })
    );

    emitProtocolNotificationsMock.mockClear();

    const reopenPass = createDb({
      premiumAccount: {
        currentCoverage: 0n,
        claimableAmount: 0n,
        claimableNotificationSourceId: null,
      },
      premiumEscrow: {
        budgetTreasury,
      },
      goalContextByBudgetTreasury: {
        goalTreasury,
      },
    });

    await checkpointHandler({
      event: {
        id: "checkpoint-reopen",
        log: { address: escrow, logIndex: 19 },
        args: {
          account,
          currentCoverage: 4n,
          claimableAmount: 6n,
          exposureIntegral: 8n,
          totalCoverage: 9n,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000014",
          from: "0x00000000000000000000000000000000000000ba",
        },
        block: { number: 18n, timestamp: 28n },
      },
      context: {
        chain: { id: 8453 },
        db: reopenPass.db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "premium_claimable",
            action: "upsert",
            notificationClass: "cycle",
            sourceType: "premium_claimable_cycle",
            sourceId: `${escrow.toLowerCase()}:${account.toLowerCase()}:0x0000000000000000000000000000000000000000000000000000000000000014:19`,
          }),
        ],
      })
    );
  });

  it("opens withdrawal-prep-required notifications for resolved goal stakeholders", async () => {
    await import("../src/stakeVault/goal-resolved");

    const { db } = createDb({
      stakeVault: {
        treasury: goalTreasury,
      },
    });

    await getRegisteredHandler<Record<string, never>>("GoalStakeVault:GoalResolved")({
      event: {
        id: "goal-resolved-1",
        log: { address: stakeVaultAddress, logIndex: 9 },
        args: {},
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000003",
          from: "0x00000000000000000000000000000000000000b3",
        },
        block: { number: 12n, timestamp: 22n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(getGoalStakeholderAccountsMock).toHaveBeenCalledWith({
      context: expect.objectContaining({ db, chain: { id: 8453 } }),
      goalTreasuryAddress: goalTreasury,
    });
    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "underwriter_withdrawal_prep_required",
            action: "upsert",
            notificationClass: "open_close",
            sourceType: "underwriter_withdrawal_prep_state",
            sourceId: `${goalTreasury.toLowerCase()}:${account.toLowerCase()}`,
            payload: expect.objectContaining({
              role: "goal_stakeholder",
            }),
          }),
        ],
      }),
    );
  });

  it("invalidates withdrawal-prep-required notifications and emits completion when prep finishes", async () => {
    await import("../src/stakeVault/underwriter-withdrawal-prepared");

    const { db } = createDb({
      stakeVault: {
        treasury: goalTreasury,
      },
    });

    await getRegisteredHandler<{
      underwriter: `0x${string}`;
      nextBudgetIndex: bigint;
      budgetCount: bigint;
      complete: boolean;
    }>("GoalStakeVault:UnderwriterWithdrawalPrepared")({
      event: {
        id: "prep-1",
        log: { address: stakeVaultAddress, logIndex: 10 },
        args: {
          underwriter: account,
          nextBudgetIndex: 1n,
          budgetCount: 2n,
          complete: true,
        },
        transaction: {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000004",
          from: "0x00000000000000000000000000000000000000b4",
        },
        block: { number: 13n, timestamp: 23n },
      },
      context: {
        chain: { id: 8453 },
        db,
      },
    });

    expect(emitProtocolNotificationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "underwriter_withdrawal_prep_required",
            action: "invalidate",
            notificationClass: "open_close",
            sourceType: "underwriter_withdrawal_prep_state",
            sourceId: `${goalTreasury.toLowerCase()}:${account.toLowerCase()}`,
            payload: expect.objectContaining({
              role: "goal_stakeholder",
              resource: expect.objectContaining({
                kind: "goal",
                goalTreasury,
              }),
            }),
          }),
          expect.objectContaining({
            recipientWalletAddress: account,
            reason: "underwriter_withdrawal_prep_complete",
            notificationClass: "edge",
            sourceType: "underwriter_withdrawal_prep_complete",
            sourceId: `${goalTreasury.toLowerCase()}:${account.toLowerCase()}`,
            payload: expect.objectContaining({
              role: "goal_stakeholder",
              resource: expect.objectContaining({
                kind: "goal",
                goalTreasury,
              }),
            }),
          }),
        ],
      }),
    );
  });
});
