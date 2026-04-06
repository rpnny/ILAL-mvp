/**
 * Testnet Controller
 *
 * POST /api/v1/testnet/activate
 *   One-shot endpoint for testnet / sandbox use.
 *   Accepts any wallet address, auto-registers it (mock KYC), and activates
 *   a compliance session — all in a single API call.
 *
 *   No ZK proof required.
 *   Requires a valid API key (X-API-Key) to prevent unmetered abuse.
 *   NOT available in production (guarded by NODE_ENV check).
 */

import type { Request, Response } from 'express';
import { getAddress, type Address } from 'viem';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { blockchainService } from '../services/blockchain.service.js';
import { faucetService } from '../services/faucet.service.js';
import * as issuerService from '../services/issuer.service.js';
import * as merkleService from '../services/merkle.service.js';

const activateSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  userAddress:   z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  durationHours: z.number().int().min(1).max(720).optional().default(24),
  name: z.string().min(1).max(200).optional(),
}).transform((data) => ({
  ...data,
  walletAddress: data.walletAddress ?? data.userAddress,
})).refine((data) => !!data.walletAddress, {
  message: 'walletAddress (or userAddress) is required',
  path: ['walletAddress'],
});

/**
 * POST /api/v1/testnet/activate
 *
 * Body: { walletAddress, durationHours?, name? }
 *
 * Steps:
 *   1. If wallet not registered → mock-KYC register it (auto-approve).
 *   2. If session already active → return existing session info.
 *   3. Activate session on-chain via relayer (no ZK proof).
 */
