/**
 * Contract addresses and basic definitions for the frontend
 * Values match the Base Sepolia deployments from API constants.
 */

// Deployed contract addresses on Base Sepolia
export const ADDRESSES = {
    SWAP_ROUTER: '0x851A12a1A0A5670F4D8A74aD0f3534825EC5e7c2',
    COMPLIANCE_HOOK: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80',
    POOL_MANAGER: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    WETH: '0x4200000000000000000000000000000000000006',
} as const;
