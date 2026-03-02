import { parseAbi } from "viem";

/**
 * Event ABI for GoalStakeVault.
 * Generated from Foundry artifact in ../v1-core/out.
 */
export const GoalStakeVaultAbi = parseAbi([
  "event AllocationSyncFailed(address indexed account, address indexed target, bytes4 indexed selector, bytes reason)",
  "event CobuildStaked(address indexed user, uint256 amount, uint256 weightDelta)",
  "event CobuildWithdrawn(address indexed user, address indexed to, uint256 amount)",
  "event GoalResolved()",
  "event GoalStaked(address indexed user, uint256 amount, uint256 weightDelta)",
  "event GoalWithdrawn(address indexed user, address indexed to, uint256 amount)",
  "event JurorDelegateSet(address indexed juror, address indexed delegate)",
  "event JurorExitFinalized(address indexed juror, uint256 goalAmount, uint256 cobuildAmount, uint256 weightDelta)",
  "event JurorExitRequested(address indexed juror, uint256 goalAmount, uint256 cobuildAmount, uint64 requestedAt, uint64 availableAt)",
  "event JurorOptedIn(address indexed juror, uint256 goalAmount, uint256 cobuildAmount, uint256 weightDelta, address indexed delegate)",
  "event JurorSlashed(address indexed juror, uint256 requestedWeight, uint256 appliedWeight, uint256 goalAmount, uint256 cobuildAmount, address indexed recipient)",
  "event JurorSlasherSet(address indexed slasher)",
  "event UnderwriterSlashed(address indexed underwriter, uint256 requestedWeight, uint256 appliedWeight, uint256 goalAmount, uint256 cobuildAmount, address indexed recipient)",
  "event UnderwriterSlasherSet(address indexed slasher)",
  "event UnderwriterWithdrawalPrepared(address indexed underwriter, uint256 nextBudgetIndex, uint256 budgetCount, bool complete)",
] as const);
