/**
 * Verify Controller - ZK Proof verification and session activation
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Address, type Hex, keccak256, toHex, concat } from 'viem';
import { blockchainService } from '../services/blockchain.service.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { EXPECTED_MERKLE_ROOT, EXPECTED_ISSUER_AX, EXPECTED_ISSUER_AY, getValidMerkleRoots } from '../config/constants.js';
import * as merkleService from '../services/merkle.service.js';
import * as issuerService from '../services/issuer.service.js';

const MAX_PROOF_AGE_SECONDS = 3600;
const MAX_FUTURE_DRIFT_SECONDS = 300;

const verifySchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  proof: z.string(),
  publicInputs: z.array(z.string()),
});

/**
 * Compute a unique hash for a proof + publicInputs pair (anti-replay).
 */
function computeProofHash(proof: string, publicInputs: string[]): string {
  const payload = proof + '|' + publicInputs.join(',');
  return keccak256(toHex(payload));
}

/**
 * Verify ZK Proof and activate session
 * POST /api/v1/verify
 */
export async function verifyAndActivate(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  let reservedProofHash: string | null = null;

  try {
    const body = verifySchema.parse(req.body);
    const userAddress = body.userAddress as Address;
    const userId = req.apiKey?.userId ?? req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authenticated user context is required',
      });
      return;
    }

    logger.info('Verify request received', { userAddress });

    // 1. Check if session is already active
    const isActive = await blockchainService.isSessionActive(userAddress);

    if (isActive) {
      const remaining = await blockchainService.getRemainingTime(userAddress);
      const sessionExpiry = Math.floor(Date.now() / 1000) + remaining;

      logger.info('Session already active', { userAddress, remaining });

      res.json({
        success: true,
        alreadyActive: true,
        sessionExpiry: sessionExpiry.toString(),
        remainingSeconds: remaining,
      });
      return;
    }

    // 2. Parse and validate public inputs
    const proofHex = (body.proof.startsWith('0x') ? body.proof : `0x${body.proof}`) as Hex;
    const inputs = body.publicInputs.map(s => BigInt(s));

    if (inputs.length !== 5) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'publicInputs must have exactly 5 elements: [userAddress, merkleRoot, issuerAx, issuerAy, timestamp]',
      });
      return;
    }

    // Security Check 1: User address binding
    const claimedAddressBigInt = BigInt(userAddress);
    if (inputs[0] !== claimedAddressBigInt) {
      logger.warn('ZK Proof Hijacking Attempt: userAddress mismatch', {
        requested: userAddress,
        proofAddress: inputs[0].toString()
      });
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'ZK Proof does not belong to the requested userAddress',
      });
      return;
    }

    // Security Check 2: Merkle root (supports multiple roots during tree rotation)
    const dynamicRoots = {
      current: merkleService.getRoot(),
      previous: merkleService.getPreviousRoot(),
    };
    const validRoots = getValidMerkleRoots(dynamicRoots);
    if (validRoots.length === 0) {
      logger.error('No valid Merkle roots configured (EXPECTED_MERKLE_ROOT)');
      res.status(500).json({ success: false, error: 'Server misconfiguration' });
      return;
    }
    if (!validRoots.includes(inputs[1])) {
      logger.warn('ZK Proof Forgery Attempt: Root mismatch', {
        proofRoot: inputs[1].toString(),
        validRoots: validRoots.map(r => r.toString()),
      });
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid Merkle Root in proof',
      });
      return;
    }

    // Security Check 3: Issuer public key (Ax, Ay)
    // Accept keys from env vars OR from the running IssuerService
    let validAx: bigint | null = EXPECTED_ISSUER_AX ? BigInt(EXPECTED_ISSUER_AX) : null;
    let validAy: bigint | null = EXPECTED_ISSUER_AY ? BigInt(EXPECTED_ISSUER_AY) : null;
    try {
      const dynKey = issuerService.getIssuerPublicKey();
      if (!validAx) validAx = BigInt(dynKey.issuerAx);
      if (!validAy) validAy = BigInt(dynKey.issuerAy);
      // Also accept dynamic key even when env vars are set
      if (inputs[2] === BigInt(dynKey.issuerAx) && inputs[3] === BigInt(dynKey.issuerAy)) {
        // Dynamic issuer key matches — skip static check
        validAx = BigInt(dynKey.issuerAx);
        validAy = BigInt(dynKey.issuerAy);
      }
    } catch {
      // IssuerService not initialized — fall back to env vars only
    }
    if (!validAx || !validAy) {
      logger.error('No issuer public key configured');
      res.status(500).json({ success: false, error: 'Server misconfiguration' });
      return;
    }
    if (inputs[2] !== validAx) {
      logger.warn('ZK Proof Forgery Attempt: Issuer Ax mismatch');
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Invalid Issuer public key in proof' });
      return;
    }
    if (inputs[3] !== validAy) {
      logger.warn('ZK Proof Forgery Attempt: Issuer Ay mismatch');
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Invalid Issuer public key in proof' });
      return;
    }

    // Security Check 4: Timestamp freshness (anti-replay)
    const proofTimestamp = Number(inputs[4]);
    const now = Math.floor(Date.now() / 1000);
    if (proofTimestamp > now + MAX_FUTURE_DRIFT_SECONDS) {
      logger.warn('ZK Proof from the future', { proofTimestamp, now });
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Proof timestamp is in the future' });
      return;
    }
    if (proofTimestamp < now - MAX_PROOF_AGE_SECONDS) {
      logger.warn('ZK Proof expired', { proofTimestamp, now, maxAge: MAX_PROOF_AGE_SECONDS });
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Proof has expired' });
      return;
    }

    // Security Check 5: Proof replay prevention
    const proofHash = computeProofHash(body.proof, body.publicInputs);
    try {
      await prisma.proofRecord.create({
        data: {
          userId,
          proofHash,
          userAddress,
          merkleRoot: inputs[1].toString(),
          timestamp: proofTimestamp,
        },
      });
      reservedProofHash = proofHash;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        logger.warn('ZK Proof replay attempt', { userAddress, proofHash });
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'This proof has already been used. Generate a new proof with a fresh timestamp.',
        });
        return;
      }
      throw error;
    }

    // 3. On-chain proof verification
    let isValid: boolean;
    try {
      isValid = await blockchainService.verifyProof(proofHex, inputs);
    } catch (err: any) {
      if (reservedProofHash) {
        await prisma.proofRecord.delete({ where: { proofHash: reservedProofHash } }).catch(() => undefined);
      }
      logger.error('Proof verification failed', { error: err.message });
      res.status(400).json({ success: false, error: 'Proof verification failed', message: err.message });
      return;
    }

    if (!isValid) {
      if (reservedProofHash) {
        await prisma.proofRecord.delete({ where: { proofHash: reservedProofHash } }).catch(() => undefined);
      }
      logger.warn('Proof rejected by verifier', { userAddress });
      res.status(400).json({ success: false, error: 'Invalid proof', message: 'ZK Proof verification failed' });
      return;
    }

    logger.info('Proof verified successfully', { userAddress });

    // 4. Activate on-chain session
    try {
      const result = await blockchainService.startSession(userAddress);
      const responseTime = Date.now() - startTime;

      // 5. Update user verification state after the proof has been durably reserved.
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastVerifiedAt: new Date().toISOString(),
            renewalCount: 0,
          },
        });
      } catch (persistErr: any) {
        logger.warn('Verification user-state update skipped', { error: persistErr.message, userId });
      }

      logger.info('Session activated successfully', {
        userAddress,
        txHash: result.txHash,
        gasUsed: result.gasUsed.toString(),
        responseTime,
      });

      res.json({
        success: true,
        txHash: result.txHash,
        sessionExpiry: result.sessionExpiry.toString(),
        gasUsed: result.gasUsed.toString(),
        responseTime,
      });
    } catch (err: any) {
      if (reservedProofHash) {
        await prisma.proofRecord.delete({ where: { proofHash: reservedProofHash } }).catch(() => undefined);
      }
      logger.error('Session activation failed', { error: err.message });
      res.status(500).json({ success: false, error: 'Session activation failed', message: err.message });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid request data',
        details: error.errors,
      });
      return;
    }

    logger.error('Verify endpoint error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Verification failed' });
  }
}

