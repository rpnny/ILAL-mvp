/**
 * Verify Controller - ZK Proof verification and session activation
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { blockchainService } from '../services/blockchain.service.js';
import { logger } from '../config/logger.js';
import { EXPECTED_MERKLE_ROOT, EXPECTED_ISSUER_AX, EXPECTED_ISSUER_AY } from '../config/constants.js';

const MAX_PROOF_AGE_SECONDS = 3600;
const MAX_FUTURE_DRIFT_SECONDS = 300;

const verifySchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  proof: z.string(),
  publicInputs: z.array(z.string()),
});

/**
 * Verify ZK Proof and activate session
 * POST /api/v1/verify
 */
export async function verifyAndActivate(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const body = verifySchema.parse(req.body);
    const userAddress = body.userAddress as Address;

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

    // Security Check 2: Merkle root
    if (!EXPECTED_MERKLE_ROOT) {
      logger.error('EXPECTED_MERKLE_ROOT not configured');
      res.status(500).json({ success: false, error: 'Server misconfiguration' });
      return;
    }
    if (inputs[1] !== BigInt(EXPECTED_MERKLE_ROOT)) {
      logger.warn('ZK Proof Forgery Attempt: Root mismatch', { proofRoot: inputs[1].toString() });
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid Merkle Root in proof',
      });
      return;
    }

    // Security Check 3: Issuer public key (Ax, Ay)
    if (!EXPECTED_ISSUER_AX || !EXPECTED_ISSUER_AY) {
      logger.error('EXPECTED_ISSUER_AX/AY not configured');
      res.status(500).json({ success: false, error: 'Server misconfiguration' });
      return;
    }
    if (inputs[2] !== BigInt(EXPECTED_ISSUER_AX)) {
      logger.warn('ZK Proof Forgery Attempt: Issuer Ax mismatch');
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Invalid Issuer public key in proof' });
      return;
    }
    if (inputs[3] !== BigInt(EXPECTED_ISSUER_AY)) {
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

    // 3. On-chain proof verification
    let isValid: boolean;
    try {
      isValid = await blockchainService.verifyProof(proofHex, inputs);
    } catch (err: any) {
      logger.error('Proof verification failed', { error: err.message });
      res.status(400).json({ success: false, error: 'Proof verification failed', message: err.message });
      return;
    }

    if (!isValid) {
      logger.warn('Proof rejected by verifier', { userAddress });
      res.status(400).json({ success: false, error: 'Invalid proof', message: 'ZK Proof verification failed' });
      return;
    }

    logger.info('Proof verified successfully', { userAddress });

    // 4. Activate on-chain session
    try {
      const result = await blockchainService.startSession(userAddress);
      const responseTime = Date.now() - startTime;

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
