import { ponder } from "ponder:registry";
import { flow } from "ponder:schema";

import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleFlowInitialized(args: {
  event: any;
  context: any;
  kind: "goal" | "child";
  contractName: string;
}) {
  const { event, context, kind, contractName } = args;

  await insertProtocolEvent({ context, event, contractName });

  const flowAddress = event.log.address;

  await context.db
    .insert(flow)
    .values({
      id: flowAddress,
      kind,
      initialOwner: event.args.recipientAdmin,
      initialFlowImpl: event.args.flowImplementation,
      initialRecipientManager: event.args.recipientAdmin,
      parentFlow: event.args.parent,
      superToken: event.args.superToken,
      distributionPool: event.args.distributionPool,
      managerRewardPool: event.args.managerRewardPool,
      allocationPipeline: event.args.allocationPipeline,
      managerRewardPoolFlowRatePercent: Number(event.args.managerRewardPoolFlowRatePpm),
      flowOperator: event.args.flowOperator,
      sweeper: event.args.sweeper,
      strategy: event.args.strategy,
      currentFlowRate: 0n,
      targetOutflowRate: 0n,
      createdAtBlock: event.block.number,
      createdAtTimestamp: event.block.timestamp,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate({
      kind,
      initialOwner: event.args.recipientAdmin,
      initialFlowImpl: event.args.flowImplementation,
      initialRecipientManager: event.args.recipientAdmin,
      parentFlow: event.args.parent,
      superToken: event.args.superToken,
      distributionPool: event.args.distributionPool,
      managerRewardPool: event.args.managerRewardPool,
      allocationPipeline: event.args.allocationPipeline,
      managerRewardPoolFlowRatePercent: Number(event.args.managerRewardPoolFlowRatePpm),
      flowOperator: event.args.flowOperator,
      sweeper: event.args.sweeper,
      strategy: event.args.strategy,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    });
}

ponder.on("GoalFlow:FlowInitialized", async ({ event, context }) => {
  await handleFlowInitialized({ event, context, kind: "goal", contractName: "GoalFlow" });
});

ponder.on("ChildFlow:FlowInitialized", async ({ event, context }) => {
  await handleFlowInitialized({ event, context, kind: "child", contractName: "ChildFlow" });
});
