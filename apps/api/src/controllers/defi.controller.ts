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
import { type Address, type Hex, getAddress, decodeFunctionResult } from 'viem';
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

// ── Approve endpoint ────────────────────────────────────────

const approveSchema = z.object({
  token:       z.string().regex(ETH_ADDRESS, 'Invalid token address'),
  userAddress: z.string().regex(ETH_ADDRESS, 'Invalid userAddress'),
  amount:      positiveIntString,
  operation:   z.enum(['swap', 'liquidity']).optional(),
  spender:     z.string().regex(ETH_ADDRESS, 'Invalid spender address').optional(),
});

export async function approve(req: Request, res: Response): Promise<void> {
  try {
    const params = approveSchema.parse(req.body);
    const token = getAddress(params.token) as Address;
    const userAddress = getAddress(params.userAddress) as Address;

    // Token whitelist check
    if (!isTokenSupported(token)) {
      sendError(res, 400, {
        code: 'TOKEN_NOT_SUPPORTED',
        message: `Token ${token} is not in the supported whitelist.`,
        hint: `Supported tokens: ${Object.entries(DEMO_TOKENS).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      }, req);
      return;
    }

    // Resolve spender from operation or explicit address
    let spender: Address;
    if (params.spender) {
      spender = getAddress(params.spender) as Address;
    } else if (params.operation === 'swap') {
      spender = CONTRACTS.simpleSwapRouter as Address;
    } else if (params.operation === 'liquidity') {
      spender = CONTRACTS.positionManager as Address;
    } else {
      sendError(res, 400, {
        code: 'MISSING_SPENDER',
        message: 'Provide either "spender" address or "operation" (swap/liquidity) to determine the approval target.',
        hint: 'For swaps use operation: "swap". For liquidity use operation: "liquidity".',
      }, req);
      return;
    }

    // Check current allowance
    const currentAllowance = await blockchainService.getTokenAllowance(token, userAddress, spender);
    const alreadySufficient = currentAllowance >= BigInt(params.amount);

    // Build the unsigned approve TX
    const result = await defiService.buildApproveTx({
      token,
      spender,
      amount: params.amount,
      userAddress,
    });

    const { transaction: _tx, ...resultWithoutTx } = result;

    res.json({
      ...resultWithoutTx,
      ...(alreadySufficient ? {} : { transaction: result.transaction }),
      isApprovalNeeded: !alreadySufficient,
      allowance: {
        current: currentAllowance.toString(),
        requested: params.amount,
        alreadySufficient,
      },
      spenderInfo: {
        address: spender,
        name: spender.toLowerCase() === CONTRACTS.simpleSwapRouter?.toLowerCase()
          ? 'SimpleSwapRouter'
          : spender.toLowerCase() === CONTRACTS.positionManager?.toLowerCase()
            ? 'VerifiedPoolsPositionManager'
            : 'Custom',
      },
      signerRequirement: {
        mode: 'msg.sender',
        userAddress,
        message: 'Sign and broadcast with the wallet that owns the tokens.',
      },
      nonceManagement: {
        hint: 'For rapid sequential transactions, manage nonces client-side using eth_getTransactionCount("pending") and increment manually.',
        example: 'const nonce = await provider.getTransactionCount(address, "pending"); sendTx({...tx, nonce});',
      },
      requestId: req.requestId,
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      sendError(res, 400, { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors }, req);
      return;
    }
    logger.error('[defi/approve] Error', { error: err.message });
    sendError(res, 500, { code: 'INTERNAL_ERROR', message: err.message }, req);
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

    // ETH balance check — catch "insufficient gas" before misleading contract errors
    const ethBalance = await blockchainService.getEthBalance(params.userAddress as Address);
    const MIN_ETH_FOR_GAS = 1000000000000000n; // 0.001 ETH
    if (ethBalance < MIN_ETH_FOR_GAS) {
      sendError(res, 412, {
        code: 'INSUFFICIENT_ETH',
        message: `Wallet has insufficient ETH for gas: ${ethBalance.toString()} wei (${(Number(ethBalance) / 1e18).toFixed(6)} ETH)`,
        hint: 'Send at least 0.001 ETH (Base Sepolia) to the wallet for transaction gas fees.',
        ethFaucets: ['https://www.alchemy.com/faucets/base-sepolia', 'https://faucets.chain.link/base-sepolia'],
        phase: 'preflight',
      }, req);
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
      res.status(400).json({ ...result, preflight, phase: 'build' });
      return;
    }

    // Simulate the swap via eth_call with current on-chain state.
    // This catches pool exhaustion, PRICE_LIMIT, and stale-state failures
    // before the developer broadcasts — making canBroadcastSafely trustworthy.
    const simulation = await blockchainService.simulateCall({
      from: params.userAddress as Address,
      to: result.transaction.to as Address,
      data: result.transaction.data as `0x${string}`,
    });

    res.json({
      ...result,
      // When simulation fails, override top-level success and exclude the transaction object
      ...(simulation.success ? {} : { success: false, transaction: undefined }),
      preflight: {
        ...preflight,
        tokenSupported: true,
        allowanceSufficient,
        canBroadcastSafely: preflight.sessionActive && simulation.success,
        simulation: {
          success: simulation.success,
          ...(simulation.reason ? { revertReason: simulation.reason } : {}),
        },
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
        message: 'Sign and broadcast this transaction with the same wallet address as userAddress.',
      },
      nonceManagement: {
        hint: 'For rapid sequential transactions, manage nonces client-side using eth_getTransactionCount("pending") and increment manually.',
        example: 'const nonce = await provider.getTransactionCount(address, "pending"); sendTx({...tx, nonce});',
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

    // Auto-sort tokens into Uniswap canonical order (token0 < token1) and swap amounts accordingly
    if (params.token0.toLowerCase() > params.token1.toLowerCase()) {
      [params.token0, params.token1] = [params.token1, params.token0];
      [params.amount0, params.amount1] = [params.amount1, params.amount0];
    }

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

    // ETH balance check — catch "insufficient gas" before misleading contract errors
    const ethBalance = await blockchainService.getEthBalance(params.userAddress as Address);
    const MIN_ETH_FOR_GAS = 1000000000000000n; // 0.001 ETH
    if (ethBalance < MIN_ETH_FOR_GAS) {
      sendError(res, 412, {
        code: 'INSUFFICIENT_ETH',
        message: `Wallet has insufficient ETH for gas: ${ethBalance.toString()} wei (${(Number(ethBalance) / 1e18).toFixed(6)} ETH)`,
        hint: 'Send at least 0.001 ETH (Base Sepolia) to the wallet for transaction gas fees.',
        ethFaucets: ['https://www.alchemy.com/faucets/base-sepolia', 'https://faucets.chain.link/base-sepolia'],
        phase: 'preflight',
      }, req);
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

    // NOTE: We intentionally skip eth_call simulation for liquidity.
    //
    // The PositionManager.mint() API takes `liquidityDelta` (an abstract Uniswap v4
    // unit derived from sqrtPriceX96 + tick range), NOT raw token amounts. The API
    // currently approximates liquidityDelta as max(amount0, amount1) in wei — this
    // incorrect value causes PoolManager to compute wildly wrong settlement amounts,
    // producing an empty `0x` revert deep inside the unlock/settle call chain.
    //
    // eth_call simulation would be trustworthy only with an accurate liquidityDelta
    // (requiring an on-chain PoolManager.getSlot0() read + Uniswap math). Until then,
    // `canBroadcastSafely` is derived from the reliable pre-checks: session + allowances.
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

    const canBroadcastSafely = preflight.sessionActive && allowance0Ok && allowance1Ok;

    res.json({
      ...result,
      preflight: {
        ...preflight,
        tokenSupported: true,
        allowanceSufficient: allowance0Ok && allowance1Ok,
        canBroadcastSafely,
        simulation: {
          skipped: true,
          reason: 'Liquidity simulation skipped — liquidityDelta approximation makes eth_call unreliable. canBroadcastSafely is derived from session + allowance pre-checks.',
        },
        ...(Object.keys(allowanceWarnings).length > 0 ? { allowanceWarnings } : {}),
      },
      authMethod: req.authMethod,
      signerRequirement: {
        mode: 'msg.sender',
        userAddress: params.userAddress,
        message: 'Sign and broadcast this transaction with the same wallet address as userAddress.',
      },
      nonceManagement: {
        hint: 'For rapid sequential transactions, manage nonces client-side using eth_getTransactionCount("pending") and increment manually.',
        example: 'const nonce = await provider.getTransactionCount(address, "pending"); sendTx({...tx, nonce});',
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

// ── Quote / estimateOutput endpoint ──────────────────────────

const quoteSchema = z.object({
  tokenIn:     z.string().regex(ETH_ADDRESS, 'Invalid tokenIn address'),
  tokenOut:    z.string().regex(ETH_ADDRESS, 'Invalid tokenOut address'),
  amount:      positiveIntString,
  userAddress: z.string().regex(ETH_ADDRESS, 'Invalid userAddress').optional(),
});

// SimpleSwapRouter.swap() returns int256 (the delta / output amount)
const ROUTER_SWAP_ABI = [{
  type: 'function', name: 'swap',
  inputs: [
    { name: 'key', type: 'tuple', components: [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickSpacing', type: 'int24' },
      { name: 'hooks', type: 'address' },
    ]},
    { name: 'params', type: 'tuple', components: [
      { name: 'zeroForOne', type: 'bool' },
      { name: 'amountSpecified', type: 'int256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' },
    ]},
    { name: 'hookData', type: 'bytes' },
    { name: 'minAmountOut', type: 'uint256' },
  ],
  outputs: [{ name: 'deltaAmount', type: 'int256' }],
  stateMutability: 'payable',
}] as const;

export async function getQuote(req: Request, res: Response): Promise<void> {
  try {
    const params = quoteSchema.parse(req.method === 'GET' ? req.query : req.body);

    // Token whitelist
    if (!isTokenSupported(params.tokenIn) || !isTokenSupported(params.tokenOut)) {
      sendError(res, 400, {
        code: 'UNSUPPORTED_TOKEN',
        message: 'One or both tokens are not supported on this network',
        hint: `Supported tokens: ${Object.entries(DEMO_TOKENS).map(([k, v]) => `${k} (${v})`).join(', ')}`,
      }, req);
      return;
    }

    if (params.tokenIn.toLowerCase() === params.tokenOut.toLowerCase()) {
      sendError(res, 400, {
        code: 'INVALID_PARAMS',
        message: 'tokenIn and tokenOut must be different',
      }, req);
      return;
    }

    // Use userAddress if provided — the SwapRouter injects msg.sender as hookData,
    // so simulation must run from the actual user address so ComplianceHook can
    // verify the session. Relay wallet has no session and will always revert.
    let probeFrom: Address;
    if (params.userAddress) {
      probeFrom = params.userAddress as Address;
    } else {
      // No userAddress — fallback to relay wallet for price-only estimation.
      // NOTE: this will fail if the pool has a ComplianceHook (session required).
      try {
        probeFrom = blockchainService.getRelayAddress();
      } catch {
        sendError(res, 400, {
          code: 'USER_ADDRESS_REQUIRED',
          message: 'userAddress is required for quote simulation on compliance-gated pools',
          hint: 'Pass userAddress (must have an active ILAL session) as a query param: ?userAddress=0x...',
        }, req);
        return;
      }
    }

    const swapTx = await defiService.buildSwapTx({
      tokenIn: params.tokenIn as Address,
      tokenOut: params.tokenOut as Address,
      amount: params.amount,
      userAddress: probeFrom,
    });

    // Simulate from the user's address so msg.sender flows through SwapRouter →
    // hookData → ComplianceHook correctly.
    const simulation = await blockchainService.simulateCallWithReturn({
      from: probeFrom,
      to: swapTx.transaction.to as Address,
      data: swapTx.transaction.data as Hex,
    });

    if (!simulation.success || !simulation.returnData) {
      res.json({
        success: false,
        error: simulation.reason || 'Simulation failed — pool may lack liquidity',
        category: simulation.category,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amount,
      });
      return;
    }

    // Decode the return value (int256 deltaAmount)
    let estimatedOutput: bigint;
    try {
      const decoded = decodeFunctionResult({
        abi: ROUTER_SWAP_ABI,
        functionName: 'swap',
        data: simulation.returnData,
      });
      // Router returns the output amount as a positive int256
      estimatedOutput = decoded < 0n ? -decoded : decoded;
    } catch {
      // Fallback: try raw decoding (single int256)
      const raw = BigInt(simulation.returnData);
      estimatedOutput = raw < 0n ? -raw : raw;
    }

    // Get token decimals for formatting
    const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
      blockchainService.getTokenDecimals(params.tokenIn as Address),
      blockchainService.getTokenDecimals(params.tokenOut as Address),
    ]);

    const amountInNum = Number(params.amount) / Math.pow(10, tokenInDecimals);
    const estimatedOutputNum = Number(estimatedOutput) / Math.pow(10, tokenOutDecimals);
    const exchangeRate = amountInNum > 0 ? estimatedOutputNum / amountInNum : 0;

    // Suggested minAmountOut with 0.5% slippage
    const suggestedMinAmountOut = estimatedOutput * 995n / 1000n;

    res.json({
      success: true,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amount,
      estimatedOutput: estimatedOutput.toString(),
      estimatedOutputFormatted: estimatedOutputNum.toFixed(tokenOutDecimals > 6 ? 8 : tokenOutDecimals),
      exchangeRate: exchangeRate.toFixed(8),
      suggestedMinAmountOut: suggestedMinAmountOut.toString(),
      slippageTolerance: '0.5%',
      tokenInDecimals,
      tokenOutDecimals,
      warning: 'Quote is estimated from current on-chain state. Actual output may differ due to price movement between quote and execution.',
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      sendError(res, 400, { code: 'INVALID_PARAMS', message: 'Invalid quote parameters', details: error.errors }, req);
      return;
    }
    logger.error('Quote error', { error: error.message });
    sendError(res, 500, { code: 'INTERNAL_ERROR', message: error.message }, req);
  }
}

// ── Preflight self-check endpoint ─────────────────────────────

export async function preflightCheck(req: Request, res: Response): Promise<void> {
  try {
    const rawAddress = String(req.params.address ?? '');
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
      ? { valid: true, plan: req.user?.plan ?? 'FREE', rateLimit: req.apiKey.rateLimit, permissions: req.apiKey.permissions }
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

    // ETH balance (for gas fees)
    const ethBalance = await blockchainService.getEthBalance(address);

    // Token balances and decimals
    const tokenEntries = Object.entries(DEMO_TOKENS) as [string, Address][];
    const tokens: Record<string, { address: string; balance: string; decimals: number }> = {};
    tokens['ETH'] = { address: '0x0000000000000000000000000000000000000000', balance: ethBalance.toString(), decimals: 18 };
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
    const MIN_ETH_FOR_GAS = 1000000000000000n; // 0.001 ETH
    const issues: string[] = [];
    if (ethBalance < MIN_ETH_FOR_GAS) issues.push('ETH balance too low for gas fees (need >= 0.001 ETH). Get Base Sepolia ETH from https://www.alchemy.com/faucets/base-sepolia');
    if (!institutionBound) issues.push('Wallet not registered under your account — call POST /onboarding/register');
    if (!sessionActive) issues.push('No active compliance session — call POST /onboarding/activate-session-demo');

    for (const [name, tokenAddr] of tokenEntries) {
      const swapKey = `${name}_to_SwapRouter`;
      if (BigInt(allowances[swapKey]) === 0n) {
        issues.push(`${name} allowance to SwapRouter is 0 — approve ${tokenAddr} to ${CONTRACTS.simpleSwapRouter}`);
      }
    }

    // Pool health probe — simulate a dust swap in each direction from the user's address.
    // The SwapRouter injects msg.sender as hookData so the simulation must run from an
    // address that has an active compliance session. Using the user address is correct;
    // the relay wallet would fail NotVerified because it has no session.
    let poolHealth: Record<string, unknown> = { probeStatus: 'skipped' };
    try {
      const probeFrom: Address = address;

      const [wethToUsdcTx, usdcToWethTx] = await Promise.all([
        defiService.buildSwapTx({
          tokenIn: DEMO_TOKENS.WETH,
          tokenOut: DEMO_TOKENS.tUSDC,
          amount: '1000000000000', // 0.000001 WETH dust
          userAddress: probeFrom,
        }),
        defiService.buildSwapTx({
          tokenIn: DEMO_TOKENS.tUSDC,
          tokenOut: DEMO_TOKENS.WETH,
          amount: '1000', // 0.001 tUSDC dust (6 decimals)
          userAddress: probeFrom,
        }),
      ]);

      const [wethProbe, usdcProbe] = await Promise.all([
        blockchainService.simulateCall({
          from: probeFrom,
          to: wethToUsdcTx.transaction.to as Address,
          data: wethToUsdcTx.transaction.data as `0x${string}`,
        }),
        blockchainService.simulateCall({
          from: probeFrom,
          to: usdcToWethTx.transaction.to as Address,
          data: usdcToWethTx.transaction.data as `0x${string}`,
        }),
      ]);

      poolHealth = {
        probeStatus: 'ok',
        probeSender: probeFrom,
        wethToTusdc: { canFill: wethProbe.success, ...(wethProbe.reason ? { revertReason: wethProbe.reason } : {}) },
        tusdcToWeth: { canFill: usdcProbe.success, ...(usdcProbe.reason ? { revertReason: usdcProbe.reason } : {}) },
        note: 'Dust-amount eth_call using user address — reflects pool liquidity given an active session',
      };

      if (!wethProbe.success) issues.push(`Pool WETH→tUSDC direction not fillable: ${wethProbe.reason}`);
      if (!usdcProbe.success) issues.push(`Pool tUSDC→WETH direction not fillable: ${usdcProbe.reason}`);
    } catch (probeErr: any) {
      poolHealth = { probeStatus: 'error', error: probeErr.message };
    }

    const ethLow = ethBalance < MIN_ETH_FOR_GAS;

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
      pool: poolHealth,
      readiness: {
        canSwap: sessionActive && institutionBound && issues.filter(i => !i.includes('PositionManager')).length === 0,
        canAddLiquidity: sessionActive && institutionBound && issues.length === 0,
        issues,
      },
      ...(ethLow ? {
        ethFaucets: [
          'https://www.alchemy.com/faucets/base-sepolia',
          'https://faucets.chain.link/base-sepolia',
        ],
      } : {}),
    });
  } catch (error: any) {
    logger.error('Preflight check error', { error: error.message });
    sendError(res, 500, { code: 'INTERNAL_ERROR', message: error.message });
  }
}
