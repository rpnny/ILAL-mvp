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
import { type Address, getAddress } from 'viem';
import { defiService } from '../services/defi.service.js';
import { blockchainService } from '../services/blockchain.service.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { CONTRACTS, DEMO_TOKENS } from '../config/constants.js';
import { sendError } from '../middleware/error-envelope.js';

// ── Supported token whitelist (lowercase for comparison) ─────

const SUPPORTED_TOKENS = new Set(
  Object.values(DEMO_TOKENS).map(a => a.toLowerCase()),
);

function isTokenSupported(addr: string): boolean {
  return SUPPORTED_TOKENS.has(addr.toLowerCase());
}

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
  zeroForOne:  z.boolean().optional(),
  userAddress: z.string().regex(ETH_ADDRESS, 'Invalid userAddress'),
}).superRefine((data, ctx) => {
  if (data.tokenIn.toLowerCase() === data.tokenOut.toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tokenIn and tokenOut must be different addresses',
      path: ['tokenOut'],
    });
  }

  if (data.zeroForOne !== undefined) {
    const expectedZeroForOne = data.tokenIn.toLowerCase() < data.tokenOut.toLowerCase();
    if (data.zeroForOne !== expectedZeroForOne) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `zeroForOne should be ${expectedZeroForOne} for the given token ordering (tokenIn ${expectedZeroForOne ? '<' : '>'} tokenOut). You can omit this field to let the API derive it automatically.`,
        path: ['zeroForOne'],
      });
    }
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

