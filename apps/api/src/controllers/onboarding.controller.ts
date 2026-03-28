/**
 * Onboarding Controller — Institution self-service registration
 *
 * POST /onboarding/register              — Register a new institution (mock KYC auto-approve)
 * POST /onboarding/activate-session      — Server-side ZK proof + on-chain session activation
 * GET  /onboarding/status/:address       — Check onboarding status
 * GET  /onboarding/attestation/:address  — Get IssuerAttestation + Merkle proof
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Address, getAddress } from 'viem';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as issuerService from '../services/issuer.service.js';
import * as merkleService from '../services/merkle.service.js';
import * as zkproofService from '../services/zkproof.service.js';
import { blockchainService } from '../services/blockchain.service.js';

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  countryCode: z.number().int().min(1).max(999).optional().default(840),
});

/**
 * POST /api/v1/onboarding/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);
    const walletAddress = getAddress(body.walletAddress);

    const existing = await prisma.institution.findUnique({ where: { walletAddress } });
    if (existing) {
      if (existing.kycStatus === 1) {
        res.status(409).json({
          success: false,
          error: 'Already registered',
          message: 'This wallet is already onboarded. Use GET /onboarding/attestation/:address to retrieve your attestation.',
          institutionId: existing.id,
        });
        return;
      }
      // Re-process a previously pending registration
    }

    // Mock KYC: auto-approve
    const timestamp = Math.floor(Date.now() / 1000);

    // 1. Add to Merkle tree
    const { leafIndex, root } = await merkleService.addLeaf(walletAddress, 1);

    // 2. Sign attestation
    const attestationData = await issuerService.signAttestation(
      walletAddress,
      1,
      body.countryCode,
      timestamp,
    );

    // 3. Get Merkle proof
    const proof = merkleService.getProof(leafIndex);

    const fullAttestation = {
      ...attestationData,
      merkleRoot: proof.root,
      merkleProof: proof.siblings,
      merkleIndex: leafIndex.toString(),
    };

    // 4. Persist to DB
    if (existing) {
      await prisma.institution.update({
        where: { walletAddress },
        data: {
          name: body.name,
          countryCode: body.countryCode,
          kycStatus: 1,
          merkleIndex: leafIndex,
          attestation: JSON.stringify(fullAttestation),
          approvedAt: new Date().toISOString(),
        },
      });
    } else {
      await prisma.institution.create({
        data: {
          name: body.name,
          walletAddress,
          countryCode: body.countryCode,
          kycStatus: 1,
          merkleIndex: leafIndex,
          attestation: JSON.stringify(fullAttestation),
          approvedAt: new Date().toISOString(),
        },
      });
    }

    logger.info('Institution registered', {
      walletAddress,
      leafIndex,
      root: root.slice(0, 30) + '...',
    });

    res.status(201).json({
      success: true,
      institutionId: existing?.id ?? 'created',
      status: 'approved',
      walletAddress,
      merkleRoot: root,
      leafIndex,
      message: 'Registration complete. Use GET /onboarding/attestation/:address to retrieve your attestation for proof generation.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Bad Request', details: error.errors });
      return;
    }
    logger.error('Onboarding register error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
}

/**
 * POST /api/v1/onboarding/activate-session
 *
 * Server-side ZK proof generation + on-chain session activation.
 * The institution must already be registered (POST /onboarding/register).
 * The API generates the PLONK proof using the issuer key and activates the
 * session on-chain as a relayer (paying gas).
 */
