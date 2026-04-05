/**
 * Transaction Log Service
 *
 * Fire-and-forget logging of on-chain operations for audit trail.
 * Failures are logged but never block the main request flow.
 */

import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface LogTransactionParams {
  userId?: string;
  userAddress: string;
  txHash: string;
  type: 'SESSION_ACTIVATION' | 'SWAP' | 'LIQUIDITY_ADD' | 'LIQUIDITY_REMOVE';
  status?: 'PENDING' | 'CONFIRMED' | 'FAILED';
  chainId?: number;
  blockNumber?: bigint;
  gasUsed?: bigint;
  metadata?: Record<string, unknown>;
}

/**
 * Record a transaction (fire-and-forget).
 * Call without await — errors are swallowed and logged.
 */
export function logTransaction(params: LogTransactionParams): void {
  prisma.transactionRecord.create({
    data: {
      userId: params.userId ?? null,
      userAddress: params.userAddress,
      txHash: params.txHash,
      type: params.type,
      status: params.status ?? 'CONFIRMED',
      chainId: params.chainId ?? 84532,
      blockNumber: params.blockNumber ?? null,
      gasUsed: params.gasUsed ?? null,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
    },
  }).catch((err: any) => {
    logger.warn('Failed to log transaction record', {
      txHash: params.txHash,
      type: params.type,
      error: err.message,
    });
  });
}

/**
 * Query transaction history for a wallet address.
 */
export async function getTransactions(
  userAddress: string,
  opts?: { type?: string; limit?: number; offset?: number },
) {
  return prisma.transactionRecord.findMany({
    where: {
      userAddress,
      ...(opts?.type && { type: opts.type }),
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
    skip: opts?.offset ?? 0,
  });
}
