import { index, onchainTable, primaryKey, type PgColumnsBuilders, relations } from "ponder";
import { generateId } from "./src/util/id";

export const uniqueId = (t: PgColumnsBuilders) => ({
  id: t
    .text()
    .notNull()
    .$default(() => generateId())
    .primaryKey(),
});

export const chainId = (t: PgColumnsBuilders) => ({
  chainId: t.integer().notNull(),
});
export const createdAt = (t: PgColumnsBuilders) => ({
  createdAt: t.integer().notNull(),
});

export const projectId = (t: PgColumnsBuilders) => ({
  projectId: t.integer().notNull(),
});

export const paymentsCount = (t: PgColumnsBuilders) => ({
  paymentsCount: t.integer().notNull().default(0),
});

export const balance = (t: PgColumnsBuilders) => ({
  balance: t.bigint().notNull().default(BigInt(0)),
});

export const timestamp = (t: PgColumnsBuilders) => ({
  timestamp: t.integer().notNull(),
});
export const logIndex = (t: PgColumnsBuilders) => ({
  logIndex: t.integer().notNull(),
});
export const blockNumber = (t: PgColumnsBuilders) => ({
  blockNumber: t.bigint().notNull(),
});
export const blockTimestamp = (t: PgColumnsBuilders) => ({
  blockTimestamp: t.integer().notNull(),
});
export const txHash = (t: PgColumnsBuilders) => ({ txHash: t.hex().notNull() });
export const caller = (t: PgColumnsBuilders) => ({ caller: t.hex().notNull() });
export const from = (t: PgColumnsBuilders) => ({ from: t.hex().notNull() });
export const suckerGroupId = (t: PgColumnsBuilders) => ({
  suckerGroupId: t.text().notNull(),
});

// Common event parameters helper
export const eventParams = (t: PgColumnsBuilders) => ({
  ...uniqueId(t),
  ...chainId(t),
  ...txHash(t),
  ...timestamp(t),
  ...caller(t),
  ...from(t),
  ...logIndex(t),
});

export const project = onchainTable(
  "project",
  (t) => ({
    ...chainId(t),
    ...createdAt(t),
    ...projectId(t),
    ...balance(t),
    ...paymentsCount(t),
    ...suckerGroupId(t),
    isRevnet: t.boolean().notNull(),
    deployer: t.hex().notNull(),
    owner: t.hex().notNull(),

    erc20: t.hex(),
    erc20Supply: t.bigint().notNull().default(BigInt(0)),
    erc20Name: t.text(),
    erc20Symbol: t.text(),

    cashout__A: t.bigint().notNull().default(BigInt(0)),
    cashout__B: t.bigint().notNull().default(BigInt(0)),

    currentRulesetId: t.bigint().notNull().default(BigInt(0)),

    contributorsCount: t.integer().notNull().default(0),
    redeemCount: t.integer().notNull().default(0),
    redeemVolume: t.bigint().notNull().default(BigInt(0)),

    pendingReservedTokens: t.bigint().notNull().default(BigInt(0)),

    metadataUri: t.text(),
    metadata: t.json().$type<{
      name: string | null;
      description: string | null;
      logoUri: string | null;
      infoUri: string | null;
      coverImageUri: string | null;
      twitter: string | null;
      discord: string | null;
      telegram: string | null;
      tokens: string[] | null;
      tags: string[] | null;
      softTargetCurrency?: string;
      domain: string | null;
      version?: number;
      projectTagline: string | null;
      payDisclosure?: string;
    }>(),
    name: t.text(),
    infoUri: t.text(),
    logoUri: t.text(),
    coverImageUri: t.text(),
    twitter: t.text(),
    discord: t.text(),
    telegram: t.text(),
    tokens: t.text().array(),
    domain: t.text(),
    description: t.text(),
    tags: t.text().array(),
    projectTagline: t.text(),

    accountingToken: t.hex().notNull(),
    accountingDecimals: t.integer().notNull(),
    accountingCurrency: t.bigint().notNull(),
    accountingTokenSymbol: t.text().notNull(),
    accountingTokenName: t.text().notNull(),
  }),
  (t) => ({
    projectIdx: index().on(t.projectId),
    pk: primaryKey({ columns: [t.chainId, t.projectId] }),
    suckerGroupIdIdx: index().on(t.suckerGroupId),
    chainIdIdx: index().on(t.chainId),
    nameIdx: index().on(t.name),
    balanceIdx: index().on(t.balance),
  })
);

export const suckerGroup = onchainTable("sucker_group", (t) => ({
  id: t
    .text()
    .$default(() => generateId())
    .primaryKey(),
  projects: t.text().array().notNull().default([]),
  addresses: t.hex().array().notNull().default([]),
  createdAt: t.integer().notNull(),
}));

/**
 * Deterministic lookup for resolving sucker group membership by sucker address.
 * Used to avoid non-PK scans when merging groups on SuckerDeployedFor.
 */
