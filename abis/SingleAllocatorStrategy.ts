import { parseAbi } from "viem";

/** Minimal ABI for SingleAllocatorStrategy (events only). */
export const SingleAllocatorStrategyAbi = parseAbi([
  "event AllocatorChanged(address indexed oldAllocator, address indexed newAllocator)",
] as const);
