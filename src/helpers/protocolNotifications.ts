import type { Context, Event } from "ponder:registry";
import type { Hex } from "viem";

import {
  budgetUnderwriterAudience,
  budgetUnderwriterCurrent,
  goalStakeholderAudience,
  goalTreasury,
  goalUnderwriterAudience,
  goalUnderwriterCurrent,
  juror,
  protocolNotificationOutbox,
  protocolNotificationSchedule,
  stakePosition,
  stakeVault,
  stakeVaultJurorAudience,
} from "ponder:schema";

import {
  budgetUnderwriterCurrentId,
  goalUnderwriterCurrentId,
  jurorId,
  stakePositionId,
} from "./ids";
import { toJson } from "./serialize";

export type RecipientRole =
  | "requester"
  | "challenger"
  | "proposer"
  | "goal_owner"
  | "goal_stakeholder"
  | "goal_underwriter"
  | "budget_underwriter"
  | "juror";

type NotificationHelperEventName =
  | "GoalStakeVault:GoalStaked"
  | "GoalStakeVault:GoalWithdrawn"
  | "GoalStakeVault:CobuildStaked"
  | "GoalStakeVault:CobuildWithdrawn"
  | "GoalTreasury:StateTransition"
  | "BudgetTCRProtocolEvents:RequestSubmitted"
  | "BudgetTCRProtocolEvents:Dispute"
  | "BudgetTCR:BudgetStackActivationQueued"
  | "BudgetTCR:BudgetStackRemovalQueued"
  | "BudgetStakeLedger:BudgetRegistered"
  | "BudgetStakeLedger:BudgetRemoved";

type NotificationContext = Pick<Context<NotificationHelperEventName>, "db" | "chain">;
type NotificationEvent = {
  transaction: Pick<Event<NotificationHelperEventName>["transaction"], "hash">;
  block: Pick<Event<NotificationHelperEventName>["block"], "number" | "timestamp">;
  log: Pick<Event<NotificationHelperEventName>["log"], "address" | "logIndex">;
};

type GoalRow = {
  id: Hex;
  owner: Hex | null;
  stakeVault: Hex | null;
  canonicalRouteSlug: string | null;
};

const ROLE_PRIORITY: Record<RecipientRole, number> = {
  requester: 7,
  challenger: 7,
  proposer: 6,
  juror: 5,
  goal_owner: 4,
  budget_underwriter: 3,
  goal_underwriter: 2,
  goal_stakeholder: 1,
};

function normalizeHex(value: Hex): Hex {
  return value.toLowerCase() as Hex;
}

function normalizeHexOrNull(value: Hex | null | undefined): Hex | null {
  return value ? normalizeHex(value) : null;
}

function uniqueSortedHex(values: readonly Hex[]): Hex[] {
  return Array.from(new Set(values.map((value) => normalizeHex(value)))).sort() as Hex[];
}