export const suckerGroupByAddress = onchainTable("_kv_sucker_group_by_address", (t) => ({
  id: t.hex().primaryKey(), // normalized lowercase sucker address
  suckerGroupId: t.text().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  suckerGroup: one(suckerGroup, {
    fields: [project.suckerGroupId],
    references: [suckerGroup.id],
  }),
  loans: many(loan),
  borrowLoanEvents: many(borrowLoanEvent),
  repayLoanEvents: many(repayLoanEvent),
  liquidateLoanEvents: many(liquidateLoanEvent),
  reallocateLoanEvents: many(reallocateLoanEvent),
  suckers: many(sucker),
}));

export const participant = onchainTable(
  "participant",
  (t) => ({
    ...chainId(t),
    ...projectId(t),
    ...createdAt(t),
    ...balance(t),
    ...suckerGroupId(t),
    isRevnet: t.boolean(),
    address: t.hex().notNull(),
    firstOwned: t.integer(),
    borrowableAmount: t.bigint().notNull().default(BigInt(0)),
  }),
  (t) => ({
    addressIdx: index().on(t.address),
    chainIdProjectIdIdx: index().on(t.chainId, t.projectId),
    suckerGroupIdIdx: index().on(t.suckerGroupId),
    balanceIdx: index().on(t.balance),
    pk: primaryKey({ columns: [t.chainId, t.projectId, t.address] }),
  })
);

export const payEvent = onchainTable("pay_event", (t) => ({
  ...eventParams(t),
  ...projectId(t),
  ...suckerGroupId(t),
  rulesetId: t.bigint().notNull(),
  rulesetCycleNumber: t.bigint().notNull(),
  payer: t.hex().notNull(),
  beneficiary: t.hex().notNull(),
  amount: t.bigint().notNull(),
  newlyIssuedTokenCount: t.bigint().notNull(),
  buybackTokenCount: t.bigint().notNull().default(BigInt(0)),
  effectiveTokenCount: t.bigint().notNull().default(BigInt(0)),
  memo: t.text().notNull(),
  metadata: t.hex().notNull(),
  caller: t.hex().notNull(),
  txnValue: t.text().notNull(),
}));

// Basic loan entity for tracking borrowable amounts
export const loan = onchainTable(
  "loan",
  (t) => ({
    id: t.bigint().notNull(),
    ...projectId(t),
    ...chainId(t),
    ...createdAt(t),
    ...suckerGroupId(t),
    borrowAmount: t.bigint().notNull(),
    collateral: t.bigint().notNull(),
    sourceFeeAmount: t.bigint().notNull(),
    prepaidDuration: t.integer().notNull(),
    prepaidFeePercent: t.integer().notNull(),
    beneficiary: t.hex().notNull(),
    owner: t.hex().notNull(),
    token: t.hex().notNull(),
    terminal: t.hex().notNull(),
    tokenUri: t.text(),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.id, t.chainId] }),
  })
);

export const loanRelations = relations(loan, ({ one }) => ({
  project: one(project, {
    fields: [loan.projectId, loan.chainId],
    references: [project.projectId, project.chainId],
  }),
}));

// Basic loan event entities for activity tracking
export const borrowLoanEvent = onchainTable("borrow_loan_event", (t) => ({
  ...eventParams(t),
  ...projectId(t),
  ...suckerGroupId(t),
  borrowAmount: t.bigint().notNull(),
  collateral: t.bigint().notNull(),
  sourceFeeAmount: t.bigint().notNull(),
  prepaidDuration: t.integer().notNull(),
  prepaidFeePercent: t.integer().notNull(),
  beneficiary: t.hex().notNull(),
  token: t.hex().notNull(),
  terminal: t.hex().notNull(),
}));

export const borrowLoanEventRelations = relations(borrowLoanEvent, ({ one }) => ({
  project: one(project, {
    fields: [borrowLoanEvent.chainId, borrowLoanEvent.projectId],
    references: [project.chainId, project.projectId],
  }),
}));

export const repayLoanEvent = onchainTable("repay_loan_event", (t) => ({
  ...eventParams(t),
  ...projectId(t),
  ...suckerGroupId(t),
  loanId: t.bigint().notNull(),
  paidOffLoanId: t.bigint().notNull(),
  repayBorrowAmount: t.bigint().notNull(),
  collateralCountToReturn: t.bigint().notNull(),
}));

export const repayLoanEventRelations = relations(repayLoanEvent, ({ one }) => ({
  project: one(project, {
    fields: [repayLoanEvent.chainId, repayLoanEvent.projectId],
    references: [project.chainId, project.projectId],
  }),
}));

export const liquidateLoanEvent = onchainTable("liquidate_loan_event", (t) => ({
  ...eventParams(t),
  ...projectId(t),
  ...suckerGroupId(t),
  borrowAmount: t.bigint().notNull(),
  collateral: t.bigint().notNull(),
}));

export const liquidateLoanEventRelations = relations(liquidateLoanEvent, ({ one }) => ({
  project: one(project, {
    fields: [liquidateLoanEvent.chainId, liquidateLoanEvent.projectId],
    references: [project.chainId, project.projectId],
  }),
}));

