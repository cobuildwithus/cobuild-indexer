import type { Context, Event } from "ponder:registry";
import type { Hex } from "viem";

import {
  goalStakeholderAudience,
  goalTreasury,
  protocolNotificationOutbox,
  stakePosition,
  stakeVault,
} from "ponder:schema";

import { stakePositionId } from "./ids";
import { toJson } from "./serialize";

type RecipientRole =
  | "requester"
  | "challenger"
  | "submitter"
  | "goal_owner"
  | "goal_stakeholder";

type NotificationHelperEventName =
  | "GoalStakeVault:GoalStaked"
  | "GoalStakeVault:GoalWithdrawn"
  | "GoalStakeVault:CobuildStaked"
  | "GoalStakeVault:CobuildWithdrawn"
  | "GoalTreasury:StateTransition"
  | "BudgetTCR:RequestSubmitted"
  | "BudgetTCR:Dispute"
  | "BudgetTCR:BudgetStackActivationQueued"
  | "BudgetTCR:BudgetStackRemovalQueued"
  | "BudgetStakeLedger:BudgetRegistered"
  | "BudgetStakeLedger:BudgetRemoved";

type NotificationContext = Pick<Context<NotificationHelperEventName>, "db" | "chain">;
type NotificationEvent = Pick<Event<NotificationHelperEventName>, "transaction" | "block" | "log">;
type GoalRow = {
  id: Hex;
  owner: Hex | null;
  canonicalRouteSlug: string | null;
};

const ROLE_PRIORITY: Record<RecipientRole, number> = {
  requester: 5,
  challenger: 5,
  submitter: 4,
  goal_owner: 3,
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

export function protocolNotificationOutboxId(args: {
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

  const goalNet =
    BigInt(goalPosition?.staked ?? 0n) - BigInt(goalPosition?.withdrawn ?? 0n);
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

export function buildGoalNotificationPayload(args: {
  role: RecipientRole;
  goalRow: GoalRow | null;
  reason: string;
  itemId?: Hex | null;
  requestIndex?: bigint | null;
  budgetTreasury?: Hex | null;
  actorWalletAddress?: Hex | null;
}): Record<string, unknown> {
  const goalTreasuryAddress = normalizeHexOrNull((args.goalRow?.id ?? null) as Hex | null);
  const resourceKind =
    args.reason === "goal_active" ||
    args.reason === "goal_succeeded" ||
    args.reason === "goal_expired"
      ? "goal"
      : args.reason === "budget_activated" || args.reason === "budget_removed"
        ? "budget"
      : "budget_request";

  return {
    role: args.role,
    resource: {
      kind: resourceKind,
      goalTreasury: goalTreasuryAddress,
      budgetTreasury: normalizeHexOrNull(args.budgetTreasury),
      itemId: normalizeHexOrNull(args.itemId),
      requestIndex:
        args.requestIndex === null || args.requestIndex === undefined
          ? null
          : args.requestIndex.toString(),
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
  };
}

export function collectRecipientRoles(args: {
  goalOwner?: Hex | null;
  stakeholderAccounts?: readonly Hex[];
  requestActors?: Array<{ address: Hex | null | undefined; role: "requester" | "challenger" | "submitter" }>;
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

  assign(args.goalOwner ?? null, "goal_owner");

  for (const actor of args.requestActors ?? []) {
    assign(actor.address, actor.role);
  }

  return Array.from(recipients.entries()).map(([recipientWalletAddress, role]) => ({
    recipientWalletAddress,
    role,
  }));
}

export async function emitProtocolNotifications(args: {
  context: NotificationContext;
  event: NotificationEvent;
  notifications: Array<{
    recipientWalletAddress: Hex;
    reason: string;
    sourceType: string;
    sourceId: string;
    actorWalletAddress?: Hex | null;
    payload: Record<string, unknown>;
  }>;
}): Promise<void> {
  const { context, event, notifications } = args;
  if (notifications.length === 0) return;

  await Promise.all(
    notifications.map((notification) =>
      context.db
        .insert(protocolNotificationOutbox)
        .values({
          id: protocolNotificationOutboxId({
            sourceType: notification.sourceType,
            sourceId: notification.sourceId,
            recipientWalletAddress: notification.recipientWalletAddress,
          }),
          chainId: context.chain.id,
          blockNumber: event.block.number,
          timestamp: event.block.timestamp,
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
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
