import { parseAbi } from "viem";

/**
 * Event ABI for SingleAllocatorStrategy.
 * Generated from Foundry artifact in ../protocol/out.
 */
export const SingleAllocatorStrategyAbi = parseAbi([
  "event AllocatorChanged(address indexed oldAllocator, address indexed newAllocator)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
] as const);