function toStringOrNull(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function resourceKindForReason(reason: string): string {
  if (
    reason === "goal_active" ||
    reason === "goal_succeeded" ||
    reason === "goal_expired" ||
    reason === "underwriter_withdrawal_prep_required"
  ) {
    return "goal";
  }

  if (
    reason === "budget_activated" ||
    reason === "budget_removed" ||
    reason === "budget_active" ||
    reason === "budget_succeeded" ||
    reason === "budget_failed" ||
    reason === "budget_expired" ||
    reason === "underwriter_slashed" ||
    reason === "premium_claimable" ||
    reason === "premium_claimed"
  ) {
    return "budget";
  }

  if (
    reason === "mechanism_proposed" ||
    reason === "mechanism_challenged" ||
    reason === "mechanism_accepted" ||
    reason === "mechanism_activated" ||
    reason === "mechanism_removal_requested" ||
    reason === "mechanism_removal_accepted" ||
    reason === "mechanism_removed"
  ) {
    return "mechanism_request";
  }

  if (
    reason === "juror_dispute_created" ||
    reason === "juror_voting_open" ||
    reason === "juror_reveal_open" ||
    reason === "juror_ruling_final" ||
    reason === "juror_slashable" ||
    reason === "juror_slashed"
  ) {
    return "juror_dispute";
  }

  return "budget_request";
}

export type NotificationAction = "upsert" | "invalidate";
export type NotificationClass = "edge" | "open_close" | "cycle";

export function protocolNotificationOutboxId(args: {
  txHash: Hex;
  logIndex: number;
  sourceType: string;
  sourceId: string;
  recipientWalletAddress: Hex;
  action: NotificationAction;
}): string {
  return [
    args.sourceType,
    args.sourceId,
    normalizeHex(args.recipientWalletAddress),
    args.action,
    normalizeHex(args.txHash),
    args.logIndex.toString(),
  ].join(":");
}

export function protocolNotificationScheduleId(args: {
  sourceType: string;
  sourceId: string;
  recipientWalletAddress: Hex;
}): string {
  return `${args.sourceType}:${args.sourceId}:${normalizeHex(args.recipientWalletAddress)}`;
}

export function toRequestType(value: unknown): "registration" | "clearing" | "unknown" {
  if (typeof value === "bigint") {
    if (value === 2n) return "registration";
    if (value === 3n) return "clearing";
    return "unknown";
  }
  if (typeof value === "number") {
    if (value === 2) return "registration";
    if (value === 3) return "clearing";
    return "unknown";
  }
  return "unknown";
}

export function getHexArg(args: Record<string, unknown>, ...names: string[]): Hex | null {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "string" && value.startsWith("0x")) {
      return normalizeHex(value as Hex);
    }
  }
  return null;
}