/**
 * Renew an active compliance session with bounded extension rules.
 * POST /api/v1/verify/renew
 */
export async function renewSession(req: Request, res: Response): Promise<void> {
  const REVERIFY_WINDOW_SECONDS = 7 * 24 * 3600; // 7 days
  const MAX_RENEWALS_PER_VERIFY = 6; // max 6 renewals per ZK proof (= 7 days total)

  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.walletAddress) {
      res.status(400).json({
        error: 'No wallet address linked to your account. Update your profile first.',
      });
      return;
    }

    if (!user.lastVerifiedAt) {
      res.status(403).json({
        error: 'No prior ZK verification found. Submit a proof via POST /api/v1/verify first.',
      });
      return;
    }

    const lastVerified = new Date(user.lastVerifiedAt).getTime() / 1000;
    const now = Math.floor(Date.now() / 1000);

    if (now - lastVerified > REVERIFY_WINDOW_SECONDS) {
      res.status(403).json({
        error: 'ZK verification expired. Please re-verify with a new proof via POST /api/v1/verify.',
        lastVerifiedAt: user.lastVerifiedAt,
        maxWindowDays: 7,
      });
      return;
    }

    if (user.renewalCount >= MAX_RENEWALS_PER_VERIFY) {
      res.status(403).json({
        error: 'Maximum renewals reached. Please re-verify with a new ZK proof via POST /api/v1/verify.',
        renewalCount: user.renewalCount,
        maxRenewals: MAX_RENEWALS_PER_VERIFY,
      });
      return;
    }

    const walletAddress = user.walletAddress as Address;
    const [isActive, remainingSeconds] = await Promise.all([
      blockchainService.isSessionActive(walletAddress),
      blockchainService.getRemainingTime(walletAddress),
    ]);

    if (!isActive) {
      res.status(403).json({
        error: 'Session expired. Please re-verify with a new ZK proof via POST /api/v1/verify.',
      });
      return;
    }

    if (remainingSeconds > 12 * 3600) {
      res.json({
        success: true,
        message: 'Session is still healthy — renewal not needed yet.',
        remainingSeconds,
        expiresAt: now + remainingSeconds,
      });
      return;
    }

    const result = await blockchainService.startSession(walletAddress);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { renewalCount: { increment: 1 } },
    });

    logger.info('Session renewed via dashboard', {
      userId: req.user.userId,
      walletAddress,
      txHash: result.txHash,
      renewalCount: user.renewalCount + 1,
    });

    res.json({
      success: true,
      message: 'Session renewed successfully.',
      txHash: result.txHash,
      sessionExpiry: result.sessionExpiry.toString(),
      remainingSeconds: 24 * 3600,
      renewalsRemaining: MAX_RENEWALS_PER_VERIFY - user.renewalCount - 1,
    });
  } catch (err: any) {
    logger.error('Session renewal failed', { error: err.message });
    res.status(500).json({ error: 'Session renewal failed', message: err.message });
  }
}

