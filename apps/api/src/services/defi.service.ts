/**
 * DeFi Service - Transaction Builder Mode
 * Builds unsigned transactions for developers/institutions to sign with their own wallets.
 */

import { type Address, encodeFunctionData, pad, type Hex } from 'viem';
import { CONTRACTS } from '../config/constants.js';
import { logger } from '../config/logger.js';

// Contract ABIs
const routerABI = [
    {
        type: 'function',
        name: 'swap',
        inputs: [
            {
                name: 'key', type: 'tuple', components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' }
                ]
            },
            {
                name: 'params', type: 'tuple', components: [
                    { name: 'zeroForOne', type: 'bool' },
                    { name: 'amountSpecified', type: 'int256' },
                    { name: 'sqrtPriceLimitX96', type: 'uint160' }
                ]
            },
            { name: 'hookData', type: 'bytes' },
            { name: 'minAmountOut', type: 'uint128' }
        ],
        outputs: [{ name: 'delta', type: 'int256' }],
        stateMutability: 'payable'
    }
] as const;

const positionManagerABI = [
    {
        type: 'function',
        name: 'mint',
        inputs: [
            {
                name: 'poolKey', type: 'tuple', components: [
                    { name: 'currency0', type: 'address' },
                    { name: 'currency1', type: 'address' },
                    { name: 'fee', type: 'uint24' },
                    { name: 'tickSpacing', type: 'int24' },
                    { name: 'hooks', type: 'address' }
                ]
            },
            { name: 'tickLower', type: 'int24' },
            { name: 'tickUpper', type: 'int24' },
            { name: 'liquidity', type: 'uint128' },
            { name: 'hookData', type: 'bytes' }
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
        stateMutability: 'payable'
    }
] as const;

/**
 * Encode hookData for Mode 2 (whitelisted router forwarding).
 * Pads the user address to exactly 20 bytes (right-padded).
 */
function encodeRouterHookData(userAddress: Address): Hex {
    return pad(userAddress, { dir: 'right', size: 20 });
}

const CHAIN_ID = 84532; // Base Sepolia

class DeFiService {
    /**
     * Build an unsigned Swap transaction.
     * The caller signs and broadcasts it with their own wallet.
     */
    async buildSwapTx(params: {
        tokenIn: Address;
        tokenOut: Address;
        amount: string;
        zeroForOne: boolean;
        userAddress: Address;
        slippage?: number; // optional, default 0.5%
    }) {
        logger.info('Building swap transaction', { params });

        const poolKey = {
            currency0: params.zeroForOne ? params.tokenIn : params.tokenOut,
            currency1: params.zeroForOne ? params.tokenOut : params.tokenIn,
            fee: 500,
            tickSpacing: 10,
            hooks: CONTRACTS.complianceHook,
        };

        const MIN_SQRT_PRICE = 4295128739n;
        const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;
        const sqrtPriceLimitX96 = params.zeroForOne
            ? MIN_SQRT_PRICE + 1n
            : MAX_SQRT_PRICE - 1n;

        const hookData = encodeRouterHookData(params.userAddress);

        // Compute minAmountOut from slippage tolerance (default 0.5%).
        // For exact-input swaps we don't know the exact output upfront, so we
        // use the input amount as a rough upper-bound proxy and apply slippage.
        // Passing 0n disables the check entirely (opt-out).
        const slippageBps = Math.round((params.slippage ?? 0.5) * 100); // e.g. 0.5% → 50 bps
        const amountIn = BigInt(params.amount);
        const minAmountOut = slippageBps > 0
            ? (amountIn * BigInt(10_000 - slippageBps)) / 10_000n
            : 0n;

        const calldata: Hex = encodeFunctionData({
            abi: routerABI,
            functionName: 'swap',
            args: [
                poolKey,
                {
                    zeroForOne: params.zeroForOne,
                    amountSpecified: -BigInt(params.amount), // exact input
                    sqrtPriceLimitX96,
                },
                hookData,
                minAmountOut,
            ],
        });

        return {
            success: true,
            transaction: {
                to: CONTRACTS.simpleSwapRouter as string,
                data: calldata,
                value: '0x0',
                chainId: CHAIN_ID,
                gas: '0x1E8480', // 2,000,000
            },
            instructions: {
                description: 'Sign and broadcast this transaction with your wallet (e.g. ethers.js signer.sendTransaction or wagmi writeContract)',
                network: 'Base Sepolia (chainId: 84532)',
                rpcUrl: 'https://sepolia.base.org',
                explorerBase: 'https://sepolia.basescan.org/tx/',
            },
            params: {
                poolKey,
                swapParams: {
                    zeroForOne: params.zeroForOne,
                    amountSpecified: `-${params.amount}`,
                    sqrtPriceLimitX96: sqrtPriceLimitX96.toString(),
                },
                userAddress: params.userAddress,
            }
        };
    }

    /**
     * Build an unsigned Add Liquidity transaction.
     * The caller signs and broadcasts it with their own wallet.
     */
    async buildAddLiquidityTx(params: {
        token0: Address;
        token1: Address;
        amount0: string;
        amount1: string;
        tickLower?: number;
        tickUpper?: number;
        userAddress: Address;
    }) {
        logger.info('Building add liquidity transaction', { params });

        const poolKey = {
            currency0: params.token0,
            currency1: params.token1,
            fee: 3000,
            tickSpacing: 60,
            hooks: CONTRACTS.complianceHook,
        };

        const tickLower = params.tickLower ?? -600;
        const tickUpper = params.tickUpper ?? 600;
        const liquidity = BigInt(params.amount0);
        const hookData = encodeRouterHookData(params.userAddress);

        const calldata: Hex = encodeFunctionData({
            abi: positionManagerABI,
            functionName: 'mint',
            args: [
                poolKey,
                tickLower,
                tickUpper,
                liquidity,
                hookData,
            ],
        });

        return {
            success: true,
            transaction: {
                to: CONTRACTS.positionManager as string,
                data: calldata,
                value: '0x0',
                chainId: CHAIN_ID,
                gas: '0x4C4B40', // 5,000,000
            },
            instructions: {
                description: 'Sign and broadcast this transaction with your wallet (e.g. ethers.js signer.sendTransaction or wagmi writeContract)',
                network: 'Base Sepolia (chainId: 84532)',
                rpcUrl: 'https://sepolia.base.org',
                explorerBase: 'https://sepolia.basescan.org/tx/',
            },
            params: {
                poolKey,
                position: { tickLower, tickUpper, liquidity: liquidity.toString() },
                userAddress: params.userAddress,
            }
        };
    }

    /**
     * Legacy execute mode (requires VERIFIER_PRIVATE_KEY configured on server)
     * Kept for backwards compatibility / demo use cases.
     */
    async swap(params: {
        tokenIn: Address;
        tokenOut: Address;
        amount: string;
        zeroForOne: boolean;
        userAddress: Address;
    }) {
        return this.buildSwapTx(params);
    }

    async addLiquidity(params: {
        token0: Address;
        token1: Address;
        amount0: string;
        amount1: string;
        userAddress: Address;
    }) {
        return this.buildAddLiquidityTx(params);
    }
}

export const defiService = new DeFiService();
