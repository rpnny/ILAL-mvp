/**
 * Contract addresses and basic definitions for the frontend.
 * Reads from NEXT_PUBLIC_* env vars with Base Sepolia defaults.
 */

export const ADDRESSES = {
    SWAP_ROUTER: (process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS || '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891') as `0x${string}`,
    COMPLIANCE_HOOK: (process.env.NEXT_PUBLIC_COMPLIANCE_HOOK_ADDRESS || '0xe633220f15932428FcA60A1A2C2C48797A180A80') as `0x${string}`,
    POOL_MANAGER: (process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS || '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408') as `0x${string}`,
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
    WETH: (process.env.NEXT_PUBLIC_WETH_ADDRESS || '0x4200000000000000000000000000000000000006') as `0x${string}`,
} as const;
