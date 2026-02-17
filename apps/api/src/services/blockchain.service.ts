/**
 * Blockchain Service - Preserves original relay on-chain interaction logic
 */

import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { RPC_URL, CONTRACTS, VERIFIER_PRIVATE_KEY } from '../config/constants.js';
import { logger } from '../config/logger.js';

// SessionManager ABI
const sessionManagerABI = [
  { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getRemainingTime', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

// PlonkVerifierAdapter ABI
const verifierABI = [
  { type: 'function', name: 'verifyComplianceProof', inputs: [{ name: 'proof', type: 'bytes' }, { name: 'publicInputs', type: 'uint256[]' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const;

class BlockchainService {
  private publicClient;
  private walletClient;
  private account;

  constructor() {
    if (!VERIFIER_PRIVATE_KEY) {
      throw new Error('VERIFIER_PRIVATE_KEY not configured');
    }

    this.account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    logger.info('Blockchain service initialized', {
      account: this.account.address,
      rpc: RPC_URL,
    });
  }

  /**
   * Verify ZK Proof (on-chain read-only call)
   */
  async verifyProof(proof: Hex, publicInputs: bigint[]): Promise<boolean> {
    try {
      const isValid = await this.publicClient.readContract({
        address: CONTRACTS.verifier,
        abi: verifierABI,
        functionName: 'verifyComplianceProof',
        args: [proof, publicInputs],
      });

      logger.debug('Proof verification result', { isValid });
      return isValid as boolean;
    } catch (error: any) {
      logger.error('Proof verification failed', { error: error.message });
      throw new Error(`Proof verification failed: ${error.message}`);
    }
  }

  /**
   * Check if user has an active session
   */
  async isSessionActive(userAddress: Address): Promise<boolean> {
    try {
      const isActive = await this.publicClient.readContract({
        address: CONTRACTS.sessionManager,
        abi: sessionManagerABI,
        functionName: 'isSessionActive',
        args: [userAddress],
      });

      return isActive as boolean;
    } catch (error: any) {
      logger.error('Session status check failed', { error: error.message });
      throw new Error(`Session status check failed: ${error.message}`);
    }
  }

  /**
   * Get session remaining time
   */
  async getRemainingTime(userAddress: Address): Promise<number> {
    try {
      const remaining = await this.publicClient.readContract({
        address: CONTRACTS.sessionManager,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [userAddress],
      });

      return Number(remaining);
    } catch (error: any) {
      logger.error('Get remaining time failed', { error: error.message });
      throw new Error(`Get remaining time failed: ${error.message}`);
    }
  }

  /**
   * Activate session (on-chain transaction)
   */
  async startSession(userAddress: Address, durationSeconds: number = 24 * 60 * 60): Promise<{
    txHash: string;
    sessionExpiry: bigint;
    gasUsed: bigint;
  }> {
    try {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);

      logger.info('Starting session', { userAddress, expiry });

      const hash = await this.walletClient.writeContract({
        address: CONTRACTS.sessionManager,
        abi: sessionManagerABI,
        functionName: 'startSession',
        args: [userAddress, expiry],
      });

      logger.info('Session start transaction sent', { hash });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      logger.info('Session start confirmed', {
        hash,
        block: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      });

      return {
        txHash: hash,
        sessionExpiry: expiry,
        gasUsed: receipt.gasUsed,
      };
    } catch (error: any) {
      logger.error('Start session failed', { error: error.message });
      throw new Error(`Start session failed: ${error.shortMessage || error.message}`);
    }
  }

  /**
   * Get current block number (for health check)
   */
  async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * Get relay account address
   */
  getRelayAddress(): Address {
    return this.account.address;
  }
}

// Singleton export
export const blockchainService = new BlockchainService();
