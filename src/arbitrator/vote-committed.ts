import { ponder } from "ponder:registry";
import type { Hex } from "viem";

import { jurorVoteReceipt } from "ponder:schema";
import { jurorVoteReceiptId } from "../helpers/ids";
import { insertProtocolEvent } from "../helpers/protocolEvent";

async function handleVoteCommitted(args: {
  contractName: "ERC20VotesArbitrator" | "MechanismERC20VotesArbitrator";
  event: Parameters<typeof insertProtocolEvent>[0]["event"] & {
    args: {
      disputeId: bigint;
      voter: Hex;
      commitHash: Hex;
    };
    log: { address: Hex; logIndex: number };
  };
  context: Parameters<typeof insertProtocolEvent>[0]["context"];
}): Promise<void> {
  const { contractName, event, context } = args;
  await insertProtocolEvent({ context, event, contractName });

  const arbitratorAddress = event.log.address as Hex;
  const round = 0n;
  const receiptId = jurorVoteReceiptId(arbitratorAddress, event.args.disputeId, round, event.args.voter);

  await context.db
    .insert(jurorVoteReceipt)
    .values({
      id: receiptId,
      arbitrator: arbitratorAddress,
      disputeId: event.args.disputeId,
      round,
      jurorAddress: event.args.voter,
      hasCommitted: false,
      hasRevealed: false,
      updatedAtBlock: event.block.number,
      updatedAtTimestamp: event.block.timestamp,
    })
    .onConflictDoNothing();

  await context.db.update(jurorVoteReceipt, { id: receiptId }).set({
    hasCommitted: true,
    commitHash: event.args.commitHash,
    committedAt: event.block.timestamp,
    updatedAtBlock: event.block.number,
    updatedAtTimestamp: event.block.timestamp,
  });
}

ponder.on("ERC20VotesArbitrator:VoteCommitted", async ({ event, context }) => {
  await handleVoteCommitted({
    contractName: "ERC20VotesArbitrator",
    event,
    context,
  });
});

ponder.on("MechanismERC20VotesArbitrator:VoteCommitted", async ({ event, context }) => {
  await handleVoteCommitted({
    contractName: "MechanismERC20VotesArbitrator",
    event,
    context,
  });
});
