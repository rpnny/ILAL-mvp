/**
 * Blockchain Service - Preserves original relay on-chain interaction logic
 */

import { createPublicClient, createWalletClient, http, getAddress, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
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
      logger.warn('VERIFIER_PRIVATE_KEY not configured - blockchain features disabled');
      // Allow service to initialize without blockchain capabilities
      return;
    }

    this.account = privateKeyToAccount(VERIFIER_PRIVATE_KEY, { nonceManager });

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
      const isValid = await this.publicClient!.readContract({
        address: CONTRACTS.verifier!,
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
      const checksummedAddress = getAddress(userAddress);
      const isActive = await this.publicClient!.readContract({
        address: CONTRACTS.sessionManager!,
        abi: sessionManagerABI,
        functionName: 'isSessionActive',
        args: [checksummedAddress],
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
      const checksummedAddress = getAddress(userAddress);
      const remaining = await this.publicClient!.readContract({
        address: CONTRACTS.sessionManager!,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [checksummedAddress],
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
      const checksummedAddress = getAddress(userAddress);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);

      logger.info('Starting session', { userAddress: checksummedAddress, expiry: expiry.toString() });

      const hash = await this.walletClient!.writeContract({
        address: CONTRACTS.sessionManager!,
        abi: sessionManagerABI,
        functionName: 'startSession',
        args: [checksummedAddress, expiry],
      });

      logger.info('Session start transaction sent', { hash });

      const receipt = await this.publicClient!.waitForTransactionReceipt({ hash });

      logger.info('Session start confirmed', {
        hash,
        block: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
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
    return await this.publicClient!.getBlockNumber();
  }

  /**
   * Get relay account address
   */
  getRelayAddress(): Address {
    if (!this.account) throw new Error('Account not initialized');
    return this.account.address;
  }

  /**
   * Execute raw contract write (for DeFi integration)
   */
  async executeContractWrite(params: {
    address: Address;
    abi: any;
    functionName: string;
    args: any[];
    value?: bigint;
    gas?: bigint;
  }): Promise<string> {
    try {
      const hash = await this.walletClient!.writeContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        value: params.value,
        gas: params.gas,
      });

      logger.info('Contract write executed', {
        hash,
        contract: params.address,
        function: params.functionName
      });

      return hash;
    } catch (error: any) {
      logger.error('Contract write failed', { error: error.message });
      throw error;
    }
  }
}

// Singleton export
export const blockchainService = new BlockchainService();
