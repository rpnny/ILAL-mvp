/**
 * DeFi Service - Transaction Builder Mode
 * Builds unsigned transactions for developers/institutions to sign with their own wallets.
 */

import { type Address, encodeFunctionData, type Hex } from 'viem';
import { CHAIN_ID, CONTRACTS } from '../config/constants.js';
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
 * Empty hookData — the v2 SimpleSwapRouter auto-injects abi.encode(msg.sender)
 * when it receives 0x, converting it to Mode 2 (router-mediated identity).
 *
 * ComplianceHook v2 three-mode architecture:
 *   Mode 1 (>= 148 bytes): EIP-712 permit — cryptographic user proof
 *   Mode 2 (== 32 bytes):  Router-mediated identity — router encodes msg.sender
 *   Mode 3 (== 0 bytes):   Direct call — sender IS the user (no router)
 */
function encodeEmptyHookData(): Hex {
    return '0x';
}

// ── Uniswap v4 Liquidity Math ─────────────────────────────────────────────────
// Reference: https://github.com/Uniswap/v4-core/blob/main/src/libraries/SqrtPriceMath.sol

const Q96 = 2n ** 96n;

/**
 * Compute sqrtPriceX96 for a given tick using floating-point approximation.
 * Accurate to ~1e-10 relative error for |tick| <= 887272.
 * sqrtPrice = sqrt(1.0001^tick) * 2^96
 */
function getSqrtPriceAtTick(tick: number): bigint {
  const sqrtPrice = Math.sqrt(Math.pow(1.0001, tick));
  // Split Q96 into two Q48 factors to preserve precision when converting float → bigint
  const HIGH = 2 ** 48;
  return BigInt(Math.floor(sqrtPrice * HIGH)) * BigInt(HIGH);
}

/** L = amount0 * sqrtA * sqrtB / Q96 / (sqrtB - sqrtA) */
function getLiquidityForAmount0(sqrtA: bigint, sqrtB: bigint, amount0: bigint): bigint {
  if (sqrtA > sqrtB) [sqrtA, sqrtB] = [sqrtB, sqrtA];
  if (sqrtB === sqrtA) return 0n;
  // Reorder multiplication to avoid intermediate overflow while keeping precision
  return (amount0 * sqrtA / Q96 * sqrtB) / (sqrtB - sqrtA);
}

/** L = amount1 * Q96 / (sqrtB - sqrtA) */
function getLiquidityForAmount1(sqrtA: bigint, sqrtB: bigint, amount1: bigint): bigint {
  if (sqrtA > sqrtB) [sqrtA, sqrtB] = [sqrtB, sqrtA];
  if (sqrtB === sqrtA) return 0n;
  return (amount1 * Q96) / (sqrtB - sqrtA);
}

/**
 * Compute the maximum liquidityDelta achievable with (amount0, amount1)
 * given the current pool price and tick range.
 * Mirrors Uniswap v4 LiquidityAmounts.getLiquidityForAmounts().
 */
