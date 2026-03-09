import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

const GOAL_TERMINAL_FAILURE_EVENTS = [
  "GoalTreasury:TerminalDeferredHookFundingSettlementFailed",
  "GoalTreasury:TerminalFlowStopFailed",
  "GoalTreasury:TerminalResidualSettlementFailed",
  "GoalTreasury:TerminalStakeVaultResolutionFailed",
] as const;

for (const eventName of GOAL_TERMINAL_FAILURE_EVENTS) {
  ponder.on(eventName, async ({ event, context }) => {
    await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });
  });
}
