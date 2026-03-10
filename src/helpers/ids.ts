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

export function budgetUnderwriterCurrentId(budgetTreasury: Hex, account: Hex): string {
  return `${budgetTreasury.toLowerCase()}:${account.toLowerCase()}`;
}

export function goalUnderwriterCurrentId(goalTreasury: Hex, account: Hex): string {
  return `${goalTreasury.toLowerCase()}:${account.toLowerCase()}`;
}

export function premiumAccountId(escrow: Hex, account: Hex): string {
  return `${escrow.toLowerCase()}:${account.toLowerCase()}`;
}

export function premiumClaimableCycleSourceId(
  escrow: Hex,
  account: Hex,
  txHash: Hex,
  logIndex: number
): string {
  return `${escrow.toLowerCase()}:${account.toLowerCase()}:${txHash.toLowerCase()}:${logIndex}`;
}

export function tcrItemId(tcrAddress: Hex, itemId: Hex): string {
  return `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}`;
}

export function tcrRequestId(tcrAddress: Hex, itemId: Hex, requestIndex: bigint): string {
  return `${tcrAddress.toLowerCase()}:${itemId.toLowerCase()}:${requestIndex.toString()}`;
}

export function arbitratorDisputeId(arbitrator: Hex, disputeId: bigint): string {
  return `${arbitrator.toLowerCase()}:${disputeId.toString()}`;
}

export function jurorDisputeMemberId(arbitrator: Hex, disputeId: bigint, juror: Hex): string {
  return `${arbitrator.toLowerCase()}:${disputeId.toString()}:${juror.toLowerCase()}`;
}

export function jurorVoteReceiptId(
  arbitrator: Hex,
  disputeId: bigint,
  round: bigint,
  juror: Hex
): string {
  return `${arbitrator.toLowerCase()}:${disputeId.toString()}:${round.toString()}:${juror.toLowerCase()}`;
}
