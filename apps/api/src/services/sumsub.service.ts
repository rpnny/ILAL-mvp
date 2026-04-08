/**
 * Sumsub Service — KYC identity verification via Sumsub
 *
 * Handles:
 *  - Generating WebSDK access tokens (HMAC-SHA256 signed API requests)
 *  - Verifying webhook signatures (HMAC-SHA1 on raw body)
 *  - Parsing applicantReviewed webhook events
 *
 * Docs: https://docs.sumsub.com/reference
 */

import crypto from 'node:crypto';
import {
  SUMSUB_APP_TOKEN,
  SUMSUB_SECRET_KEY,
  SUMSUB_BASE_URL,
  SUMSUB_WEBHOOK_SECRET,
  SUMSUB_LEVEL_NAME,
} from '../config/constants.js';
import { logger } from '../config/logger.js';

// ── Types ────────────────────────────────────────────────────────

export interface SumsubAccessToken {
  token: string;
  userId: string;
}

export interface ApplicantReviewedEvent {
  applicantId: string;
  externalUserId: string;     // = walletAddress (set during token creation)
  reviewResult: 'GREEN' | 'RED';
  reviewRejectType?: string;  // FINAL | RETRY
  country?: string;           // ISO 3166-1 alpha-3
  moderationComment?: string;
}

// ── Configuration check ──────────────────────────────────────────

function ensureConfigured(): void {
  if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
    throw new Error('Sumsub is not configured. Set SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY.');
  }
}

// ── HMAC-SHA256 signed request (Sumsub API auth) ─────────────────

/**
 * Sign an API request to Sumsub using HMAC-SHA256.
 * Sumsub requires: ts + httpMethod + urlPath + body → signed with secret key.
 */
function signRequest(method: string, urlPath: string, body?: string): {
  ts: string;
  signature: string;
} {
  const ts = Math.floor(Date.now() / 1000).toString();
  const data = ts + method.toUpperCase() + urlPath + (body || '');
  const signature = crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(data).digest('hex');
  return { ts, signature };
}

async function sumsubFetch<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
  ensureConfigured();

  const bodyStr = body ? JSON.stringify(body) : undefined;
  const { ts, signature } = signRequest(method, path, bodyStr);

  const res = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-App-Token': SUMSUB_APP_TOKEN,
      'X-App-Access-Ts': ts,
      'X-App-Access-Sig': signature,
    },
    body: bodyStr,
  });

  if (!res.ok) {
    const errBody = await res.text();
    logger.error('Sumsub API error', { status: res.status, path, body: errBody });
    throw new Error(`Sumsub API error ${res.status}: ${errBody}`);
  }

  return res.json();
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Create an access token for the Sumsub WebSDK.
 *
 * The externalUserId is the wallet address — this creates the link
 * between Sumsub's applicant and our Institution record.
 */
export async function createAccessToken(externalUserId: string, levelName?: string): Promise<SumsubAccessToken> {
  const level = levelName || SUMSUB_LEVEL_NAME;
  const path = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${encodeURIComponent(level)}&ttlInSecs=1200`;

  const result = await sumsubFetch<{ token: string; userId: string }>('POST', path);

  logger.info('Sumsub access token created', { externalUserId, level });

  return {
    token: result.token,
    userId: result.userId,
  };
}

/**
 * Verify a Sumsub webhook signature.
 *
 * Sumsub signs webhook payloads with HMAC-SHA1 using SUMSUB_WEBHOOK_SECRET.
 * The signature is sent in the `x-payload-digest` header (or `x-payload-digest-alg` = HMAC_SHA1_HEX).
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
  if (!SUMSUB_WEBHOOK_SECRET) {
    logger.error('SUMSUB_WEBHOOK_SECRET not configured');
    return false;
  }

  const expected = crypto
    .createHmac('sha1', SUMSUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signatureHeader, 'hex'),
  );
}

/**
 * Parse an applicantReviewed webhook event.
 *
 * Returns structured data or null if the event type is not applicantReviewed.
 */
export function parseApplicantReviewed(payload: Record<string, any>): ApplicantReviewedEvent | null {
  if (payload.type !== 'applicantReviewed') {
    return null;
  }

  const reviewResult = payload.reviewResult?.reviewAnswer;
  if (reviewResult !== 'GREEN' && reviewResult !== 'RED') {
    logger.warn('Sumsub webhook: unexpected reviewAnswer', { answer: reviewResult });
    return null;
  }

  // Extract country from fixedInfo or info
  const info = payload.applicantMemberOf?.[0] || {};
  const country: string | undefined =
    payload.fixedInfo?.country ||
    payload.info?.country ||
    info.country ||
    undefined;

  return {
    applicantId: payload.applicantId,
    externalUserId: payload.externalUserId,
    reviewResult,
    reviewRejectType: payload.reviewResult?.reviewRejectType,
    country,
    moderationComment: payload.reviewResult?.moderationComment,
  };
}

/**
 * Get applicant status from Sumsub (for polling / manual check).
 */
export async function getApplicantStatus(applicantId: string): Promise<{
  id: string;
  externalUserId: string;
  reviewStatus: string;
  reviewResult?: { reviewAnswer: string };
}> {
  return sumsubFetch('GET', `/resources/applicants/${encodeURIComponent(applicantId)}/one`);
}

/**
 * Convert ISO 3166-1 alpha-3 country code (from Sumsub) to numeric code.
 * Returns 840 (USA) as default if not found.
 */
export function alpha3ToNumeric(alpha3: string | undefined): number {
  if (!alpha3) return 840;
  const map: Record<string, number> = {
    USA: 840, GBR: 826, CAN: 124, AUS: 36, DEU: 276, FRA: 250, JPN: 392,
    KOR: 410, SGP: 702, HKG: 344, CHE: 756, NLD: 528, SWE: 752, NOR: 578,
    DNK: 208, FIN: 246, IRL: 372, NZL: 554, BRA: 76, MEX: 484, IND: 356,
    CHN: 156, TWN: 158, ARE: 784, SAU: 682, ISR: 376, ZAF: 710, NGA: 566,
    // Sanctioned (included for mapping completeness; blocked at approval stage)
    PRK: 408, IRN: 364, SYR: 760, CUB: 192, RUS: 643, BLR: 112,
  };
  return map[alpha3.toUpperCase()] ?? 840;
}