export async function activateSession(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  try {
    const { walletAddress: rawAddress, expiry = 86400 } = req.body as { walletAddress?: string; expiry?: number };
    if (!rawAddress || !/^0x[a-fA-F0-9]{40}$/.test(rawAddress)) {
      res.status(400).json({ success: false, error: 'Invalid or missing walletAddress' });
      return;
    }
    const walletAddress = getAddress(rawAddress) as Address;

    // 1. Check if session already active
    const isActive = await blockchainService.isSessionActive(walletAddress);
    if (isActive) {
      const remaining = await blockchainService.getRemainingTime(walletAddress);
      res.json({
        success: true,
        alreadyActive: true,
        message: 'Session is already active',
        remainingSeconds: remaining,
        expiresAt: new Date(Date.now() + remaining * 1000).toISOString(),
      });
      return;
    }

    // 2. Check institution is registered
    const institution = await prisma.institution.findUnique({ where: { walletAddress } });
    if (!institution || institution.kycStatus !== 1) {
      res.status(404).json({
        success: false,
        error: 'Not registered',
        message: 'Call POST /onboarding/register first',
      });
      return;
    }

    // 3. Check circuit files are available
    const available = await zkproofService.circuitsAvailable();
    if (!available) {
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: 'ZK circuit files not available on this server. Use POST /api/v1/verify with a client-generated proof instead.',
      });
      return;
    }

    // 4. Generate fresh attestation
    const timestamp = Math.floor(Date.now() / 1000);
    const attestation = await issuerService.signAttestation(
      walletAddress,
      1,
      institution.countryCode,
      timestamp,
    );
    const merkleProof = merkleService.getProof(institution.merkleIndex!);

    // 5. Generate ZK proof server-side
    logger.info('Starting server-side ZK proof generation', { walletAddress });
    const { proofHex, publicInputs } = await zkproofService.generateProof({
      userAddressBigInt: BigInt(walletAddress).toString(),
      merkleRoot:   merkleProof.root,
      merkleProof:  merkleProof.siblings,
      merkleIndex:  institution.merkleIndex!,
      issuerAx:     attestation.issuerAx,
      issuerAy:     attestation.issuerAy,
      sigR8x:       attestation.sigR8x,
      sigR8y:       attestation.sigR8y,
      sigS:         attestation.sigS,
      kycStatus:    1,
      countryCode:  institution.countryCode,
      timestamp,
    });

    // 6. Verify on-chain
    const inputs = publicInputs.map(s => BigInt(s));
    const isValid = await blockchainService.verifyProof(proofHex as `0x${string}`, inputs);
    if (!isValid) {
      res.status(400).json({ success: false, error: 'Proof verification failed' });
      return;
    }

    // 7. Activate session on-chain
    const result = await blockchainService.startSession(walletAddress);
    const elapsed = Date.now() - startTime;

    logger.info('Session activated via server-side ZK proof', {
      walletAddress,
      txHash: result.txHash,
      elapsed,
    });

    res.json({
      success: true,
      txHash: result.txHash,
      sessionExpiry: result.sessionExpiry.toString(),
      expiresAt: new Date(Number(result.sessionExpiry) * 1000).toISOString(),
      gasUsed: result.gasUsed.toString(),
      elapsedMs: elapsed,
    });
  } catch (error: any) {
    logger.error('activate-session error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
}

/**
 * GET /api/v1/onboarding/status/:address
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const address = req.params.address as string;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ success: false, error: 'Invalid address' });
      return;
    }

    const walletAddress = getAddress(address);
    const institution = await prisma.institution.findUnique({ where: { walletAddress } });

    if (!institution) {
      res.json({
        success: true,
        status: 'not_registered',
        walletAddress,
      });
      return;
    }

    res.json({
      success: true,
      status: institution.kycStatus === 1 ? 'approved' : 'pending',
      institutionId: institution.id,
      name: institution.name,
      walletAddress: institution.walletAddress,
      countryCode: institution.countryCode,
      merkleIndex: institution.merkleIndex,
      approvedAt: institution.approvedAt,
      createdAt: institution.createdAt,
    });
  } catch (error: any) {
    logger.error('Onboarding status error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

/**
 * GET /api/v1/onboarding/attestation/:address
 *
 * Returns a fresh IssuerAttestation with up-to-date Merkle proof.
 * The client feeds this directly into SDK's ZKProofModule.generate().
 */
export async function getAttestation(req: Request, res: Response): Promise<void> {
  try {
    const address = req.params.address as string;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ success: false, error: 'Invalid address' });
      return;
    }

    const walletAddress = getAddress(address);
    const institution = await prisma.institution.findUnique({ where: { walletAddress } });

    if (!institution || institution.kycStatus !== 1) {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Institution not registered or not yet approved. Call POST /onboarding/register first.',
      });
      return;
    }

    if (institution.merkleIndex == null) {
      res.status(500).json({ success: false, error: 'Internal error', message: 'Missing merkle index' });
      return;
    }

    // Generate a fresh attestation with a current timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const attestationData = await issuerService.signAttestation(
      walletAddress,
      1,
      institution.countryCode,
      timestamp,
    );

    const proof = merkleService.getProof(institution.merkleIndex);

    res.json({
      success: true,
      attestation: {
        ...attestationData,
        merkleRoot: proof.root,
        merkleProof: proof.siblings,
        merkleIndex: institution.merkleIndex.toString(),
      },
    });
  } catch (error: any) {
    logger.error('Onboarding attestation error', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
}
