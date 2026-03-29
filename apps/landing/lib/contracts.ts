/**
 * Contract addresses and basic definitions for the frontend.
 * Reads from NEXT_PUBLIC_* env vars with Base Sepolia defaults.
 */

export const ADDRESSES = {
    SWAP_ROUTER: (process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891') as `0x${string}`,
    COMPLIANCE_HOOK: (process.env.NEXT_PUBLIC_COMPLIANCE_HOOK_ADDRESS || '0xe633220f15932428FcA60A1A2C2C48797A180A80') as `0x${string}`,
    POOL_MANAGER: (process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408') as `0x${string}`,
    SESSION_MANAGER: (process.env.NEXT_PUBLIC_SESSION_MANAGER_ADDRESS || '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2') as `0x${string}`,
    REGISTRY: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD') as `0x${string}`,
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
    WETH: (process.env.NEXT_PUBLIC_WETH_ADDRESS || '0x4200000000000000000000000000000000000006') as `0x${string}`,
    mUSD: (process.env.NEXT_PUBLIC_MUSD_ADDRESS || '0xdd3d112a48906807c4b73c94ed884552427e4cf9') as `0x${string}`,
    mTBILL: (process.env.NEXT_PUBLIC_MTBILL_ADDRESS || '0xfb080423cedd4ca56da3f60a4b901f51846459ae') as `0x${string}`,
} as const;