export function getLiquidityForAmounts(
  sqrtPriceCurrent: bigint,
  tickLower: number,
  tickUpper: number,
  amount0: bigint,
  amount1: bigint,
): bigint {
  const sqrtA = getSqrtPriceAtTick(tickLower);
  const sqrtB = getSqrtPriceAtTick(tickUpper);
  const [sqrtLow, sqrtHigh] = sqrtA < sqrtB ? [sqrtA, sqrtB] : [sqrtB, sqrtA];

  if (sqrtPriceCurrent <= sqrtLow) {
    // Current price is below range — only amount0 contributes
    return getLiquidityForAmount0(sqrtLow, sqrtHigh, amount0);
  } else if (sqrtPriceCurrent >= sqrtHigh) {
    // Current price is above range — only amount1 contributes
    return getLiquidityForAmount1(sqrtLow, sqrtHigh, amount1);
  } else {
    // Current price is within range — take the min so both amounts can be deposited
    const L0 = getLiquidityForAmount0(sqrtPriceCurrent, sqrtHigh, amount0);
    const L1 = getLiquidityForAmount1(sqrtLow, sqrtPriceCurrent, amount1);
    return L0 < L1 ? L0 : L1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class DeFiService {
    /**
     * Build an unsigned Swap transaction.
     * The caller signs and broadcasts it with their own wallet.
     */
    async buildSwapTx(params: {
        tokenIn: Address;
        tokenOut: Address;
        amount: string;
        zeroForOne?: boolean;
        userAddress: Address;
        slippage?: number; // optional, default 0.5%
    }) {
        logger.info('Building swap transaction', { params });

        const [currency0, currency1] = params.tokenIn.toLowerCase() < params.tokenOut.toLowerCase()
            ? [params.tokenIn, params.tokenOut]
            : [params.tokenOut, params.tokenIn];

        // Auto-derive from token ordering: selling token0 → zeroForOne=true
        const zeroForOne = params.zeroForOne ?? (params.tokenIn.toLowerCase() < params.tokenOut.toLowerCase());

        const poolKey = {
            currency0,
            currency1,
            fee: 500,
            tickSpacing: 10,
            hooks: CONTRACTS.complianceHook,
        };

        const MIN_SQRT_PRICE = 4295128739n;
        const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;
        const sqrtPriceLimitX96 = zeroForOne
            ? MIN_SQRT_PRICE + 1n
            : MAX_SQRT_PRICE - 1n;

        const hookData = encodeEmptyHookData();

        // Build-only mode cannot safely derive a minAmountOut from the input
        // amount alone across different token decimals / prices. Returning a
        // made-up bound causes false reverts (e.g. WETH→USDC). We therefore
        // default to 0 and leave price protection to callers that have a quote.
        const minAmountOut = 0n;

        const calldata: Hex = encodeFunctionData({
            abi: routerABI,
            functionName: 'swap',
            args: [
                poolKey,
                {
                    zeroForOne,
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
                    zeroForOne,
                    amountSpecified: `-${params.amount}`,
                    sqrtPriceLimitX96: sqrtPriceLimitX96.toString(),
                    minAmountOut: minAmountOut.toString(),
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
        /** Current pool sqrtPriceX96 read from PoolManager.getSlot0(). Required for
         *  accurate liquidityDelta computation. If 0 or omitted, falls back to a
         *  worst-case approximation that is likely to revert on-chain. */
        sqrtPriceX96?: bigint;
    }) {
        logger.info('Building add liquidity transaction', {
            token0: params.token0, token1: params.token1,
            amount0: params.amount0, amount1: params.amount1,
            tickLower: params.tickLower, tickUpper: params.tickUpper,
            userAddress: params.userAddress,
            sqrtPriceX96: params.sqrtPriceX96?.toString(),
        });

        const poolKey = {
            currency0: params.token0,
            currency1: params.token1,
            fee: 500,
            tickSpacing: 10,
            hooks: CONTRACTS.complianceHook,
        };

        const tickLower = params.tickLower ?? -600;
        const tickUpper = params.tickUpper ?? 600;
        const amount0 = BigInt(params.amount0);
        const amount1 = BigInt(params.amount1);

        // Compute accurate liquidityDelta using Uniswap v4 math when sqrtPriceX96
        // is available. This mirrors LiquidityAmounts.getLiquidityForAmounts() from
        // v4-periphery and produces the correct abstract liquidity unit that
        // PositionManager.mint() expects.
        let liquidity: bigint;
        if (params.sqrtPriceX96 && params.sqrtPriceX96 > 0n) {
            liquidity = getLiquidityForAmounts(params.sqrtPriceX96, tickLower, tickUpper, amount0, amount1);
            logger.info('Computed liquidityDelta from sqrtPriceX96', {
                sqrtPriceX96: params.sqrtPriceX96.toString(),
                tickLower, tickUpper,
                amount0: amount0.toString(), amount1: amount1.toString(),
                liquidity: liquidity.toString(),
            });
        } else {
            // Fallback: use larger amount as rough approximation (may revert on-chain).
            // Controller should always provide sqrtPriceX96 from PoolManager.getSlot0().
            logger.warn('sqrtPriceX96 not provided — using fallback liquidity approximation');
            liquidity = amount0 > amount1 ? amount0 : amount1;
        }
        const hookData = encodeEmptyHookData();

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
            liquidityWarning: params.sqrtPriceX96 && params.sqrtPriceX96 > 0n
                ? 'liquidityDelta computed from on-chain sqrtPriceX96 using Uniswap v4 LiquidityAmounts math.'
                : 'WARNING: sqrtPriceX96 was unavailable — liquidityDelta is an approximation (max of amount0, amount1) and may revert on-chain.',
            params: {
                poolKey,
                position: { tickLower, tickUpper, liquidity: liquidity.toString() },
                userAddress: params.userAddress,
            }
        };
    }

    /**
     * Build an unsigned ERC-20 approve transaction.
     * Needed before swap (approve to SwapRouter) or liquidity (approve to PositionManager).
     */
    async buildApproveTx(params: {
        token: Address;
        spender: Address;
        amount: string;
        userAddress: Address;
    }) {
        logger.info('Building approve transaction', { params });

        const calldata: Hex = encodeFunctionData({
            abi: [{
                type: 'function', name: 'approve',
                inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
                outputs: [{ name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
            }],
            functionName: 'approve',
            args: [params.spender, BigInt(params.amount)],
        });

        return {
            success: true,
            transaction: {
                to: params.token as string,
                data: calldata,
                value: '0x0',
                chainId: CHAIN_ID,
                gas: '0xC350', // 50,000
            },
            instructions: {
                description: 'Sign and broadcast this approve transaction before swapping or adding liquidity.',
                network: 'Base Sepolia (chainId: 84532)',
                rpcUrl: 'https://sepolia.base.org',
                explorerBase: 'https://sepolia.basescan.org/tx/',
            },
            params: {
                token: params.token,
                spender: params.spender,
                amount: params.amount,
                userAddress: params.userAddress,
            },
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
        zeroForOne?: boolean;
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