export const reallocateLoanEvent = onchainTable("reallocate_loan_event", (t) => ({
  ...eventParams(t),
  ...projectId(t),
  ...suckerGroupId(t),
  loanId: t.bigint().notNull(),
  reallocatedLoanId: t.bigint().notNull(),
  removedCollateralCount: t.bigint().notNull(),
}));

export const reallocateLoanEventRelations = relations(reallocateLoanEvent, ({ one }) => ({
  project: one(project, {
    fields: [reallocateLoanEvent.chainId, reallocateLoanEvent.projectId],
    references: [project.chainId, project.projectId],
  }),
}));

export const ruleset = onchainTable(
  "ruleset",
  (t) => ({
    // Primary identifiers
    ...chainId(t),
    ...projectId(t),
    ...suckerGroupId(t),
    rulesetId: t.bigint().notNull(), // uint256 from events

    // Timestamps
    ...createdAt(t), // when queued/initialized
    queuedAt: t.integer().notNull(),

    // Core ruleset properties from JBRuleset struct
    cycleNumber: t.integer().notNull(),
    basedOnId: t.bigint().notNull(),
    start: t.bigint().notNull(),
    duration: t.bigint().notNull(),
    weight: t.bigint().notNull(),
    weightCutPercent: t.integer().notNull(),
    approvalHook: t.hex(),

    // Metadata fields (unpacked from uint256)
    reservedPercent: t.integer().notNull(),
    cashOutTaxRate: t.integer().notNull(),
    baseCurrency: t.integer().notNull(),

    // Boolean flags from metadata
    pausePay: t.boolean().notNull(),
    pauseCreditTransfers: t.boolean().notNull(),
    allowOwnerMinting: t.boolean().notNull(),
    allowSetCustomToken: t.boolean().notNull(),
    allowTerminalMigration: t.boolean().notNull(),
    allowSetTerminals: t.boolean().notNull(),
    allowSetController: t.boolean().notNull(),
    allowAddAccountingContext: t.boolean().notNull(),
    allowAddPriceFeed: t.boolean().notNull(),
    ownerMustSendPayouts: t.boolean().notNull(),
    holdFees: t.boolean().notNull(),
    useTotalSurplusForCashOuts: t.boolean().notNull(),
    useDataHookForPay: t.boolean().notNull(),
    useDataHookForCashOut: t.boolean().notNull(),

    // Data hook address from metadata
    dataHook: t.hex(),

    // Raw metadata values
    metadata: t.bigint().notNull(), // Full uint256 metadata
    metadataExtra: t.integer(), // The uint16 metadata field from expandMetadata

    // Event specific fields
    mustStartAtOrAfter: t.bigint(),
    caller: t.hex().notNull(),

    // Status fields
    approvalStatus: t.text(), // Could be enum: 'Empty', 'Approved', 'Failed', 'ApprovalExpected'
  }),
  (table) => ({
    projectIdx: index().on(table.projectId),
    rulesetIdx: index().on(table.rulesetId),
    startIdx: index().on(table.start),
    pk: primaryKey({
      columns: [table.chainId, table.projectId, table.rulesetId],
    }),
  })
);

export const rulesetActivationState = onchainTable(
  "ruleset_activation_state",
  (t) => ({
    ...chainId(t),
    lastChecked: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId] }),
  })
);

export const ERC20ToProjectId = onchainTable(
  "_kv_ERC20ToProjectId",
  (t) => ({
    erc20: t.hex(),
    chainId: t.integer().notNull(),
    projectId: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.erc20, table.chainId] }),
  })
);

export const payEventByTxBeneficiary = onchainTable(
  "_kv_pay_event_by_tx_beneficiary",
  (t) => ({
    chainId: t.integer().notNull(),
    txHash: t.hex().notNull(),
    beneficiary: t.hex().notNull(),
    payEventId: t.text().notNull(),
    payLogIndex: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.txHash, table.beneficiary] }),
  })
);

export const sucker = onchainTable(
  "sucker",
  (t) => ({
    ...projectId(t),
    ...chainId(t),
    address: t.hex().notNull(),
  }),
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.chainId, t.address] }),
  })
);

export const suckerRelations = relations(sucker, ({ one }) => ({
  project: one(project, {
    fields: [sucker.projectId, sucker.chainId],
    references: [project.projectId, project.chainId],
  }),
}));

export const activityLog = onchainTable(
  "activity_log",
  (t) => ({
    ...uniqueId(t),
    ...chainId(t),
    ...timestamp(t),
    ...txHash(t),
    ...suckerGroupId(t),
    type: t.text().notNull(), // "pay" | "borrow" | "repay" | "liquidate" | "reallocate" | "cashout"
    user: t.hex().notNull(), // The address that performed the action
    amount: t.text().notNull(), // Amount as string
    currency: t.text().notNull(), // Currency symbol (ETH, USDC, etc.)
    description: t.text().notNull(), // Human-readable description
    memo: t.text(), // Optional memo field (mainly for pay events)
  }),
  (t) => ({
    typeIdx: index().on(t.type),
    userIdx: index().on(t.user),
    timestampIdx: index().on(t.timestamp),
    suckerGroupId: index().on(t.suckerGroupId),
  })
);