async function getInstitutionOwner(userAddress: string): Promise<string | null> {
  const institution = await prisma.institution.findUnique({
    where: { walletAddress: userAddress },
    select: { userId: true },
  });

  return institution?.userId ?? null;
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
    const userId = req.apiKey?.userId ?? req.user?.userId;
    // Default: block if session inactive. Pass ?buildOnly=true to get unsigned TX without session check.
    const buildOnly = req.query?.buildOnly === 'true';

    logger.info('Swap request received', { user: params.userAddress, authMethod: req.authMethod });

    if (userId) {
      const ownerUserId = await getInstitutionOwner(params.userAddress);
      if (ownerUserId && ownerUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          code: 'INSTITUTION_OWNERSHIP_MISMATCH',
          message: `The wallet ${params.userAddress} is linked to another ILAL account`,
          hint: 'In mock/demo mode, call POST /api/v1/onboarding/register again with the same wallet to rebind it to the current account.',
          signerRequirement: 'The unsigned transaction must be signed by the same wallet address as userAddress.',
        });
        return;
      }
    }

    // Token whitelist check
    if (!isTokenSupported(params.tokenIn)) {
      sendError(res, 400, {
        code: 'UNSUPPORTED_TOKEN',
        message: `tokenIn ${params.tokenIn} is not a supported token on this network`,
        hint: `Supported tokens: ${Object.entries(DEMO_TOKENS).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        phase: 'preflight',
      });
      return;
    }
    if (!isTokenSupported(params.tokenOut)) {
      sendError(res, 400, {
        code: 'UNSUPPORTED_TOKEN',
        message: `tokenOut ${params.tokenOut} is not a supported token on this network`,
        hint: `Supported tokens: ${Object.entries(DEMO_TOKENS).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        phase: 'preflight',
      });
      return;
    }

    const preflight = await checkPreflight(params.userAddress);

    if (!buildOnly && !preflight.sessionActive) {
      sendError(res, 412, {
        code: 'SESSION_NOT_ACTIVE',
        message: `No active compliance session for ${params.userAddress}`,
        hint: preflight.hint,
        phase: 'preflight',
      });
      return;
    }

    // Allowance check — warn if tokenIn allowance is insufficient for SwapRouter
    const allowance = await blockchainService.getTokenAllowance(
      params.tokenIn as Address,
      params.userAddress as Address,
      CONTRACTS.simpleSwapRouter,
    );
    const amountBig = BigInt(params.amount);
    const allowanceSufficient = allowance >= amountBig;

    const result = await defiService.swap({
      tokenIn: params.tokenIn as Address,
      tokenOut: params.tokenOut as Address,
      amount: params.amount,
      zeroForOne: params.zeroForOne,
      userAddress: params.userAddress as Address,
    });

    if (!result.success) {
      res.status(400).json({ ...result, preflight, phase: 'build' });
      return;
    }

    res.json({
      ...result,
      preflight: {
        ...preflight,
        tokenSupported: true,
        allowanceSufficient,
        ...(!allowanceSufficient ? {
          allowanceWarning: {
            token: params.tokenIn,
            required: params.amount,
            current: allowance.toString(),
            spender: CONTRACTS.simpleSwapRouter,
            hint: `Approve at least ${params.amount} of ${params.tokenIn} to the SwapRouter (${CONTRACTS.simpleSwapRouter}) before broadcasting.`,
          },
        } : {}),
      },
      authMethod: req.authMethod,
      signerRequirement: {
        mode: 'msg.sender',
        userAddress: params.userAddress,
        message: 'Sign and broadcast this transaction with the same wallet address as userAddress. Build-only preflight does not override on-chain msg.sender checks.',
      },
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      sendError(res, 400, {
        code: 'INVALID_PARAMS',
        message: 'Request validation failed',
        phase: 'validation',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    logger.error('Swap controller error', { error: error.message });
    sendError(res, 500, { code: 'INTERNAL_ERROR', message: error.message, phase: 'build' });
  }
}

// ── Liquidity endpoint ───────────────────────────────────────

export async function addLiquidity(req: Request, res: Response): Promise<void> {
  try {
    const params = liquiditySchema.parse(req.body);
    const userId = req.apiKey?.userId ?? req.user?.userId;
    // Default: block if session inactive. Pass ?buildOnly=true to get unsigned TX without session check.
    const buildOnly = req.query?.buildOnly === 'true';

    logger.info('Add Liquidity request received', { user: params.userAddress, authMethod: req.authMethod });

    if (userId) {
      const ownerUserId = await getInstitutionOwner(params.userAddress);
      if (ownerUserId && ownerUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          code: 'INSTITUTION_OWNERSHIP_MISMATCH',
          message: `The wallet ${params.userAddress} is linked to another ILAL account`,
          hint: 'In mock/demo mode, call POST /api/v1/onboarding/register again with the same wallet to rebind it to the current account.',
          signerRequirement: 'The unsigned transaction must be signed by the same wallet address as userAddress.',
        });
        return;
      }
    }

    // Token whitelist check
    if (!isTokenSupported(params.token0)) {
      sendError(res, 400, {
        code: 'UNSUPPORTED_TOKEN',
        message: `token0 ${params.token0} is not a supported token on this network`,
        hint: `Supported tokens: ${Object.entries(DEMO_TOKENS).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        phase: 'preflight',
      });
      return;
    }
    if (!isTokenSupported(params.token1)) {
      sendError(res, 400, {
        code: 'UNSUPPORTED_TOKEN',
        message: `token1 ${params.token1} is not a supported token on this network`,
        hint: `Supported tokens: ${Object.entries(DEMO_TOKENS).map(([k, v]) => `${k} (${v})`).join(', ')}`,
        phase: 'preflight',
      });
      return;
    }

    const preflight = await checkPreflight(params.userAddress);

    if (!buildOnly && !preflight.sessionActive) {
      sendError(res, 412, {
        code: 'SESSION_NOT_ACTIVE',
        message: `No active compliance session for ${params.userAddress}`,
        hint: preflight.hint,
        phase: 'preflight',
      });
      return;
    }

    // Allowance checks for PositionManager
    const [allowance0, allowance1] = await Promise.all([
      blockchainService.getTokenAllowance(params.token0 as Address, params.userAddress as Address, CONTRACTS.positionManager),
      blockchainService.getTokenAllowance(params.token1 as Address, params.userAddress as Address, CONTRACTS.positionManager),
    ]);
    const amt0 = BigInt(params.amount0);
    const amt1 = BigInt(params.amount1);
    const allowance0Ok = amt0 === 0n || allowance0 >= amt0;
    const allowance1Ok = amt1 === 0n || allowance1 >= amt1;

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
      res.status(400).json({ ...result, preflight, phase: 'build' });
      return;
    }

    const allowanceWarnings: Record<string, unknown> = {};
    if (!allowance0Ok) {
      allowanceWarnings.token0 = {
        token: params.token0, required: params.amount0,
        current: allowance0.toString(), spender: CONTRACTS.positionManager,
        hint: `Approve token0 to PositionManager (${CONTRACTS.positionManager})`,
      };
    }
    if (!allowance1Ok) {
      allowanceWarnings.token1 = {
        token: params.token1, required: params.amount1,
        current: allowance1.toString(), spender: CONTRACTS.positionManager,
        hint: `Approve token1 to PositionManager (${CONTRACTS.positionManager})`,
      };
    }

    res.json({
      ...result,
      preflight: {
        ...preflight,
        tokenSupported: true,
        allowanceSufficient: allowance0Ok && allowance1Ok,
        ...(Object.keys(allowanceWarnings).length > 0 ? { allowanceWarnings } : {}),
      },
      authMethod: req.authMethod,
      signerRequirement: {
        mode: 'msg.sender',
        userAddress: params.userAddress,
        message: 'Sign and broadcast this transaction with the same wallet address as userAddress. Liquidity permissioning is enforced against the submitting wallet.',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      sendError(res, 400, {
        code: 'INVALID_PARAMS',
        message: 'Request validation failed',
        phase: 'validation',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
      return;
    }
    logger.error('Liquidity controller error', { error: error.message });
    sendError(res, 500, { code: 'INTERNAL_ERROR', message: error.message, phase: 'build' });
  }
}

// ── Preflight self-check endpoint ─────────────────────────────

export async function preflightCheck(req: Request, res: Response): Promise<void> {
  try {
    const rawAddress = req.params.address;
    if (!rawAddress || !ETH_ADDRESS.test(rawAddress)) {
      sendError(res, 400, {
        code: 'INVALID_ADDRESS',
        message: 'Invalid Ethereum address',
        phase: 'validation',
      });
      return;
    }

    const address = getAddress(rawAddress) as Address;
    const userId = req.apiKey?.userId ?? req.user?.userId;

    // API key info
    const apiKeyInfo = req.apiKey
      ? { valid: true, plan: req.user?.plan ?? 'FREE', rateLimit: req.apiKey.rateLimit }
      : { valid: true, plan: req.user?.plan ?? 'FREE' };

    // Institution binding
    const institution = await prisma.institution.findUnique({
      where: { walletAddress: address },
      select: { id: true, userId: true, kycStatus: true, name: true },
    });

    const institutionBound = !!institution && institution.userId === userId;

    // Session check
    let sessionActive = false;
    let remainingSeconds = 0;
    let expiresAt: string | null = null;
    try {
      [sessionActive, remainingSeconds] = await Promise.all([
        blockchainService.isSessionActive(address),
        blockchainService.getRemainingTime(address),
      ]);
      if (sessionActive) {
        expiresAt = new Date(Date.now() + remainingSeconds * 1000).toISOString();
      }
    } catch (err: any) {
      logger.warn('Preflight session check failed', { error: err.message });
    }

    // Token balances and decimals
    const tokenEntries = Object.entries(DEMO_TOKENS) as [string, Address][];
    const tokens: Record<string, { address: string; balance: string; decimals: number }> = {};
    for (const [name, tokenAddr] of tokenEntries) {
      const [balance, decimals] = await Promise.all([
        blockchainService.getTokenBalance(tokenAddr, address),
        blockchainService.getTokenDecimals(tokenAddr),
      ]);
      tokens[name] = { address: tokenAddr, balance: balance.toString(), decimals };
    }

    // Allowances
    const allowances: Record<string, string> = {};
    for (const [name, tokenAddr] of tokenEntries) {
      const swapAllowance = await blockchainService.getTokenAllowance(tokenAddr, address, CONTRACTS.simpleSwapRouter);
      const pmAllowance = await blockchainService.getTokenAllowance(tokenAddr, address, CONTRACTS.positionManager);
      allowances[`${name}_to_SwapRouter`] = swapAllowance.toString();
      allowances[`${name}_to_PositionManager`] = pmAllowance.toString();
    }

    // Readiness assessment
    const issues: string[] = [];
    if (!institutionBound) issues.push('Wallet not registered under your account — call POST /onboarding/register');
    if (!sessionActive) issues.push('No active compliance session — call POST /onboarding/activate-session-demo');

    for (const [name, tokenAddr] of tokenEntries) {
      const swapKey = `${name}_to_SwapRouter`;
      if (BigInt(allowances[swapKey]) === 0n) {
        issues.push(`${name} allowance to SwapRouter is 0 — approve ${tokenAddr} to ${CONTRACTS.simpleSwapRouter}`);
      }
    }

    res.json({
      address,
      network: 'base-sepolia',
      chainId: 84532,
      apiKey: apiKeyInfo,
      institution: institution
        ? { bound: institutionBound, id: institution.id, name: institution.name, kycApproved: institution.kycStatus === 1 }
        : { bound: false },
      session: { active: sessionActive, remainingSeconds, expiresAt },
      tokens,
      contracts: {
        swapRouter: CONTRACTS.simpleSwapRouter,
        positionManager: CONTRACTS.positionManager,
        complianceHook: CONTRACTS.complianceHook,
        poolManager: CONTRACTS.poolManager,
      },
      allowances,
      readiness: {
        canSwap: sessionActive && institutionBound && issues.filter(i => !i.includes('PositionManager')).length === 0,
        canAddLiquidity: sessionActive && institutionBound && issues.length === 0,
        issues,
      },
    });
  } catch (error: any) {
    logger.error('Preflight check error', { error: error.message });
    sendError(res, 500, { code: 'INTERNAL_ERROR', message: error.message });
  }
}
