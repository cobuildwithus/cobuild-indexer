import { protocolEvent } from "ponder:schema";
import { toJson } from "./serialize";

/**
 * Insert an immutable row into `protocol_event` for debugging/auditing.
 * Uses `onConflictDoNothing()` to keep indexing idempotent across replays.
 */
export async function insertProtocolEvent(args: {
  context: { db: any; chain: { id: number } };
  event: {
    id?: string;
    name?: string;
    args: unknown;
    log: { address: `0x${string}`; logIndex: number };
    block: { number: bigint; timestamp: bigint };
    transaction: { hash: `0x${string}` };
  };
  contractName: string;
}): Promise<void> {
  const { context, event, contractName } = args;
  const eventId = event.id ?? `${event.transaction.hash}-${event.log.logIndex}`;
  const eventName = event.name ?? "unknown";

  await context.db
    .insert(protocolEvent)
    .values({
      id: eventId,
      chainId: context.chain.id,
      contractName,
      contractAddress: event.log.address,
      eventName,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      logIndex: event.log.logIndex,
      args: toJson(event.args),
    })
    .onConflictDoNothing();
}
