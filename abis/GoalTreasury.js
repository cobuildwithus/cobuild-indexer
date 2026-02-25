import { parseAbi } from "viem";
/** Minimal ABI for GoalTreasury (events only). */
export const GoalTreasuryAbi = parseAbi([
    "event GoalConfigured(bytes32 indexed recipientId, address goalToken, address cobuildToken, address indexed stakeVault, address indexed rewardEscrow, address indexed hook, address strategy, address parentFlow)",
    "event HookFundingRecorded(uint256 amount, address indexed token)",
    "event DonationRecorded(address indexed donor, uint256 amount, address indexed token, bytes32 memo, bytes metadata)",
    "event FlowRateSynced(uint256 weight, int96 oldFlowRate, int96 newFlowRate, address caller)",
    "event ResidualSettled(uint256 amount, address indexed token, address indexed beneficiary)",
    "event GoalFinalized()",
    "event TerminalSideEffectFailed(bytes4 selector, bytes reason)",
    "event StateTransition(uint8 indexed fromState, uint8 indexed toState)",
    "event SuccessRewardsFinalized(uint256 goalAmount, uint256 cobuildAmount, uint256 totalGoalStaked, uint256 totalCobuildStaked)",
    "event SuccessAssertionRegistered(bytes32 indexed itemID, bytes32 assertionId)",
    "event SuccessAssertionCleared(bytes32 indexed itemID, bytes32 assertionId)",
    "event HookFundingDeferred(uint256 amount, address indexed token)",
    "event HookDeferredFundingSettled(uint256 amount, address indexed token, address indexed beneficiary)",
    "event JurorSlasherConfigured(address indexed slasher)",
]);
