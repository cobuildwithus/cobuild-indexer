import { parseAbi } from "viem";

/**
 * Event ABI for PremiumEscrow.
 * Generated from Foundry artifact in ../v1-core/out.
 */
export const PremiumEscrowAbi = parseAbi([
  "event AccountCheckpointed(address indexed account, uint256 previousCoverage, uint256 currentCoverage, uint256 claimableAmount, uint256 exposureIntegral, uint256 totalCoverage)",
  "event Claimed(address indexed account, address indexed to, uint256 amount)",
  "event Closed(uint8 indexed finalState, uint64 activatedAt, uint64 closedAt)",
  "event CreditIndexed(uint256 indexed distributedCredit, uint256 indexed totalCoverage, uint256 indexDelta, uint256 newCreditIndex)",
  "event Initialized(uint64 version)",
  "event LateResidualSettlementFailed(address indexed goalTreasury, bytes reason)",
  "event ManagerRewardPoolConnected(address indexed pool, uint256 baselineReceived)",
  "event OrphanPremiumRecycled(address indexed destination, uint256 amount)",
  "event PremiumIndexed(uint256 indexed distributedPremium, uint256 indexed totalCoverage, uint256 indexDelta, uint256 newPremiumIndex)",
  "event UnclaimablePremiumSwept(address indexed goalFlow, uint256 amount)",
  "event UnderwriterSlashCalculated(address indexed underwriter, bool usedCreditFormula, uint256 creditDrawn, uint256 premiumEarned, uint256 coverageLambda, uint256 duration, uint256 rawSlashWeight, uint256 capWeight, uint256 finalSlashWeight)",
  "event UnderwriterSlashed(address indexed underwriter, uint256 exposureIntegral, uint256 slashWeight, uint256 duration)",
] as const);
