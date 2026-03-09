import { ponder } from "ponder:registry";
import { insertProtocolEvent } from "../helpers/protocolEvent";

const BUDGET_TERMINAL_FAILURE_EVENTS = [
  "BudgetTreasury:TerminalFlowStopFailed",
  "BudgetTreasury:TerminalParentGoalSyncNotApplied",
  "BudgetTreasury:TerminalParentPruneFailed",
  "BudgetTreasury:TerminalPremiumEscrowCloseFailed",
  "BudgetTreasury:TerminalResidualSettlementToParentFailed",
] as const;

for (const eventName of BUDGET_TERMINAL_FAILURE_EVENTS) {
  ponder.on(eventName, async ({ event, context }) => {
    await insertProtocolEvent({ context, event, contractName: "BudgetTreasury" });
  });
}
