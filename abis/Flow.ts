import { parseAbi } from "viem";

/**
 * Event ABI for Flow.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const FlowAbi = parseAbi([
  "event AllocationCommitted(address indexed strategy, uint256 indexed allocationKey, bytes32 commit, uint256 weight)",
  "event AllocationSnapshotUpdated(address indexed strategy, uint256 indexed allocationKey, bytes32 commit, uint256 weight, uint8 snapshotVersion, bytes packedSnapshot)",
  "event ChildFlowDeployed(bytes32 indexed recipientId, address indexed recipient, address indexed strategy, address recipientAdmin, address flowOperator, address sweeper, address managerRewardPool)",
  "event FlowInitialized(address indexed recipientAdmin, address indexed superToken, address indexed flowImplementation, address flowOperator, address sweeper, address connectPoolAdmin, address managerRewardPool, address allocationPipeline, address parent, address distributionPool, uint32 managerRewardPoolFlowRatePpm, address strategy)",
  "event FlowRateDecreased(address indexed caller, int96 oldRate, int96 newRate)",
  "event FlowRateIncreaseNoop(address indexed caller, int96 requestedAmount, uint8 reason)",
  "event FlowRateIncreased(address indexed caller, int96 oldRate, int96 newRate, uint256 amountPulled)",
  "event FlowRecipientCreated(bytes32 indexed recipientId, address indexed recipient, address distributionPool, uint32 managerRewardPoolFlowRatePpm)",
  "event Initialized(uint64 version)",
  "event MetadataSet((string title, string description, string image, string tagline, string url) metadata)",
  "event RecipientCreated(bytes32 indexed recipientId, (address recipient, uint32 recipientIndexPlusOne, bool isRemoved, uint8 recipientType, (string title, string description, string image, string tagline, string url) metadata) recipient, address indexed approvedBy)",
  "event RecipientRemoved(address indexed recipient, bytes32 indexed recipientId)",
  "event SuperTokenSwept(address indexed caller, address indexed to, uint256 amount)",
  "event TargetOutflowRateUpdated(address indexed caller, int96 oldRate, int96 newRate)",
  "event TargetOutflowRefreshFailed(int96 targetOutflowRate, bytes reason)",
] as const);