export const cashoutCoefficientSnapshot = onchainTable(
  "cashout_coefficient_snapshot",
  (t) => ({
    ...uniqueId(t),
    ...chainId(t),
    ...projectId(t),
    ...suckerGroupId(t),
    ...timestamp(t),
    txHash: t.hex().notNull(),
    cashoutA: t.bigint().notNull(),
    cashoutB: t.bigint().notNull(),
    balance: t.bigint().notNull(),
    totalSupply: t.bigint().notNull(),
    cashOutTaxRate: t.integer().notNull(),
  }),
  (t) => ({
    suckerGroupIdIdx: index().on(t.suckerGroupId),
    projectIdx: index().on(t.projectId),
    timestampIdx: index().on(t.timestamp),
  })
);

export const swapEventParams = (t: PgColumnsBuilders) => ({
  ...chainId(t),
  ...txHash(t),
  ...blockTimestamp(t),
  ...blockNumber(t),
  ...from(t),
  ...logIndex(t),
});

export const swapExecuted = onchainTable(
  "swap_executed",
  (t) => ({
    id: t.text().primaryKey(),
    recipient: t.hex().notNull(),
    tokenIn: t.hex().notNull(),
    tokenOut: t.hex().notNull(),
    amountIn: t.bigint().notNull(),
    fee: t.bigint().notNull(),
    amountOut: t.bigint().notNull(),
    ...swapEventParams(t),
  }),
  (table) => ({
    recipientIdx: index().on(table.recipient),
    tokenInIdx: index().on(table.tokenIn),
    tokenOutIdx: index().on(table.tokenOut),
    blockTimestampIdx: index().on(table.blockTimestamp),
    txHashIdx: index().on(table.txHash),
  })
);

export const batchReactionSwap = onchainTable(
  "batch_reaction_swap",
  (t) => ({
    id: t.text().primaryKey(),
    tokenIn: t.hex().notNull(),
    tokenOut: t.hex().notNull(),
    amountIn: t.bigint().notNull(),
    amountOut: t.bigint().notNull(),
    fee: t.bigint().notNull(),
    router: t.hex().notNull(),
    ...swapEventParams(t),
  }),
  (table) => ({
    tokenInIdx: index().on(table.tokenIn),
    tokenOutIdx: index().on(table.tokenOut),
    blockTimestampIdx: index().on(table.blockTimestamp),
    routerIdx: index().on(table.router),
    txHashLowerIdx: index().on(table.txHash),
  })
);

export const transactionHashToBatchReactionSwaps = onchainTable(
  "transaction_hash_to_batch_reaction_swaps",
  (t) => ({
    txHash: t.hex().primaryKey(),
    batchReactionSwapIds: t.text().array().notNull(),
  })
);
export const protocolEvent = onchainTable("protocol_event", (t) => ({
  id: t.text().primaryKey(), // event.id (globally unique)
  chainId: t.integer().notNull(),
  contractName: t.text().notNull(),
  contractAddress: t.hex().notNull(),
  eventName: t.text().notNull(),
  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  args: t.json().notNull(),
}));

/**
 * Keeper outbox stream consumed by external keeper workers.
 * Rows are immutable and keyed by deterministic block/log ordering.
 */
export const keeperOutbox = onchainTable(
  "keeper_outbox",
  (t) => ({
    id: t.bigint().notNull(), // blockNumber*1_000_000 + logIndex
    chainId: t.integer().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
    contractName: t.text().notNull(),
    contractAddress: t.hex().notNull(),
    eventName: t.text().notNull(),
    eventArgs: t.json().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.id] }),
    chainOutboxIdx: index().on(table.chainId, table.id),
    chainBlockIdx: index().on(table.chainId, table.blockNumber),
    txLogIdx: index().on(table.txHash, table.logIndex),
  })
);

/**
 * Flow entity state (1 row per Flow contract address).
 */
