import { ponder } from "ponder:registry";

import { insertProtocolEvent } from "../helpers/protocolEvent";
import { emitGoalAudienceNotification } from "./notification-fanout";

ponder.on("GoalTreasury:SuccessAssertionFinalizeFailed", async ({ event, context }) => {
  await insertProtocolEvent({ context, event, contractName: "GoalTreasury" });

  await emitGoalAudienceNotification({
    context,
    event,
    goalTreasuryAddress: event.log.address,
    reason: "goal_success_assertion_finalize_failed",
    sourceType: "goal_success_assertion",
    sourceId: `${event.log.address.toLowerCase()}:${event.args.assertionId.toLowerCase()}:goal_success_assertion_finalize_failed`,
  });
});
