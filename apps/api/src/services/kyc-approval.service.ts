/**
 * KYC Approval Service — shared pipeline for approving institutions after KYC verification.
 *
 * Called by both:
 *  - Coinbase EAS verification endpoint (POST /onboarding/verify-eas)
 *  - Sumsub webhook handler (POST /webhooks/sumsub)
 *
 * Performs:
 *  1. Validates institution exists and is pending (kycStatus === 0)
 *  2. Adds leaf to Merkle tree
 *  3. Signs EdDSA-Poseidon attestation via issuer service
 *  4. Atomically updates DB with KYC approval + provider metadata
 *  5. Logs the event to KycWebhookLog for audit/idempotency
 */

import { getAddress } from 'viem';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as issuerService from './issuer.service.js';
import * as merkleService from './merkle.service.js';

// OFAC / UN sanctioned country codes — duplicated from onboarding.controller.ts
// to allow standalone use in webhook handlers that bypass the controller.
const SANCTIONED_COUNTRIES: ReadonlySet<number> = new Set([
  408, 364, 760, 192, 643, 112, 728, 736, 716, 887, 434, 706, 140, 178, 368, 422, 704, 104,
]);

export interface ApprovalParams {
  walletAddress: string;
  kycSource: 'sumsub' | 'coinbase-eas';
  kycProviderId: string;
  countryCode: number;
  metadata?: Record<string, unknown>;
}

export interface ApprovalResult {
  institutionId: string;
  walletAddress: string;
  merkleIndex: number;
  merkleRoot: string;
  attestation: {
    sigR8x: string;
    sigR8y: string;
    sigS: string;
    issuerAx: string;
    issuerAy: string;
    kycStatus: string;
    countryCode: string;
    timestamp: string;
    merkleRoot: string;
    merkleProof: string[];
    merkleIndex: string;
  };
}

export class SanctionedCountryError extends Error {
  constructor(countryCode: number) {
    super(`Country code ${countryCode} is in the sanctioned list`);
    this.name = 'SanctionedCountryError';
  }
}

export class InstitutionNotFoundError extends Error {
  constructor(walletAddress: string) {
    super(`No institution found for ${walletAddress}`);
    this.name = 'InstitutionNotFoundError';
  }
}

export class AlreadyApprovedError extends Error {
  public institutionId: string;
  constructor(institutionId: string) {
    super('Institution is already approved');
    this.name = 'AlreadyApprovedError';
    this.institutionId = institutionId;
  }
}

/**
 * Approve an institution after KYC verification from any provider.
 *
 * Idempotent: if kycStatus is already 1, throws AlreadyApprovedError (caller can handle gracefully).
 * Uses a Prisma transaction to ensure atomicity of the DB update.
 */
export async function approveInstitution(params: ApprovalParams): Promise<ApprovalResult> {
  const { walletAddress: rawAddress, kycSource, kycProviderId, countryCode, metadata } = params;
  const walletAddress = getAddress(rawAddress);

  // 1. Sanctions check
  if (SANCTIONED_COUNTRIES.has(countryCode)) {
    throw new SanctionedCountryError(countryCode);
  }

  // 2. Look up institution
  const institution = await prisma.institution.findUnique({ where: { walletAddress } });
  if (!institution) {
    throw new InstitutionNotFoundError(walletAddress);
  }

  // 3. Idempotency: already approved
  if (institution.kycStatus === 1) {
    throw new AlreadyApprovedError(institution.id);
  }

  // 4. Add to Merkle tree
  const { leafIndex, root } = await merkleService.addLeaf(walletAddress, 1);

  // 5. Sign EdDSA-Poseidon attestation
  const timestamp = Math.floor(Date.now() / 1000);
  const attestationData = await issuerService.signAttestation(walletAddress, 1, countryCode, timestamp);

  // 6. Get Merkle proof
  const proof = merkleService.getProof(leafIndex);

  const fullAttestation = {
    ...attestationData,
    merkleRoot: proof.root,
    merkleProof: proof.siblings,
    merkleIndex: leafIndex.toString(),
  };

  const now = new Date().toISOString();

  // 7. Atomic DB update
  const updated = await prisma.$transaction(async (tx) => {
    // Re-check inside transaction to prevent race conditions
    const fresh = await tx.institution.findUnique({ where: { walletAddress } });
    if (fresh && fresh.kycStatus === 1) {
      throw new AlreadyApprovedError(fresh.id);
    }

    const inst = await tx.institution.update({
      where: { walletAddress },
      data: {
        kycStatus: 1,
        merkleIndex: leafIndex,
        attestation: JSON.stringify(fullAttestation),
        approvedAt: now,
        kycSource,
        kycProviderId,
        kycMetadata: (metadata ?? {}) as Prisma.InputJsonValue,
        kycVerifiedAt: now,
      },
    });

    // 8. Log to KycWebhookLog for audit trail
    await tx.kycWebhookLog.upsert({
      where: {
        provider_externalId_eventType: {
          provider: kycSource,
          externalId: kycProviderId,
          eventType: kycSource === 'coinbase-eas' ? 'eas-verified' : 'applicantReviewed',
        },
      },
      create: {
        provider: kycSource,
        externalId: kycProviderId,
        eventType: kycSource === 'coinbase-eas' ? 'eas-verified' : 'applicantReviewed',
        payload: (metadata ?? {}) as Prisma.InputJsonValue,
        walletAddress,
        processed: true,
        result: 'approved',
      },
      update: {
        processed: true,
        result: 'approved',
      },
    });

    return inst;
  });

  logger.info('Institution KYC approved', {
    walletAddress,
    kycSource,
    kycProviderId,
    merkleIndex: leafIndex,
    merkleRoot: root.slice(0, 30) + '...',
  });

  return {
    institutionId: updated.id,
    walletAddress,
    merkleIndex: leafIndex,
    merkleRoot: root,
    attestation: fullAttestation,
  };
}
