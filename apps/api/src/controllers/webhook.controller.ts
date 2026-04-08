/**
 * Webhook Controller — handles inbound webhooks from KYC providers
 *
 * POST /webhooks/sumsub  — Sumsub applicantReviewed callback
 *
 * Security:
 *  - HMAC-SHA1 signature verification on raw body
 *  - Idempotency via KycWebhookLog unique constraint
 *  - No JWT/API key auth (webhooks are authenticated by signature)
 */

import type { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import * as sumsubService from '../services/sumsub.service.js';
import * as kycApprovalService from '../services/kyc-approval.service.js';
import { AlreadyApprovedError } from '../services/kyc-approval.service.js';

/**
 * POST /api/v1/webhooks/sumsub
 *
 * Receives raw body (registered before express.json() in server.ts).
 * Verifies HMAC-SHA1 signature, parses applicantReviewed event,
 * and triggers the KYC approval pipeline on GREEN result.
 */
export async function handleSumsubWebhook(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = req.body as Buffer;
    const signature = req.headers['x-payload-digest'] as string;

    // 1. Verify signature
    if (!signature) {
      logger.warn('Sumsub webhook: missing x-payload-digest header');
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    const isValid = sumsubService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Sumsub webhook: invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // 2. Parse payload
    const payload = JSON.parse(rawBody.toString('utf-8'));

    // 3. Only process applicantReviewed events
    const event = sumsubService.parseApplicantReviewed(payload);
    if (!event) {
      // Acknowledge non-applicantReviewed events silently
      logger.debug('Sumsub webhook: ignoring event type', { type: payload.type });
      res.json({ received: true, ignored: true });
      return;
    }

    logger.info('Sumsub webhook: applicantReviewed', {
      applicantId: event.applicantId,
      externalUserId: event.externalUserId,
      reviewResult: event.reviewResult,
      country: event.country,
    });

    // 4. Idempotency check
    const existingLog = await prisma.kycWebhookLog.findUnique({
      where: {
        provider_externalId_eventType: {
          provider: 'sumsub',
          externalId: event.applicantId,
          eventType: 'applicantReviewed',
        },
      },
    });

    if (existingLog?.processed) {
      logger.info('Sumsub webhook: already processed', { applicantId: event.applicantId });
      res.json({ received: true, alreadyProcessed: true });
      return;
    }

    // 5. Log the event (even if RED, for audit trail)
    const scrubbed = {
      applicantId: event.applicantId,
      reviewResult: event.reviewResult,
      reviewRejectType: event.reviewRejectType,
      country: event.country,
      // Do NOT store PII (name, DOB, document images, etc.)
    };

    if (event.reviewResult !== 'GREEN') {
      // Log rejection but don't approve
      await prisma.kycWebhookLog.upsert({
        where: {
          provider_externalId_eventType: {
            provider: 'sumsub',
            externalId: event.applicantId,
            eventType: 'applicantReviewed',
          },
        },
        create: {
          provider: 'sumsub',
          externalId: event.applicantId,
          eventType: 'applicantReviewed',
          payload: scrubbed,
          walletAddress: event.externalUserId,
          processed: true,
          result: 'rejected',
        },
        update: {
          processed: true,
          result: 'rejected',
          payload: scrubbed,
        },
      });

      logger.info('Sumsub webhook: applicant rejected', {
        applicantId: event.applicantId,
        rejectType: event.reviewRejectType,
      });

      res.json({ received: true, result: 'rejected' });
      return;
    }

    // 6. GREEN result — approve the institution
    const walletAddress = event.externalUserId; // We set this when creating the access token
    const countryCode = sumsubService.alpha3ToNumeric(event.country);

    try {
      const result = await kycApprovalService.approveInstitution({
        walletAddress,
        kycSource: 'sumsub',
        kycProviderId: event.applicantId,
        countryCode,
        metadata: scrubbed,
      });

      logger.info('Sumsub webhook: institution approved', {
        walletAddress,
        institutionId: result.institutionId,
        merkleIndex: result.merkleIndex,
      });

      res.json({ received: true, result: 'approved', institutionId: result.institutionId });
    } catch (err: any) {
      if (err instanceof AlreadyApprovedError) {
        res.json({ received: true, alreadyApproved: true });
        return;
      }

      // Institution not found — might not have registered yet.
      // Log for later reconciliation.
      logger.warn('Sumsub webhook: could not approve', {
        walletAddress,
        error: err.message,
      });

      await prisma.kycWebhookLog.upsert({
        where: {
          provider_externalId_eventType: {
            provider: 'sumsub',
            externalId: event.applicantId,
            eventType: 'applicantReviewed',
          },
        },
        create: {
          provider: 'sumsub',
          externalId: event.applicantId,
          eventType: 'applicantReviewed',
          payload: scrubbed,
          walletAddress,
          processed: false,
          result: 'error',
        },
        update: {
          processed: false,
          result: 'error',
        },
      });

      // Return 200 so Sumsub doesn't retry (we logged it for manual reconciliation)
      res.json({ received: true, result: 'error', message: err.message });
    }
  } catch (error: any) {
    logger.error('Sumsub webhook error', { error: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
