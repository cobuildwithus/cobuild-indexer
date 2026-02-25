import { parseAbi } from "viem";

/**
 * Event ABI for RewardEscrow.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const RewardEscrowAbi = parseAbi([
  "event Claimed(address indexed account, address indexed to, uint256 rewardAmount, uint256 cobuildAmount, uint256 goalRentAmount, uint256 cobuildRentAmount)",
  "event FailedCobuildRewardsSwept(address indexed to, uint256 amount)",
  "event FailedRewardsSwept(address indexed to, uint256 amount)",
  "event GoalSuperTokenUnwrapped(address indexed caller, uint256 superTokenAmount, uint256 rewardTokenAmount)",
  "event RewardEscrowFinalized(uint8 indexed finalState, uint256 rewardPoolSnapshot, uint256 cobuildPoolSnapshot, uint256 totalPointsSnapshot, uint64 goalFinalizedAt)",
] as const);
