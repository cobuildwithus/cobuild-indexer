import type { Hex } from "viem";

export function flowRecipientKey(flow: Hex, recipientId: Hex): string {
  return `${flow.toLowerCase()}:${recipientId.toLowerCase()}`;
}

export function flowRecipientByIndexKey(flow: Hex, recipientIndex: number): string {
  return `${flow.toLowerCase()}:${recipientIndex}`;
}

export function allocationKeyStateId(flow: Hex, strategy: Hex, allocationKey: bigint): string {
  return `${flow.toLowerCase()}:${strategy.toLowerCase()}:${allocationKey.toString()}`;
}

export function allocationEntryStateId(
  flow: Hex,
  strategy: Hex,
  allocationKey: bigint,
  recipientId: Hex
): string {
  return `${flow.toLowerCase()}:${strategy.toLowerCase()}:${allocationKey.toString()}:${recipientId.toLowerCase()}`;
}

export function stakePositionId(vault: Hex, account: Hex, tokenKind: "goal" | "cobuild"): string {
  return `${vault.toLowerCase()}:${account.toLowerCase()}:${tokenKind}`;
}

export function jurorId(vault: Hex, juror: Hex): string {
  return `${vault.toLowerCase()}:${juror.toLowerCase()}`;
}

export function premiumAccountId(escrow: Hex, account: Hex): string {
  return `${escrow.toLowerCase()}:${account.toLowerCase()}`;
}

export function tcrItemId(tcrAddress: Hex, itemId: Hex): string {
  return `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}`;
}

export function tcrRequestId(tcrAddress: Hex, itemId: Hex, requestIndex: bigint): string {
  return `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}`;
}