export const flow = onchainTable("flow", (t) => ({
  id: t.hex().primaryKey(), // Flow contract address

  kind: t.text(), // "goal" | "child" | "unknown" (set by handlers)

  parentFlow: t.hex(), // nullable

  // From FlowInitialized
  initialOwner: t.hex(),
  initialFlowImpl: t.hex(),
  initialRecipientManager: t.hex(),
  superToken: t.hex(),
  distributionPool: t.hex(),
  managerRewardPoolFlowRatePercent: t.integer(),
  managerRewardPool: t.hex(),
  allocationPipeline: t.hex(),
  flowOperator: t.hex(),
  sweeper: t.hex(),
  strategy: t.hex(),
  metadataTitle: t.text(),
  metadataDescription: t.text(),
  metadataImage: t.text(),
  metadataTagline: t.text(),
  metadataUrl: t.text(),

  // Dynamic state
  currentFlowRate: t.bigint().notNull().default(0n), // int96 stored as bigint
  currentFlowRateObservedAtBlock: t.bigint(),
  currentFlowRateObservedAtTimestamp: t.bigint(),
  currentFlowRateStale: t.boolean().notNull().default(true),
  currentFlowRateFailureCount: t.integer().notNull().default(0),
  currentFlowRateLastFailureAt: t.bigint(),
  currentFlowRateLastFailureReason: t.text(),
  targetOutflowRate: t.bigint().notNull().default(0n), // int96 stored as bigint

  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Per-chain round-robin refresh queue for flow actual-rate cron reads.
 * `flowIds` is append-only in event order and `cursor` advances each cron tick.
 */
export const flowActualRateRefreshState = onchainTable("flow_actual_rate_refresh_state", (t) => ({
  id: t.integer().primaryKey(), // chainId

  flowIds: t.hex().array().notNull().default([]),
  cursor: t.integer().notNull().default(0),

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Recipient state within a flow (1 row per Flow x recipientId).
 * `distributionUnits` is intended to mirror Superfluid pool member units:
 *   DEFAULT_UNITS (10) + sum(computedUnits across allocation keys), or 0 if removed.
 */
export const flowRecipient = onchainTable("flow_recipient", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${recipientId}`

  flowId: t.hex().notNull(),
  recipientId: t.hex().notNull(), // bytes32
  recipient: t.hex().notNull(), // address
  approvedBy: t.hex(),

  recipientIndex: t.integer().notNull(), // 0-based
  recipientType: t.integer().notNull(), // uint8 enum in contract
  isRemoved: t.boolean().notNull().default(false),

  // Metadata
  title: t.text(),
  description: t.text(),
  image: t.text(),
  tagline: t.text(),
  url: t.text(),

  // Flow-recipient specific fields
  isFlowRecipient: t.boolean().notNull().default(false),
  childDistributionPool: t.hex(),
  childStrategy: t.hex(),
  childManagerRewardPoolFlowRatePercent: t.integer(),
  budgetTreasury: t.hex(), // explicit budget_treasury.id linkage for this recipient

  // Pool units bookkeeping
  allocationUnitsSum: t.bigint().notNull().default(0n), // sum of computed units across allocation keys
  distributionUnits: t.bigint().notNull().default(0n), // DEFAULT_UNITS + allocationUnitsSum (or 0 when removed)

  createdAtBlock: t.bigint().notNull(),
  createdAtTimestamp: t.bigint().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
  removedAtBlock: t.bigint(),
  removedAtTimestamp: t.bigint(),
}));

/**
 * Deterministic flow+index -> flow recipient row lookup.
 * Used to resolve compact allocation snapshot recipient indices without non-PK scans.
 */
export const flowRecipientByIndex = onchainTable("flow_recipient_by_index", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${recipientIndex}`

  flowId: t.hex().notNull(),
  recipientIndex: t.integer().notNull(),
  flowRecipientId: t.text().notNull(), // `${flow}:${recipientId}`
  recipientId: t.hex().notNull(),

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * State for an allocation key (Flow x strategy x allocationKey).
 * Stores the latest commitment/weight/snapshot needed to compute deltas.
 */
export const allocationKeyState = onchainTable("allocation_key_state", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${strategy}:${allocationKey}`

  flowId: t.hex().notNull(),
  strategy: t.hex().notNull(),
  allocationKey: t.bigint().notNull(),

  commitment: t.hex().notNull(), // bytes32
  weight: t.bigint().notNull(),
  snapshotVersion: t.integer().notNull().default(0),
  packedSnapshot: t.hex().notNull(), // bytes as 0x…

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Per-recipient state for an allocation key (Flow x strategy x allocationKey x recipientId).
 * Stores the latest scaled allocation and computed units (EXCLUDING the DEFAULT_UNITS baseline).
 */
export const allocationEntryState = onchainTable("allocation_entry_state", (t) => ({
  id: t.text().primaryKey(), // `${flow}:${strategy}:${allocationKey}:${recipientId}`

  flowId: t.hex().notNull(),
  strategy: t.hex().notNull(),
  allocationKey: t.bigint().notNull(),

  recipientId: t.hex().notNull(),
  recipient: t.hex().notNull(),
  recipientIndex: t.integer().notNull(),

  allocationScaled: t.integer().notNull(), // uint32
  computedUnits: t.bigint().notNull(), // computed units for THIS allocationKey (no baseline)

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Budget stack entity (one per TCR itemID).
 */
export const budgetStack = onchainTable("budget_stack", (t) => ({
  id: t.hex().primaryKey(), // itemID / recipientId (bytes32)

  childFlow: t.hex(),
  budgetTreasury: t.hex(),
  premiumEscrow: t.hex(),
  strategy: t.hex(),

  status: t.text(), // "DEPLOYED" | "ACTIVE" | "REMOVAL_QUEUED" | "REMOVED" etc.

  deployedAtBlock: t.bigint(),
  deployedAtTimestamp: t.bigint(),
  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Budget treasury state (1 row per BudgetTreasury address).
 */
export const budgetTreasury = onchainTable("budget_treasury", (t) => ({
  id: t.hex().primaryKey(),

  controller: t.hex(),
  recipientId: t.hex(), // bytes32 (budgetId)
  childFlow: t.hex(),
  premiumEscrow: t.hex(),
  strategy: t.hex(),

  fundingDeadline: t.bigint(),
  executionDuration: t.bigint(),
  activationThreshold: t.bigint(),
  runwayCap: t.bigint(),

  state: t.integer(), // uint8
  finalized: t.boolean().notNull().default(false),

  successAssertionId: t.hex(),
  successAssertionRegisteredAt: t.bigint(),
  successResolutionDisabled: t.boolean().notNull().default(false),
  reassertGraceDeadline: t.bigint(),

  lastSyncedTargetRate: t.bigint(),
  lastSyncedAppliedRate: t.bigint(),
  lastSyncedTreasuryBalance: t.bigint(),
  lastSyncedTimeRemaining: t.bigint(),
  lastSyncAlertFlow: t.hex(),
  lastSyncAlertTargetRate: t.bigint(),
  lastSyncAlertFallbackRate: t.bigint(),
  lastSyncAlertCurrentRate: t.bigint(),
  lastResidualDestination: t.hex(),
  lastResidualSettledAmount: t.bigint(),

  createdAtBlock: t.bigint(),
  createdAtTimestamp: t.bigint(),
  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Deterministic recipient -> budget treasury lookup keyed by recipientId (bytes32).
 */
export const budgetTreasuryByRecipient = onchainTable("budget_treasury_by_recipient", (t) => ({
  id: t.hex().primaryKey(), // recipientId
  budgetTreasury: t.hex().notNull(),
  childFlow: t.hex(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Deterministic child-flow -> budget treasury lookup keyed by childFlow.
 */
export const budgetTreasuryByChildFlow = onchainTable("budget_treasury_by_child_flow", (t) => ({
  id: t.hex().primaryKey(), // childFlow
  budgetTreasury: t.hex().notNull(),
  recipientId: t.hex(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Deterministic canonical-project -> goal treasuries lookup keyed by `${chainId}-${projectId}`.
 */
export const goalTreasuriesByProject = onchainTable("goal_treasuries_by_project", (t) => ({
  id: t.text().primaryKey(),
  goalTreasuries: t.hex().array().notNull().default([]),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Goal factory deployment rows keyed by `${chainId}:${goalRevnetId}`.
 * Captures the emitted core stack addresses from GoalFactory:GoalDeployed.
 */
export const goalFactoryDeployment = onchainTable("goal_factory_deployment", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  goalFactory: t.hex().notNull(),
  caller: t.hex().notNull(),
  goalRevnetId: t.bigint().notNull(),
  goalToken: t.hex().notNull(),
  goalSuperToken: t.hex().notNull(),
  goalTreasury: t.hex().notNull(),
  goalFlow: t.hex().notNull(),
  stakeVault: t.hex().notNull(),
  budgetStakeLedger: t.hex().notNull(),
  splitHook: t.hex().notNull(),
  jurorSlasherRouter: t.hex().notNull(),
  underwriterSlasherRouter: t.hex().notNull(),
  successResolver: t.hex().notNull(),
  budgetTcr: t.hex().notNull(),
  arbitrator: t.hex().notNull(),
  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Goal treasury state (1 row per GoalTreasury address).
 */
export const goalTreasury = onchainTable(
  "goal_treasury",
  (t) => ({
    id: t.hex().primaryKey(),

    owner: t.hex(),
    flowAddress: t.hex(),
    budgetStakeLedger: t.hex(),
    goalToken: t.hex(),
    cobuildToken: t.hex(),
    stakeVault: t.hex(),
    hook: t.hex(),
    goalRulesets: t.hex(),
    successResolver: t.hex(),
    goalRevnetId: t.bigint(),
    canonicalProjectChainId: t.integer(),
    canonicalProjectId: t.integer(),
    canonicalRouteSlug: t.text(),
    canonicalRouteDomain: t.text(),
    minRaiseDeadline: t.bigint(),
    deadline: t.bigint(),
    minRaise: t.bigint(),
    strategy: t.hex(),
    parentFlow: t.hex(),

    state: t.integer(),
    finalized: t.boolean().notNull().default(false),

    successAssertionId: t.hex(),
    successAssertionRegisteredAt: t.bigint(),
    reassertGraceDeadline: t.bigint(),
    jurorSlasher: t.hex(),
    underwriterSlasher: t.hex(),
    successAt: t.bigint(),

    lastSyncedTargetRate: t.bigint(),
    lastSyncedAppliedRate: t.bigint(),
    lastSyncedTreasuryBalance: t.bigint(),
    lastSyncedTimeRemaining: t.bigint(),
    lastSyncAlertFlow: t.hex(),
    lastSyncAlertTargetRate: t.bigint(),
    lastSyncAlertFallbackRate: t.bigint(),
    lastSyncAlertCurrentRate: t.bigint(),
    lastResidualFinalState: t.integer(),
    lastResidualSettledAmount: t.bigint(),
    lastResidualControllerBurnAmount: t.bigint(),

    createdAtBlock: t.bigint(),
    createdAtTimestamp: t.bigint(),
    updatedAtBlock: t.bigint(),
    updatedAtTimestamp: t.bigint(),
  }),
  (t) => ({
    canonicalProjectIdx: index().on(t.canonicalProjectChainId, t.canonicalProjectId),
    canonicalRouteSlugIdx: index().on(t.canonicalRouteSlug),
    canonicalRouteDomainIdx: index().on(t.canonicalRouteDomain),
  })
);

/**
 * Precomputed goal-treasury series points.
 * Each row stores net movement and resulting balance for a treasury snapshot event.
 */
export const goalTreasurySeries = onchainTable(
  "goal_treasury_series",
  (t) => ({
    id: t.text().primaryKey(), // event.id
    goalTreasury: t.hex().notNull(),
    sourceEventName: t.text().notNull(),
    inflow: t.bigint().notNull().default(0n),
    outflow: t.bigint().notNull().default(0n),
    balance: t.bigint().notNull(),
    txHash: t.hex().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (t) => ({
    goalTreasuryTimestampIdx: index().on(t.goalTreasury, t.timestamp),
  })
);

/**
 * Per-goal cursor to compute deterministic deltas for goal_treasury_series.
 */
export const goalTreasurySeriesCursor = onchainTable("goal_treasury_series_cursor", (t) => ({
  id: t.hex().primaryKey(), // goalTreasury
  lastSeriesId: t.text().notNull(),
  lastBalance: t.bigint().notNull(),
  lastBlockNumber: t.bigint().notNull(),
  lastTimestamp: t.bigint().notNull(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Pre-aggregated per-goal contributor totals used by interface holdings surfaces.
 * Semantics intentionally mirror holdings query behavior:
 * - only pay events with newly issued tokens contribute
 * - contributions roll up by goal treasury across the canonical project's sucker group
 */
export const goalContributorAggregate = onchainTable(
  "goal_contributor_aggregate",
  (t) => ({
    id: t.text().primaryKey(), // `${goalTreasury}:${contributor}`
    goalTreasury: t.hex().notNull(),
    contributor: t.hex().notNull(),
    totalContributed: t.bigint().notNull().default(0n),
    contributionCount: t.integer().notNull().default(0),
    firstContributedAt: t.integer().notNull(),
    lastContributedAt: t.integer().notNull(),
    firstContributionTxHash: t.hex().notNull(),
    lastContributionTxHash: t.hex().notNull(),
    updatedAtBlock: t.bigint().notNull(),
    updatedAtTimestamp: t.bigint().notNull(),
  }),
  (t) => ({
    goalContributorIdx: index().on(t.goalTreasury, t.contributor),
    contributorIdx: index().on(t.contributor),
    goalTreasuryIdx: index().on(t.goalTreasury),
  })
);

/**
 * Stake vault aggregate state (GoalStakeVault instances, both goal and budget vaults).
 */
export const stakeVault = onchainTable("stake_vault", (t) => ({
  id: t.hex().primaryKey(),

  kind: t.text(), // "goal" | "budget" | "unknown"
  treasury: t.hex(), // nullable

  goalTotalStaked: t.bigint().notNull().default(0n),
  cobuildTotalStaked: t.bigint().notNull().default(0n),
  goalTotalWithdrawn: t.bigint().notNull().default(0n),
  cobuildTotalWithdrawn: t.bigint().notNull().default(0n),

  resolved: t.boolean().notNull().default(false),

  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

/**
 * Per-account stake position within a vault.
 */
export const stakePosition = onchainTable("stake_position", (t) => ({
  id: t.text().primaryKey(), // `${vault}:${account}:${tokenKind}`

  vault: t.hex().notNull(),
  account: t.hex().notNull(),
  tokenKind: t.text().notNull(), // "goal" | "cobuild"

  staked: t.bigint().notNull().default(0n),
  withdrawn: t.bigint().notNull().default(0n),

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

/**
 * Juror state within a stake vault.
 */
export const juror = onchainTable("juror", (t) => ({
  id: t.text().primaryKey(), // `${vault}:${juror}`

  vault: t.hex().notNull(),
  jurorAddress: t.hex().notNull(),

  optedIn: t.boolean().notNull().default(false),
  exitTime: t.bigint(), // uint64
  delegate: t.hex(),
  slasher: t.hex(),
  slashedTotal: t.bigint().notNull().default(0n),

  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

export const premiumEscrow = onchainTable("premium_escrow", (t) => ({
  id: t.hex().primaryKey(),

  budgetStackId: t.hex(),
  childFlow: t.hex(),
  budgetTreasury: t.hex(),
  managerRewardPool: t.hex(),
  baselineReceived: t.bigint().notNull().default(0n),

  latestDistributedPremium: t.bigint(),
  latestTotalCoverage: t.bigint(),
  latestPremiumIndex: t.bigint(),
  lastIndexedAtBlock: t.bigint(),
  lastIndexedAtTimestamp: t.bigint(),

  closed: t.boolean().notNull().default(false),
  finalState: t.integer(),
  activatedAt: t.bigint(),
  closedAt: t.bigint(),

  updatedAtBlock: t.bigint(),
  updatedAtTimestamp: t.bigint(),
}));

export const premiumAccount = onchainTable("premium_account", (t) => ({
  id: t.text().primaryKey(), // `${escrow}:${account}`

  escrow: t.hex().notNull(),
  account: t.hex().notNull(),

  currentCoverage: t.bigint().notNull().default(0n),
  claimableAmount: t.bigint().notNull().default(0n),
  exposureIntegral: t.bigint().notNull().default(0n),

  slashed: t.boolean().notNull().default(false),
  lastSlashWeight: t.bigint(),
  lastSlashDuration: t.bigint(),

  lastCheckpointBlock: t.bigint(),
  lastCheckpointTimestamp: t.bigint(),
  updatedAtBlock: t.bigint().notNull(),
  updatedAtTimestamp: t.bigint().notNull(),
}));

export const premiumClaim = onchainTable("premium_claim", (t) => ({
  id: t.text().primaryKey(), // event.id

  escrow: t.hex().notNull(),
  account: t.hex().notNull(),
  to: t.hex().notNull(),
  amount: t.bigint().notNull(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Donation rows (goal + budget treasuries).
 */
export const donation = onchainTable("donation", (t) => ({
  id: t.text().primaryKey(), // event.id

  kind: t.text().notNull(), // "goal" | "budget"
  treasury: t.hex().notNull(),
  donor: t.hex().notNull(),
  amount: t.bigint().notNull(),
  token: t.hex().notNull(),
  memo: t.hex(), // legacy bytes32
  metadata: t.hex(), // legacy bytes
  sourceAmount: t.bigint(),
  superTokenAmount: t.bigint(),
  totalRaised: t.bigint(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Goal hook funding bookkeeping from GoalTreasury events (recorded/deferred/settled).
 */
export const hookFunding = onchainTable("hook_funding", (t) => ({
  id: t.text().primaryKey(), // event.id

  goalTreasury: t.hex().notNull(),
  kind: t.text().notNull(), // "RECORDED" | "DEFERRED" | "SETTLED"
  amount: t.bigint().notNull(),
  token: t.hex(),
  sourceAmount: t.bigint(),
  superTokenAmount: t.bigint(),
  totalRaised: t.bigint(),
  deferredSuperTokenAmount: t.bigint(),
  controllerBurnAmount: t.bigint(),
  finalState: t.integer(),
  beneficiary: t.hex(), // only for SETTLED

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Pipeline sync telemetry from GoalFlowAllocationLedgerPipeline.
 */
export const pipelineSync = onchainTable("pipeline_sync", (t) => ({
  id: t.text().primaryKey(), // event.id

  eventName: t.text().notNull(),

  childRecipientId: t.hex(),
  childFlow: t.hex(),
  strategy: t.hex(),
  allocationKey: t.bigint(),

  parentRecipientId: t.hex(),
  parentFlow: t.hex(),
  parentStrategy: t.hex(),
  parentAllocationKey: t.bigint(),

  commitment: t.hex(),
  weight: t.bigint(),
  childAllocationKey: t.bigint(),

  budgetTreasury: t.hex(),

  success: t.boolean(),
  reason: t.hex(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Allocation checkpointing from BudgetStakeLedger (useful for time-series).
 */
export const allocationCheckpoint = onchainTable("allocation_checkpoint", (t) => ({
  id: t.text().primaryKey(), // event.id

  account: t.hex().notNull(),
  budget: t.hex().notNull(),
  allocatedStake: t.bigint().notNull(),
  checkpointTimestamp: t.bigint().notNull(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

/**
 * Hook processing rows from GoalRevnetSplitHook.
 */
export const hookProcess = onchainTable("hook_process", (t) => ({
  id: t.text().primaryKey(), // event.id

  eventName: t.text().notNull(), // GoalFundingProcessed | GoalSuccessSettlementProcessed
  projectId: t.bigint(),
  sourceToken: t.hex(),
  sourceAmount: t.bigint(),
  superTokenAmount: t.bigint(),
  accepted: t.boolean(),
  action: t.integer(),
  burnAmount: t.bigint(),
  recipientId: t.hex(),
  caller: t.hex(),
  amount: t.bigint(),
  token: t.hex(),

  beneficiary: t.hex(),
  succeeded: t.boolean(),

  txHash: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));
