import { keeperOutbox, protocolEvent } from "ponder:schema";
import { toJson } from "./serialize";

const OUTBOX_LOG_INDEX_SCALE = 10_000_000_000n;

function keeperOutboxId(blockNumber: bigint, logIndex: number): bigint {
  if (!Number.isInteger(logIndex) || logIndex < 0) {
    throw new Error(`Invalid logIndex for keeper_outbox id: ${logIndex}`);
  }
  return blockNumber * OUTBOX_LOG_INDEX_SCALE + BigInt(logIndex);
}

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
  const serializedArgs = toJson(event.args);
  const outboxId = keeperOutboxId(event.block.number, event.log.logIndex);

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
      args: serializedArgs,
    })
    .onConflictDoNothing();

  await context.db
    .insert(keeperOutbox)
    .values({
      id: outboxId,
      chainId: context.chain.id,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
      logIndex: event.log.logIndex,
      contractName,
      contractAddress: event.log.address,
      eventName,
      eventArgs: serializedArgs,
    })
    .onConflictDoNothing();
}
