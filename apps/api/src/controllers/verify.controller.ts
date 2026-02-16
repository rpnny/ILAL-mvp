/**
 * 验证控制器 - ZK Proof 验证和 Session 激活
 * 核心功能来自原 relay 服务
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { type Address, type Hex } from 'viem';
import { blockchainService } from '../services/blockchain.service.js';
import { logger } from '../config/logger.js';

// 请求验证 schemas
const verifySchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  proof: z.string(), // hex-encoded proof bytes
  publicInputs: z.array(z.string()), // decimal string array
});

const sessionStatusSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

/**
 * 验证 ZK Proof 并激活 Session
 * POST /api/v1/verify
 * 
 * 原 relay 的核心功能
 */
export async function verifyAndActivate(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    // 验证请求体
    const body = verifySchema.parse(req.body);
    const userAddress = body.userAddress as Address;

    logger.info('Verify request received', { userAddress });

    // 1. 检查是否已有活跃 Session
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

    // 2. 链上验证 ZK Proof
    logger.debug('Verifying proof on-chain', { userAddress });

    const proofHex = (body.proof.startsWith('0x') ? body.proof : `0x${body.proof}`) as Hex;
    const inputs = body.publicInputs.map(s => BigInt(s));

    let isValid: boolean;
    try {
      isValid = await blockchainService.verifyProof(proofHex, inputs);
    } catch (err: any) {
      logger.error('Proof verification failed', { error: err.message });
      res.status(400).json({
        success: false,
        error: 'Proof verification failed',
        message: err.message,
      });
      return;
    }

    if (!isValid) {
      logger.warn('Proof rejected by verifier', { userAddress });
      res.status(400).json({
        success: false,
        error: 'Invalid proof',
        message: 'ZK Proof verification failed',
      });
      return;
    }

    logger.info('Proof verified successfully', { userAddress });

    // 3. 激活链上 Session
    logger.debug('Activating session', { userAddress });

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
      res.status(500).json({
        success: false,
        error: 'Session activation failed',
        message: err.message,
      });
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
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Verification failed',
    });
  }
}

/**
 * 查询 Session 状态
 * GET /api/v1/session/:address
 */
export async function getSessionStatus(req: Request, res: Response): Promise<void> {
  try {
    const address = req.params.address;

    // 验证地址格式
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid Ethereum address',
      });
      return;
    }

    const userAddress = address as Address;

    // 查询链上状态
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
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve session status',
    });
  }
}

/**
 * 健康检查
 * GET /api/v1/health
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const block = await blockchainService.getBlockNumber();
    const relayAddress = blockchainService.getRelayAddress();

    res.json({
      status: 'ok',
      service: 'ILAL API',
      relay: relayAddress,
      network: 'base-sepolia',
      latestBlock: block.toString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      service: 'ILAL API',
      error: error.message,
    });
  }
}
