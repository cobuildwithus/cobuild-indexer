import { contracts as revnet } from "./addresses.revnet";
import { contracts as cobuild } from "./addresses.cobuild";

export const contracts = {
  ...revnet,
  ...cobuild,
} as const;