export async function activate(req: Request, res: Response): Promise<void> {
  try {
    const body = activateSchema.parse(req.body);
    const walletAddress = getAddress(body.walletAddress!) as Address;
    const userId = req.apiKey?.userId ?? req.user?.userId;

    // ── Step 1: Auto-register if needed ────────────────────────────────────

    let institution = await prisma.institution.findUnique({ where: { walletAddress } });

    if (!institution || institution.kycStatus !== 1) {
      const timestamp = Math.floor(Date.now() / 1000);
      const { leafIndex, root } = await merkleService.addLeaf(walletAddress, 1);
      const attestationData = await issuerService.signAttestation(walletAddress, 1, 840, timestamp);
      const proof = merkleService.getProof(leafIndex);
      const fullAttestation = {
        ...attestationData,
        merkleRoot: proof.root,
        merkleProof: proof.siblings,
        merkleIndex: leafIndex.toString(),
      };

      if (institution) {
        institution = await prisma.institution.update({
          where: { walletAddress },
          data: {
            userId,
            name: body.name ?? `Testnet Wallet ${walletAddress.slice(0, 8)}`,
            kycStatus: 1,
            merkleIndex: leafIndex,
            attestation: JSON.stringify(fullAttestation),
            approvedAt: new Date().toISOString(),
          },
        });
      } else {
        institution = await prisma.institution.create({
          data: {
            userId,
            name: body.name ?? `Testnet Wallet ${walletAddress.slice(0, 8)}`,
            walletAddress,
            countryCode: 840,
            kycStatus: 1,
            merkleIndex: leafIndex,
            attestation: JSON.stringify(fullAttestation),
            approvedAt: new Date().toISOString(),
          },
        });
      }

      logger.info('[testnet/activate] Auto-registered wallet', { walletAddress, merkleIndex: leafIndex, root: root.slice(0, 30) });
    }

    // ── Step 2: Check existing session ─────────────────────────────────────

    const isActive = await blockchainService.isSessionActive(walletAddress);
    if (isActive) {
      const remaining = await blockchainService.getRemainingTime(walletAddress);
      res.json({
        success: true,
        alreadyActive: true,
        walletAddress,
        remainingSeconds: remaining,
        expiresAt: new Date(Date.now() + remaining * 1000).toISOString(),
        registered: true,
        note: 'Session already active — no action taken.',
      });
      return;
    }

    // ── Step 3: Activate session on-chain ──────────────────────────────────

    const durationSeconds = body.durationHours * 3600;
    const result = await blockchainService.startSession(walletAddress, durationSeconds);

    logger.info('[testnet/activate] Session activated', {
      walletAddress,
      txHash: result.txHash,
      durationHours: body.durationHours,
    });

    res.json({
      success: true,
      walletAddress,
      registered: true,
      txHash: result.txHash,
      expiresAt: new Date(Number(result.sessionExpiry) * 1000).toISOString(),
      gasUsed: result.gasUsed.toString(),
      note: 'Testnet only — ZK proof bypassed. Call this endpoint again when session expires.',
      nextSteps: {
        '1_getTokens': 'POST /api/v1/testnet/faucet  { "walletAddress": "0x..." }',
        '2_approve': 'POST /api/v1/defi/approve  { "token": "<tUSDC>", "operation": "swap", "amount": "10000000000", "userAddress": "0x..." }',
        '3_preflight': 'GET /api/v1/defi/preflight/<address>',
        '4_swap': 'POST /api/v1/defi/swap  { "tokenIn": "<tUSDC>", "tokenOut": "<WETH>", "amount": "1000000000", "userAddress": "0x..." }',
      },
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Bad Request', details: err.errors });
      return;
    }
    logger.error('[testnet/activate] Error', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

/**
 * POST /api/v1/testnet/activate-batch
 *
 * Body: { wallets: string[], durationHours? }
 *
 * Batch version — activates up to 20 wallets in parallel.
 * Returns per-wallet results (success/failure) even if some fail.
 */
export async function activateBatch(req: Request, res: Response): Promise<void> {
  try {
    const { wallets, durationHours = 24 } = req.body as { wallets?: string[]; durationHours?: number };

    if (!Array.isArray(wallets) || wallets.length === 0) {
      res.status(400).json({ error: 'wallets must be a non-empty array of addresses' });
      return;
    }
    if (wallets.length > 20) {
      res.status(400).json({ error: 'Maximum 20 wallets per batch request' });
      return;
    }

    const userId = req.apiKey?.userId ?? req.user?.userId;
    const durationSeconds = Math.min(Math.max(durationHours, 1), 720) * 3600;

    // Process each wallet (sequentially to avoid nonce collisions on relay)
    const results: Record<string, unknown>[] = [];
    for (const raw of wallets) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
        results.push({ walletAddress: raw, success: false, error: 'Invalid address format' });
        continue;
      }
      const walletAddress = getAddress(raw) as Address;

      try {
        // Auto-register if needed
        let institution = await prisma.institution.findUnique({ where: { walletAddress } });
        if (!institution || institution.kycStatus !== 1) {
          const timestamp = Math.floor(Date.now() / 1000);
          const { leafIndex, root } = await merkleService.addLeaf(walletAddress, 1);
          const attestationData = await issuerService.signAttestation(walletAddress, 1, 840, timestamp);
          const proof = merkleService.getProof(leafIndex);
          const fullAttestation = { ...attestationData, merkleRoot: proof.root, merkleProof: proof.siblings, merkleIndex: leafIndex.toString() };

          if (institution) {
            await prisma.institution.update({
              where: { walletAddress },
              data: { userId, name: `Testnet ${walletAddress.slice(0, 8)}`, kycStatus: 1, merkleIndex: leafIndex, attestation: JSON.stringify(fullAttestation), approvedAt: new Date().toISOString() },
            });
          } else {
            await prisma.institution.create({
              data: { userId, name: `Testnet ${walletAddress.slice(0, 8)}`, walletAddress, countryCode: 840, kycStatus: 1, merkleIndex: leafIndex, attestation: JSON.stringify(fullAttestation), approvedAt: new Date().toISOString() },
            });
          }
        }

        const isActive = await blockchainService.isSessionActive(walletAddress);
        if (isActive) {
          const remaining = await blockchainService.getRemainingTime(walletAddress);
          results.push({ walletAddress, success: true, alreadyActive: true, remainingSeconds: remaining });
          continue;
        }

        const result = await blockchainService.startSession(walletAddress, durationSeconds);
        results.push({
          walletAddress,
          success: true,
          txHash: result.txHash,
          expiresAt: new Date(Number(result.sessionExpiry) * 1000).toISOString(),
        });
      } catch (err: any) {
        results.push({ walletAddress, success: false, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    logger.info('[testnet/activate-batch] Batch complete', { total: wallets.length, succeeded });

    res.json({
      total: wallets.length,
      succeeded,
      failed: wallets.length - succeeded,
      results,
    });

  } catch (err: any) {
    logger.error('[testnet/activate-batch] Error', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

// ── Faucet ──────────────────────────────────────────────────────────────────

const faucetSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  userAddress:   z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
}).transform((data) => ({
  walletAddress: data.walletAddress ?? data.userAddress,
})).refine((data) => !!data.walletAddress, {
  message: 'walletAddress (or userAddress) is required',
  path: ['walletAddress'],
});

/**
 * POST /api/v1/testnet/faucet
 *
 * Mints 10,000 tUSDC to the given wallet address.
 * Rate limited: 1 claim per wallet per 24 hours.
 */
export async function faucet(req: Request, res: Response): Promise<void> {
  try {
    const body = faucetSchema.parse(req.body);
    const walletAddress = getAddress(body.walletAddress!) as Address;

    if (!faucetService.available) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Faucet is not available — VERIFIER_PRIVATE_KEY not configured.',
        requestId: req.requestId,
      });
      return;
    }

    const result = await faucetService.mintTestTokens(walletAddress);

    res.json({
      success: true,
      walletAddress,
      ...result,
      explorerUrl: `https://sepolia.basescan.org/tx/${result.txHash}`,
      note: 'tUSDC minted. You also need Base Sepolia ETH for gas — use https://www.alchemy.com/faucets/base-sepolia',
      nextSteps: {
        '1_approve': 'POST /api/v1/defi/approve  { "token": "<tUSDC>", "operation": "swap", "amount": "10000000000", "userAddress": "0x..." }',
        '2_swap': 'POST /api/v1/defi/swap  { "tokenIn": "<tUSDC>", "tokenOut": "<WETH>", "amount": "1000000000", "userAddress": "0x..." }',
      },
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Bad Request', details: err.errors, requestId: req.requestId });
      return;
    }
    logger.error('[testnet/faucet] Error', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error', message: err.message, requestId: req.requestId });
  }
}
