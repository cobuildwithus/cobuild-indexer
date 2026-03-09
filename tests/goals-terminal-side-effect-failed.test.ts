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

const GOAL_TERMINAL_FAILURE_EVENTS = [
  "GoalTreasury:TerminalDeferredHookFundingSettlementFailed",
  "GoalTreasury:TerminalFlowStopFailed",
  "GoalTreasury:TerminalResidualSettlementFailed",
  "GoalTreasury:TerminalStakeVaultResolutionFailed",
] as const;

describe("goal terminal side-effect handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    ponderOnMock.mockReset();
    insertProtocolEventMock.mockReset();
  });

  it("registers the concrete goal terminal failure events and forwards them unchanged", async () => {
    await import("../src/goals/terminal-side-effect-failed");

    expect(ponderOnMock).toHaveBeenCalledTimes(
      GOAL_TERMINAL_FAILURE_EVENTS.length
    );
    expect(ponderOnMock.mock.calls.map(([eventName]) => eventName)).toEqual(
      GOAL_TERMINAL_FAILURE_EVENTS
    );
    expect(ponderOnMock.mock.calls.map(([_, handler]) => handler)).toHaveLength(
      GOAL_TERMINAL_FAILURE_EVENTS.length
    );
    expect(ponderOnMock.mock.calls.map(([eventName]) => eventName)).not.toContain(
      "GoalTreasury:TerminalSideEffectFailed"
    );

    const event = {
      id: "goal-event",
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
      GOAL_TERMINAL_FAILURE_EVENTS.length
    );
    for (const call of insertProtocolEventMock.mock.calls) {
      expect(call[0]).toEqual({ context, event, contractName: "GoalTreasury" });
    }
  });
});
