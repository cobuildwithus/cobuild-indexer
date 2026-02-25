import { parseAbi } from "viem";

/**
 * Event ABI for BudgetTCR.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const BudgetTCRAbi = parseAbi([
  "event BudgetStackActivationQueued(bytes32 indexed itemID)",
  "event BudgetStackDeployed(bytes32 indexed itemID, address indexed childFlow, address indexed budgetTreasury, address stakeVault, address strategy)",
  "event BudgetStackRemovalHandled(bytes32 indexed itemID, address indexed childFlow, address indexed budgetTreasury, bool removedFromParent, bool terminallyResolved)",
  "event BudgetStackRemovalQueued(bytes32 indexed itemID)",
  "event BudgetStackTerminalizationRetried(bytes32 indexed itemID, address indexed budgetTreasury, bool terminallyResolved)",
  "event BudgetTerminalizationStepFailed(bytes32 indexed itemID, address indexed budgetTreasury, bytes4 indexed selector, bytes reason)",
  "event BudgetTreasuryBatchSyncAttempted(bytes32 indexed itemID, address indexed budgetTreasury, bool success)",
  "event BudgetTreasuryBatchSyncSkipped(bytes32 indexed itemID, address indexed budgetTreasury, bytes32 reason)",
  "event BudgetTreasuryCallFailed(bytes32 indexed itemID, address indexed budgetTreasury, bytes4 indexed selector, bytes reason)",
  "event Dispute(address indexed _arbitrator, uint256 indexed _disputeID, uint256 _metaEvidenceID, uint256 _evidenceGroupID, bytes32 _itemID)",
  "event Evidence(address indexed _arbitrator, uint256 indexed _evidenceGroupID, address indexed _party, string _evidence)",
  "event Initialized(uint64 version)",
  "event ItemStatusChange(bytes32 indexed _itemID, uint256 indexed _requestIndex, uint256 indexed _roundIndex, bool _disputed, bool _resolved, uint8 _itemStatus)",
  "event ItemSubmitted(bytes32 indexed _itemID, address indexed _submitter, uint256 indexed _evidenceGroupID, bytes _data)",
  "event MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence)",
  "event RequestEvidenceGroupID(bytes32 indexed _itemID, uint256 indexed _requestIndex, uint256 indexed _evidenceGroupID)",
  "event RequestSubmitted(bytes32 indexed _itemID, uint256 indexed _requestIndex, uint8 indexed _requestType)",
  "event Ruling(address indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling)",
  "event SubmissionDepositPaid(bytes32 indexed itemID, address indexed payer, uint256 amount)",
  "event SubmissionDepositTransferred(bytes32 indexed itemID, address indexed recipient, uint256 amount, uint8 requestType, uint8 ruling)",
] as const);
