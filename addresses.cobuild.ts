import { baseContracts } from "@cobuild/wire";

export const contracts = {
  CobuildSwap: baseContracts.CobuildSwap,
  CobuildSwapImpl: baseContracts.CobuildSwapImpl,
  CobuildToken: baseContracts.CobuildToken,
  USDCBase: baseContracts.USDCBase,
  CreatorCoinImpl: baseContracts.CreatorCoinImpl,
  UniswapStateView: baseContracts.UniswapStateView,
  ZoraToken: baseContracts.ZoraToken,
  UniswapV3ZoraUsdcPool: baseContracts.UniswapV3ZoraUsdcPool,
  FlowDeployerImpl: baseContracts.FlowDeployerImpl,
  FlowDeployer: baseContracts.FlowDeployer,
  USDCPermitAdmin: baseContracts.USDCPermitAdmin,
  CobuildFlowManager: baseContracts.CobuildFlowManager,
  CobuildFlowAllocator: baseContracts.CobuildFlowAllocator,
  CustomFlowImpl: baseContracts.CustomFlowImpl,
  ClankerFactoryV4Base: "0xE85A59c628F7d27878ACeB4bf3b35733630083a9",
  ClankerFactoryV3_1Base: "0x2A787b2362021cC3eEa3C24C4748a6cD5B687382",
  ClankerFactoryV3_0Base: "0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E",
  ClankerFactoryV2_0Base: "0x732560fa1d1A76350b1A500155BA978031B53833",
  ClankerFactoryV1_0Base: "0x9B84fcE5Dcd9a38d2D01d5D72373F6b6b067c3e1",
  SocialDexDeployerBase: "0x250c9FB2b411B48273f69879007803790A6AeA47",
} as const
