import { parseAbi } from "viem";

/**
 * Minimal ABI for the CoBuild Flow contracts (events only).
 *
 * NOTE: Signatures are written as Solidity event signatures so viem can derive types.
 * Keep this file in sync with `IFlowEvents` in your contracts.
 */
export const FlowAbi = parseAbi([
  "event FlowInitialized(address indexed initialOwner, address indexed initialFlowImpl, address indexed initialRecipientManager, address superToken, address distributionPool, uint32 managerRewardPoolFlowRatePercent, address flowOperator, address sweeper, address connectPoolAdmin, address strategy)",
  "event RecipientCreated(bytes32 indexed recipientId, address indexed recipient, (address recipient, uint32 recipientIndexPlusOne, bool isRemoved, uint8 recipientType, (string title, string description, string image, string tagline, string url) metadata) recipientInfo)",
  "event FlowRecipientCreated(bytes32 indexed recipientId, address indexed recipient, (address recipient, address distributionPool, uint32 managerRewardPoolFlowRatePercent, address strategy) flowRecipient)",
  "event RecipientRemoved(address indexed recipient, bytes32 indexed recipientId)",
  "event AllocationCommitted(address indexed strategy, uint256 indexed allocationKey, bytes32 commitment, uint256 weight, bytes packedSnapshot)",
  "event MetadataSet(bytes32 indexed recipientId, (string title, string description, string image, string tagline, string url) metadata)",
  "event FlowRateIncreased(address indexed caller, uint256 amountPulled, int96 oldFlowRate, int96 newFlowRate)",
  "event FlowRateIncreaseNoop(address indexed caller, uint256 amountPulled, int96 oldFlowRate)",
  "event FlowRateDecreased(address indexed caller, uint256 amount, int96 oldFlowRate, int96 newFlowRate)",
  "event TargetOutflowRateUpdated(int96 oldTargetOutflowRate, int96 newTargetOutflowRate, address caller)",
  "event TargetOutflowRefreshFailed(int96 targetOutflowRate, address caller, bytes reason)",
  "event SuperTokenSwept(address indexed sweeper, uint256 amount)",
] as const);
