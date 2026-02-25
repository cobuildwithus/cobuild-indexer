import { parseAbi } from "viem";

/** Minimal ABI for GoalStakeVault (events only). */
export const GoalStakeVaultAbi = parseAbi([
  "event GoalStaked(address indexed account, uint256 amount, uint256 totalStaked)",
  "event CobuildStaked(address indexed account, uint256 amount, uint256 totalStaked)",
  "event GoalWithdrawn(address indexed account, uint256 amount, uint256 totalWithdrawn)",
  "event CobuildWithdrawn(address indexed account, uint256 amount, uint256 totalWithdrawn)",
  "event RentPaid(address indexed payer, uint256 amount, uint64 startTime, uint64 endTime)",
  "event GoalResolved()",
  "event JurorOptedIn(address indexed juror)",
  "event JurorExitRequested(address indexed juror, uint64 exitTime)",
  "event JurorExitFinalized(address indexed juror)",
  "event JurorDelegateSet(address indexed juror, address indexed delegate)",
  "event JurorSlasherSet(address indexed slasher)",
  "event JurorSlashed(address indexed juror, uint256 penalty, address indexed beneficiary)",
] as const);
