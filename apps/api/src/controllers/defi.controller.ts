/**
 * DeFi Controller - Unsigned Transaction Builder
 * Returns unsigned tx data for developers/institutions to sign with their own wallets.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Address } from 'viem';
import { defiService } from '../services/defi.service.js';
import { logger } from '../config/logger.js';

// Input Validation Schemas
const swapSchema = z.object({
    tokenIn: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    tokenOut: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    amount: z.string(), // Decimal string
    zeroForOne: z.boolean(),
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const liquiditySchema = z.object({
    token0: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    token1: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    amount0: z.string(),
    amount1: z.string(),
    tickLower: z.number().int().optional(),
    tickUpper: z.number().int().optional(),
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

/**
 * Build Swap Transaction (unsigned)
 * POST /api/v1/defi/swap
 * Returns: { transaction: { to, data, value, chainId, gas }, instructions }
 */
export async function executeSwap(req: Request, res: Response): Promise<void> {
    try {
        const params = swapSchema.parse(req.body);

        logger.info('Swap request received', { user: params.userAddress });

        const result = await defiService.swap({
            tokenIn: params.tokenIn as Address,
            tokenOut: params.tokenOut as Address,
            amount: params.amount,
            zeroForOne: params.zeroForOne,
            userAddress: params.userAddress as Address
        });

        if (!result.success) {
            res.status(400).json(result);
            return;
        }

        res.json(result);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request', details: error.errors });
            return;
        }
        logger.error('Swap controller error', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

/**
 * Build Add Liquidity Transaction (unsigned)
 * POST /api/v1/defi/liquidity
 * Returns: { transaction: { to, data, value, chainId, gas }, instructions }
 */
export async function addLiquidity(req: Request, res: Response): Promise<void> {
    try {
        const params = liquiditySchema.parse(req.body);

        logger.info('Add Liquidity request received', { user: params.userAddress });

        const result = await defiService.buildAddLiquidityTx({
            token0: params.token0 as Address,
            token1: params.token1 as Address,
            amount0: params.amount0,
            amount1: params.amount1,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            userAddress: params.userAddress as Address
        });

        if (!result.success) {
            res.status(400).json(result);
            return;
        }

        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request', details: error.errors });
            return;
        }
        logger.error('Liquidity controller error', { error: error.message });
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}
