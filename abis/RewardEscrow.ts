import { parseAbi } from "viem";

/** Minimal ABI for RewardEscrow (events only). */
export const RewardEscrowAbi = parseAbi([
  "event RewardEscrowFinalized(uint256 goalReward, uint256 cobuildReward, uint256 totalGoalStaked, uint256 totalCobuildStaked, address goalToken, address cobuildToken)",
  "event GoalSuperTokenUnwrapped(uint256 amountIn, uint256 amountOut)",
  "event Claimed(address indexed account, uint256 amount, bool isGoalToken)",
  "event FailedRewardsSwept(address indexed beneficiary, uint256 amount)",
  "event FailedCobuildRewardsSwept(address indexed beneficiary, uint256 amount)",
] as const);