/**
 * Query session status
 * GET /api/v1/session/:address
 */
export async function getSessionStatus(req: Request, res: Response): Promise<void> {
  try {
    const address = req.params.address;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address as string)) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid Ethereum address' });
      return;
    }

    const userAddress = address as Address;

    const [isActive, remaining] = await Promise.all([
      blockchainService.isSessionActive(userAddress),
      blockchainService.getRemainingTime(userAddress),
    ]);

    res.json({
      address: userAddress,
      isActive,
      remainingSeconds: remaining,
      expiresAt: isActive ? new Date(Date.now() + remaining * 1000).toISOString() : null,
    });
  } catch (error: any) {
    logger.error('Get session status failed', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve session status' });
  }
}

/**
 * Health check
 * GET /api/v1/health
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const response: any = {
      status: 'ok',
      service: 'ILAL API',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };

    try {
      const block = await blockchainService.getBlockNumber();
      const relayAddress = blockchainService.getRelayAddress();
      response.blockchain = {
        connected: true,
        relay: relayAddress,
        network: 'base-sepolia',
        latestBlock: block.toString(),
      };
    } catch (error) {
      response.blockchain = {
        connected: false,
        note: 'Blockchain features disabled (VERIFIER_PRIVATE_KEY not configured)',
      };
    }

    res.json(response);
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ status: 'error', service: 'ILAL API', error: error.message });
  }
}
