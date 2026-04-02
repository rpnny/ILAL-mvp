/**
 * DeFi Controller - Unsigned Transaction Builder
 *
 * Returns unsigned tx data for developers/institutions to sign with their own wallets.
 * Includes a `preflight` field indicating whether the on-chain session is active,
 * so callers know upfront if the transaction will revert.
 *
 * Query param: ?requireActiveSession=true  →  returns 412 when session is inactive.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Address } from 'viem';
import { defiService } from '../services/defi.service.js';
import { blockchainService } from '../services/blockchain.service.js';
import { logger } from '../config/logger.js';

// ── Helpers ──────────────────────────────────────────────────

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const positiveIntString = z.string().regex(
  /^[1-9]\d*$/,
  'Must be a positive integer string (no leading zeros, no decimals)',
);

const nonNegativeIntString = z.string().regex(
  /^(0|[1-9]\d*)$/,
  'Must be a non-negative integer string',
);

// ── Swap Schema ──────────────────────────────────────────────

const swapSchema = z.object({
  tokenIn:     z.string().regex(ETH_ADDRESS, 'Invalid tokenIn address'),
  tokenOut:    z.string().regex(ETH_ADDRESS, 'Invalid tokenOut address'),
  amount:      positiveIntString,
  zeroForOne:  z.boolean(),
  userAddress: z.string().regex(ETH_ADDRESS, 'Invalid userAddress'),
}).superRefine((data, ctx) => {
  if (data.tokenIn.toLowerCase() === data.tokenOut.toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tokenIn and tokenOut must be different addresses',
      path: ['tokenOut'],
    });
  }

  const expectedZeroForOne = data.tokenIn.toLowerCase() < data.tokenOut.toLowerCase();
  if (data.zeroForOne !== expectedZeroForOne) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `zeroForOne should be ${expectedZeroForOne} for the given token ordering (tokenIn ${expectedZeroForOne ? '<' : '>'} tokenOut)`,
      path: ['zeroForOne'],
    });
  }
});

// ── Liquidity Schema ─────────────────────────────────────────

const liquiditySchema = z.object({
  token0:      z.string().regex(ETH_ADDRESS, 'Invalid token0 address'),
  token1:      z.string().regex(ETH_ADDRESS, 'Invalid token1 address'),
  amount0:     nonNegativeIntString,
  amount1:     nonNegativeIntString,
  tickLower:   z.number().int().optional(),
  tickUpper:   z.number().int().optional(),
  userAddress: z.string().regex(ETH_ADDRESS, 'Invalid userAddress'),
}).superRefine((data, ctx) => {
  if (data.token0.toLowerCase() >= data.token1.toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'token0 must be less than token1 (Uniswap sort order)',
      path: ['token0'],
    });
  }

  if (data.amount0 === '0' && data.amount1 === '0') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one of amount0 or amount1 must be greater than 0',
      path: ['amount0'],
    });
  }

  if (data.tickLower !== undefined && data.tickUpper !== undefined && data.tickLower >= data.tickUpper) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tickLower must be less than tickUpper',
      path: ['tickLower'],
    });
  }
});

// ── Preflight check ──────────────────────────────────────────

interface PreflightResult {
  sessionActive: boolean;
  canBroadcastSafely: boolean;
  warning?: string;
  hint?: string;
}

async function checkPreflight(userAddress: string): Promise<PreflightResult> {
  try {
    const active = await blockchainService.isSessionActive(userAddress as Address);
    if (active) {
      return { sessionActive: true, canBroadcastSafely: true };
    }
    return {
      sessionActive: false,
      canBroadcastSafely: false,
      warning: 'No active compliance session. Transaction will revert on-chain.',
      hint: 'Complete the ZK proof flow first: POST /api/v1/verify → session activation. See https://ilal.tech/docs/quickstart',
    };
  } catch (err: any) {
    logger.warn('Preflight session check failed', { error: err.message, userAddress });
    return {
      sessionActive: false,
      canBroadcastSafely: false,
      warning: 'Could not verify compliance session status on-chain.',
      hint: 'The RPC call failed. Session may or may not be active.',
    };
  }
}

// ── Swap endpoint ────────────────────────────────────────────

export async function executeSwap(req: Request, res: Response): Promise<void> {
  try {
    const params = swapSchema.parse(req.body);

    logger.info('Swap request received', { user: params.userAddress, authMethod: req.authMethod });

    const preflight = await checkPreflight(params.userAddress);

    if (req.query.requireActiveSession === 'true' && !preflight.sessionActive) {
      res.status(412).json({
        error: 'Precondition Failed',
        code: 'SESSION_NOT_ACTIVE',
        message: `No active compliance session for ${params.userAddress}`,
        hint: preflight.hint,
      });
      return;
    }

    const result = await defiService.swap({
      tokenIn: params.tokenIn as Address,
      tokenOut: params.tokenOut as Address,
      amount: params.amount,
      zeroForOne: params.zeroForOne,
      userAddress: params.userAddress as Address,
    });

    if (!result.success) {
      res.status(400).json({ ...result, preflight });
      return;
    }

    res.json({ ...result, preflight, authMethod: req.authMethod });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_PARAMS',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    logger.error('Swap controller error', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// ── Liquidity endpoint ───────────────────────────────────────

export async function addLiquidity(req: Request, res: Response): Promise<void> {
  try {
    const params = liquiditySchema.parse(req.body);

    logger.info('Add Liquidity request received', { user: params.userAddress, authMethod: req.authMethod });

    const preflight = await checkPreflight(params.userAddress);

    if (req.query.requireActiveSession === 'true' && !preflight.sessionActive) {
      res.status(412).json({
        error: 'Precondition Failed',
        code: 'SESSION_NOT_ACTIVE',
        message: `No active compliance session for ${params.userAddress}`,
        hint: preflight.hint,
      });
      return;
    }

    const result = await defiService.buildAddLiquidityTx({
      token0: params.token0 as Address,
      token1: params.token1 as Address,
      amount0: params.amount0,
      amount1: params.amount1,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      userAddress: params.userAddress as Address,
    });

    if (!result.success) {
      res.status(400).json({ ...result, preflight });
      return;
    }

    res.json({ ...result, preflight, authMethod: req.authMethod });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation Error',
        code: 'INVALID_PARAMS',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    logger.error('Liquidity controller error', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