export function getBigIntArg(args: Record<string, unknown>, ...names: string[]): bigint | null {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isInteger(value)) return BigInt(value);
    if (typeof value === "string" && value.trim() !== "") {
      try {
        return BigInt(value);
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function syncGoalStakeholderAudience(args: {
  context: NotificationContext;
  stakeVaultAddress: Hex;
  account: Hex;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const { context, stakeVaultAddress, account, blockNumber, blockTimestamp } = args;
  const normalizedVault = normalizeHex(stakeVaultAddress);
  const normalizedAccount = normalizeHex(account);
  const vaultRow = await context.db.find(stakeVault, { id: normalizedVault });
  const goalTreasuryId = normalizeHexOrNull((vaultRow?.treasury ?? null) as Hex | null);
  if (!goalTreasuryId) return;

  const [goalPosition, cobuildPosition] = await Promise.all([
    context.db.find(stakePosition, {
      id: stakePositionId(normalizedVault, normalizedAccount, "goal"),
    }),
    context.db.find(stakePosition, {
      id: stakePositionId(normalizedVault, normalizedAccount, "cobuild"),
    }),
  ]);

  const goalNet = BigInt(goalPosition?.staked ?? 0n) - BigInt(goalPosition?.withdrawn ?? 0n);
  const cobuildNet =
    BigInt(cobuildPosition?.staked ?? 0n) - BigInt(cobuildPosition?.withdrawn ?? 0n);
  const isActive = goalNet > 0n || cobuildNet > 0n;

  const existing = await context.db.find(goalStakeholderAudience, { id: goalTreasuryId });
  const accounts = Array.isArray(existing?.accounts)
    ? uniqueSortedHex(existing.accounts as Hex[])
    : [];
  const nextAccounts = isActive
    ? uniqueSortedHex([...accounts, normalizedAccount])
    : accounts.filter((value) => value !== normalizedAccount);

  if (!existing) {
    await context.db
      .insert(goalStakeholderAudience)
      .values({
        id: goalTreasuryId,
        stakeVault: normalizedVault,
        accounts: nextAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
    return;
  }

  await context.db.update(goalStakeholderAudience, { id: goalTreasuryId }).set({
    stakeVault: normalizedVault,
    accounts: nextAccounts,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function syncBudgetUnderwriterAudience(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex;
  stakeVaultAddress: Hex | null | undefined;
  budgetTreasuryAddress: Hex;
  recipientId: Hex | null | undefined;
  account: Hex;
  allocatedStake: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const {
    context,
    goalTreasuryAddress,
    stakeVaultAddress,
    budgetTreasuryAddress,
    recipientId,
    account,
    allocatedStake,
    blockNumber,
    blockTimestamp,
  } = args;
  const normalizedGoalTreasury = normalizeHex(goalTreasuryAddress);
  const normalizedStakeVault = normalizeHexOrNull(stakeVaultAddress);
  const normalizedBudgetTreasury = normalizeHex(budgetTreasuryAddress);
  const normalizedAccount = normalizeHex(account);
  const normalizedRecipientId = normalizeHexOrNull(recipientId);
  const currentId = budgetUnderwriterCurrentId(normalizedBudgetTreasury, normalizedAccount);

  const existingCurrent = await context.db.find(budgetUnderwriterCurrent, { id: currentId });
  const previousAllocatedStake = BigInt(existingCurrent?.allocatedStake ?? 0n);
  const nextAllocatedStake = allocatedStake > 0n ? allocatedStake : 0n;

  await context.db
    .insert(budgetUnderwriterCurrent)
    .values({
      id: currentId,
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      budgetTreasury: normalizedBudgetTreasury,
      recipientId: normalizedRecipientId,
      account: normalizedAccount,
      allocatedStake: nextAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoUpdate({
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      budgetTreasury: normalizedBudgetTreasury,
      recipientId: normalizedRecipientId,
      account: normalizedAccount,
      allocatedStake: nextAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });

  const existingBudgetAudience = await context.db.find(budgetUnderwriterAudience, {
    id: normalizedBudgetTreasury,
  });
  const budgetAccounts = Array.isArray(existingBudgetAudience?.accounts)
    ? uniqueSortedHex(existingBudgetAudience.accounts as Hex[])
    : [];
  const nextBudgetAccounts =
    nextAllocatedStake > 0n
      ? uniqueSortedHex([...budgetAccounts, normalizedAccount])
      : budgetAccounts.filter((value) => value !== normalizedAccount);

  if (!existingBudgetAudience) {
    await context.db
      .insert(budgetUnderwriterAudience)
      .values({
        id: normalizedBudgetTreasury,
        goalTreasury: normalizedGoalTreasury,
        stakeVault: normalizedStakeVault,
        accounts: nextBudgetAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
  } else {
    await context.db.update(budgetUnderwriterAudience, { id: normalizedBudgetTreasury }).set({
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      accounts: nextBudgetAccounts,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });
  }

  const goalCurrentId = goalUnderwriterCurrentId(normalizedGoalTreasury, normalizedAccount);
  const existingGoalCurrent = await context.db.find(goalUnderwriterCurrent, { id: goalCurrentId });
  const currentGoalAllocatedStake = BigInt(existingGoalCurrent?.allocatedStake ?? 0n);
  const nextGoalAllocatedStake = currentGoalAllocatedStake - previousAllocatedStake + nextAllocatedStake;
  const normalizedGoalAllocatedStake = nextGoalAllocatedStake > 0n ? nextGoalAllocatedStake : 0n;

  await context.db
    .insert(goalUnderwriterCurrent)
    .values({
      id: goalCurrentId,
      goalTreasury: normalizedGoalTreasury,
      stakeVault: normalizedStakeVault,
      account: normalizedAccount,
      allocatedStake: normalizedGoalAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    })
    .onConflictDoUpdate({
      stakeVault: normalizedStakeVault,
      account: normalizedAccount,
      allocatedStake: normalizedGoalAllocatedStake,
      updatedAtBlock: blockNumber,
      updatedAtTimestamp: blockTimestamp,
    });

  const existingGoalAudience = await context.db.find(goalUnderwriterAudience, {
    id: normalizedGoalTreasury,
  });
  const goalAccounts = Array.isArray(existingGoalAudience?.accounts)
    ? uniqueSortedHex(existingGoalAudience.accounts as Hex[])
    : [];
  const nextGoalAccounts =
    normalizedGoalAllocatedStake > 0n
      ? uniqueSortedHex([...goalAccounts, normalizedAccount])
      : goalAccounts.filter((value) => value !== normalizedAccount);

  if (!existingGoalAudience) {
    await context.db
      .insert(goalUnderwriterAudience)
      .values({
        id: normalizedGoalTreasury,
        stakeVault: normalizedStakeVault,
        accounts: nextGoalAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
    return;
  }

  await context.db.update(goalUnderwriterAudience, { id: normalizedGoalTreasury }).set({
    stakeVault: normalizedStakeVault,
    accounts: nextGoalAccounts,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function syncStakeVaultJurorAudience(args: {
  context: NotificationContext;
  stakeVaultAddress: Hex;
  jurorAddress: Hex;
  blockNumber: bigint;
  blockTimestamp: bigint;
}): Promise<void> {
  const { context, stakeVaultAddress, jurorAddress, blockNumber, blockTimestamp } = args;
  const normalizedVault = normalizeHex(stakeVaultAddress);
  const normalizedJuror = normalizeHex(jurorAddress);
  const vaultRow = await context.db.find(stakeVault, { id: normalizedVault });
  const goalTreasuryId = normalizeHexOrNull((vaultRow?.treasury ?? null) as Hex | null);
  const jurorRow = await context.db.find(juror, {
    id: jurorId(normalizedVault, normalizedJuror),
  });

  const currentJurorWeight = BigInt(jurorRow?.currentJurorWeight ?? 0n);
  const isActive = Boolean(jurorRow?.optedIn) && currentJurorWeight > 0n;

  const existing = await context.db.find(stakeVaultJurorAudience, { id: normalizedVault });
  const accounts = Array.isArray(existing?.accounts)
    ? uniqueSortedHex(existing.accounts as Hex[])
    : [];
  const nextAccounts = isActive
    ? uniqueSortedHex([...accounts, normalizedJuror])
    : accounts.filter((value) => value !== normalizedJuror);

  if (!existing) {
    await context.db
      .insert(stakeVaultJurorAudience)
      .values({
        id: normalizedVault,
        goalTreasury: goalTreasuryId,
        accounts: nextAccounts,
        updatedAtBlock: blockNumber,
        updatedAtTimestamp: blockTimestamp,
      })
      .onConflictDoNothing();
    return;
  }

  await context.db.update(stakeVaultJurorAudience, { id: normalizedVault }).set({
    goalTreasury: goalTreasuryId,
    accounts: nextAccounts,
    updatedAtBlock: blockNumber,
    updatedAtTimestamp: blockTimestamp,
  });
}

export async function getGoalRow(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex | null | undefined;
}): Promise<GoalRow | null> {
  const goalTreasuryAddress = normalizeHexOrNull(args.goalTreasuryAddress);
  if (!goalTreasuryAddress) return null;
  const row = await args.context.db.find(goalTreasury, { id: goalTreasuryAddress });
  if (!row) return null;
  return {
    id: normalizeHex(row.id),
    owner: normalizeHexOrNull(row.owner),
    stakeVault: normalizeHexOrNull(row.stakeVault),
    canonicalRouteSlug: row.canonicalRouteSlug ?? null,
  };
}

export async function getGoalStakeholderAccounts(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const goalTreasuryAddress = normalizeHexOrNull(args.goalTreasuryAddress);
  if (!goalTreasuryAddress) return [];
  const audience = await args.context.db.find(goalStakeholderAudience, {
    id: goalTreasuryAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getBudgetUnderwriterAccounts(args: {
  context: NotificationContext;
  budgetTreasuryAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const budgetTreasuryAddress = normalizeHexOrNull(args.budgetTreasuryAddress);
  if (!budgetTreasuryAddress) return [];
  const audience = await args.context.db.find(budgetUnderwriterAudience, {
    id: budgetTreasuryAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getGoalUnderwriterAccounts(args: {
  context: NotificationContext;
  goalTreasuryAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const goalTreasuryAddress = normalizeHexOrNull(args.goalTreasuryAddress);
  if (!goalTreasuryAddress) return [];
  const audience = await args.context.db.find(goalUnderwriterAudience, {
    id: goalTreasuryAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export async function getStakeVaultJurorAccounts(args: {
  context: NotificationContext;
  stakeVaultAddress: Hex | null | undefined;
}): Promise<Hex[]> {
  const stakeVaultAddress = normalizeHexOrNull(args.stakeVaultAddress);
  if (!stakeVaultAddress) return [];
  const audience = await args.context.db.find(stakeVaultJurorAudience, {
    id: stakeVaultAddress,
  });
  return Array.isArray(audience?.accounts)
    ? uniqueSortedHex(audience.accounts as Hex[])
    : [];
}

export function buildGoalNotificationPayload(args: {
  role: RecipientRole;
  goalRow: GoalRow | null;
  reason: string;
  itemId?: Hex | null;
  requestIndex?: bigint | null;
  budgetTreasury?: Hex | null;
  actorWalletAddress?: Hex | null;
  arbitrator?: Hex | null;
  disputeId?: bigint | null;
  schedule?: {
    deliverAt?: bigint | null;
    votingStartTime?: bigint | null;
    votingEndTime?: bigint | null;
    revealPeriodEndTime?: bigint | null;
  } | null;
  amounts?: {
    allocatedStake?: bigint | null;
    claimable?: bigint | null;
    claimedAmount?: bigint | null;
    snapshotWeight?: bigint | null;
    snapshotVotes?: bigint | null;
    slashWeight?: bigint | null;
  } | null;
}): Record<string, unknown> {
  const goalTreasuryAddress = normalizeHexOrNull((args.goalRow?.id ?? null) as Hex | null);

  return {
    role: args.role,
    resource: {
      kind: resourceKindForReason(args.reason),
      goalTreasury: goalTreasuryAddress,
      budgetTreasury: normalizeHexOrNull(args.budgetTreasury),
      itemId: normalizeHexOrNull(args.itemId),
      requestIndex: toStringOrNull(args.requestIndex),
      arbitrator: normalizeHexOrNull(args.arbitrator),
      disputeId: toStringOrNull(args.disputeId),
    },
    actor: args.actorWalletAddress
      ? {
          walletAddress: normalizeHex(args.actorWalletAddress),
        }
      : null,
    labels: {
      goalName:
        (typeof args.goalRow?.canonicalRouteSlug === "string" &&
        args.goalRow.canonicalRouteSlug.trim() !== ""
          ? args.goalRow.canonicalRouteSlug
          : null) ?? null,
    },
    schedule: args.schedule
      ? {
          deliverAt: toStringOrNull(args.schedule.deliverAt ?? null),
          votingStartAt: toStringOrNull(args.schedule.votingStartTime ?? null),
          votingEndAt: toStringOrNull(args.schedule.votingEndTime ?? null),
          revealEndAt: toStringOrNull(args.schedule.revealPeriodEndTime ?? null),
        }
      : null,
    amounts: args.amounts
      ? {
          allocatedStake: toStringOrNull(args.amounts.allocatedStake ?? null),
          claimable: toStringOrNull(args.amounts.claimable ?? null),
          claimedAmount: toStringOrNull(args.amounts.claimedAmount ?? null),
          snapshotWeight: toStringOrNull(args.amounts.snapshotWeight ?? null),
          snapshotVotes: toStringOrNull(args.amounts.snapshotVotes ?? null),
          slashWeight: toStringOrNull(args.amounts.slashWeight ?? null),
        }
      : null,
  };
}

export function collectRecipientRoles(args: {
  goalOwner?: Hex | null;
  stakeholderAccounts?: readonly Hex[];
  goalUnderwriterAccounts?: readonly Hex[];
  budgetUnderwriterAccounts?: readonly Hex[];
  jurorAccounts?: readonly Hex[];
  requestActors?: Array<{
    address: Hex | null | undefined;
    role: "requester" | "challenger" | "proposer";
  }>;
}): Array<{ recipientWalletAddress: Hex; role: RecipientRole }> {
  const recipients = new Map<Hex, RecipientRole>();

  const assign = (address: Hex | null | undefined, role: RecipientRole) => {
    const normalized = normalizeHexOrNull(address);
    if (!normalized) return;
    const existing = recipients.get(normalized);
    if (!existing || ROLE_PRIORITY[role] > ROLE_PRIORITY[existing]) {
      recipients.set(normalized, role);
    }
  };

  for (const stakeholder of args.stakeholderAccounts ?? []) {
    assign(stakeholder, "goal_stakeholder");
  }

  for (const underwriter of args.goalUnderwriterAccounts ?? []) {
    assign(underwriter, "goal_underwriter");
  }

  for (const underwriter of args.budgetUnderwriterAccounts ?? []) {
    assign(underwriter, "budget_underwriter");
  }

  for (const jurorAddress of args.jurorAccounts ?? []) {
    assign(jurorAddress, "juror");
  }

  assign(args.goalOwner ?? null, "goal_owner");

  for (const actor of args.requestActors ?? []) {
    assign(actor.address, actor.role);
  }

  return Array.from(recipients.entries()).map(([recipientWalletAddress, role]) => ({
    recipientWalletAddress,
    role,
  }));
}

type PendingNotification = {
  recipientWalletAddress: Hex;
  reason: string;
  sourceType: string;
  sourceId: string;
  notificationClass?: NotificationClass;
  action?: NotificationAction;
  actorWalletAddress?: Hex | null;
  payload: Record<string, unknown>;
};

type PendingScheduledNotification = PendingNotification & {
  deliverAt: bigint;
};

export async function emitProtocolNotifications(args: {
  context: NotificationContext;
  event: NotificationEvent;
  notifications: PendingNotification[];
}): Promise<void> {
  const { context, event, notifications } = args;
  if (notifications.length === 0) return;

  await Promise.all(
    notifications.map((notification) =>
      context.db
        .insert(protocolNotificationOutbox)
        .values({
          id: protocolNotificationOutboxId({
            txHash: event.transaction.hash as Hex,
            logIndex: event.log.logIndex,
            sourceType: notification.sourceType,
            sourceId: notification.sourceId,
            recipientWalletAddress: notification.recipientWalletAddress,
            action: notification.action ?? "upsert",
          }),
          chainId: context.chain.id,
          blockNumber: event.block.number,
          timestamp: event.block.timestamp,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
          recipientWalletAddress: normalizeHex(notification.recipientWalletAddress),
          notificationClass: notification.notificationClass ?? "edge",
          action: notification.action ?? "upsert",
          reason: notification.reason,
          sourceType: notification.sourceType,
          sourceId: notification.sourceId,
          actorWalletAddress: normalizeHexOrNull(notification.actorWalletAddress),
          payload: toJson(notification.payload),
        })
        .onConflictDoNothing()
    )
  );
}

export async function emitProtocolNotificationSchedules(args: {
  context: NotificationContext;
  event: NotificationEvent;
  notifications: PendingScheduledNotification[];
}): Promise<void> {
  const { context, event, notifications } = args;
  if (notifications.length === 0) return;

  await Promise.all(
    notifications.map((notification) =>
      context.db
        .insert(protocolNotificationSchedule)
        .values({
          id: protocolNotificationScheduleId({
            sourceType: notification.sourceType,
            sourceId: notification.sourceId,
            recipientWalletAddress: notification.recipientWalletAddress,
          }),
          chainId: context.chain.id,
          blockNumber: event.block.number,
          timestamp: event.block.timestamp,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
          deliverAt: notification.deliverAt,
          recipientWalletAddress: normalizeHex(notification.recipientWalletAddress),
          reason: notification.reason,
          sourceType: notification.sourceType,
          sourceId: notification.sourceId,
          actorWalletAddress: normalizeHexOrNull(notification.actorWalletAddress),
          payload: toJson(notification.payload),
        })
        .onConflictDoNothing()
    )
  );
}
