import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertProtocolEventMock, ponderOnMock } = vi.hoisted(() => ({
  insertProtocolEventMock: vi.fn(),
  ponderOnMock: vi.fn(),
}));

vi.mock("ponder:registry", () => ({
  ponder: {
    on: ponderOnMock,
  },
}));

vi.mock("../src/helpers/protocolEvent", () => ({
  insertProtocolEvent: insertProtocolEventMock,
}));

const BUDGET_TERMINAL_FAILURE_EVENTS = [
  "BudgetTreasury:TerminalFlowStopFailed",
  "BudgetTreasury:TerminalParentGoalSyncNotApplied",
  "BudgetTreasury:TerminalParentPruneFailed",
  "BudgetTreasury:TerminalPremiumEscrowCloseFailed",
  "BudgetTreasury:TerminalResidualSettlementToParentFailed",
] as const;

describe("budget terminal side-effect handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    ponderOnMock.mockReset();
    insertProtocolEventMock.mockReset();
  });

  it("registers the concrete budget terminal failure events and forwards them unchanged", async () => {
    await import("../src/budgets/terminal-side-effect-failed");

    expect(ponderOnMock).toHaveBeenCalledTimes(
      BUDGET_TERMINAL_FAILURE_EVENTS.length
    );
    expect(ponderOnMock.mock.calls.map(([eventName]) => eventName)).toEqual(
      BUDGET_TERMINAL_FAILURE_EVENTS
    );
    expect(ponderOnMock.mock.calls.map(([eventName]) => eventName)).not.toContain(
      "BudgetTreasury:TerminalSideEffectFailed"
    );

    const event = {
      id: "budget-event",
      args: { revertData: "0xdeadbeef" },
    };
    const context = {
      chain: { id: 8453 },
      db: {},
    };

    for (const [, handler] of ponderOnMock.mock.calls) {
      await handler({ event, context });
    }

    expect(insertProtocolEventMock).toHaveBeenCalledTimes(
      BUDGET_TERMINAL_FAILURE_EVENTS.length
    );
    for (const call of insertProtocolEventMock.mock.calls) {
      expect(call[0]).toEqual({ context, event, contractName: "BudgetTreasury" });
    }
  });
});
