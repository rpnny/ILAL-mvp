/**
 * Blockchain Service - On-chain interactions for ZK verification and session management.
 *
 * Architecture:
 * - publicClient  → always initialized (uses public RPC) → read-only calls work without VERIFIER_PRIVATE_KEY
 * - walletClient  → initialized only if VERIFIER_PRIVATE_KEY is set → write calls (startSession)
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { RPC_URL, CONTRACTS, VERIFIER_PRIVATE_KEY } from '../config/constants.js';
import { logger } from '../config/logger.js';

// ── ABIs ──────────────────────────────────────────────────────────────────────

const sessionManagerABI = [
  {
    type: 'function', name: 'startSession',
    inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'isSessionActive',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }], stateMutability: 'view',
  },
  {
    type: 'function', name: 'getRemainingTime',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view',
  },
] as const;

const verifierABI = [
  {
    type: 'function', name: 'verifyComplianceProof',
    inputs: [{ name: 'proof', type: 'bytes' }, { name: 'publicInputs', type: 'uint256[]' }],
    outputs: [{ name: '', type: 'bool' }], stateMutability: 'view',
  },
] as const;

// ── Service ────────────────────────────────────────────────────────────────────

class BlockchainService {
  /** Always available — uses public RPC, no private key needed. */
  private readonly publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  /** Only available when VERIFIER_PRIVATE_KEY is configured. */
  private walletClient: ReturnType<typeof createWalletClient> | undefined;
  private account: ReturnType<typeof privateKeyToAccount> | undefined;

  constructor() {
    if (VERIFIER_PRIVATE_KEY) {
      this.account = privateKeyToAccount(VERIFIER_PRIVATE_KEY, { nonceManager });
      this.walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(RPC_URL),
      });
      logger.info('Blockchain service initialized (read + write)', {
        relay: this.account.address,
        rpc: RPC_URL,
      });
    } else {
      logger.warn('VERIFIER_PRIVATE_KEY not set — blockchain write features disabled (read-only mode active)');
    }
  }

  // ── Read-only (always available) ─────────────────────────────────────────────

  /**
   * Verify a ZK compliance proof on-chain (read-only, no gas needed).
   * Proof must be 768 bytes (24 × 32-byte words, BN254/PLONK).
   * Public inputs must be exactly 3 uint256 values: [userAddress, merkleRoot, issuerPubKeyHash].
   */
  async verifyProof(proof: Hex, publicInputs: bigint[]): Promise<boolean> {
    if (publicInputs.length !== 3) {
      throw new Error('publicInputs must have exactly 3 elements: [userAddress, merkleRoot, issuerPubKeyHash]');
    }

    try {
      const isValid = await this.publicClient.readContract({
        address: CONTRACTS.verifier!,
        abi: verifierABI,
        functionName: 'verifyComplianceProof',
        args: [proof, publicInputs],
      });

      logger.debug('Proof verification result', { isValid });
      return isValid as boolean;
    } catch (error: any) {
      const msg = error.shortMessage || error.message;
      logger.error('Proof verification failed', { error: msg });
      throw new Error(`Proof verification failed: ${msg}`);
    }
  }

  /**
   * Check whether a user has an active on-chain compliance session (read-only).
   */
  async isSessionActive(userAddress: Address): Promise<boolean> {
    const checksummed = getAddress(userAddress);
    try {
      return (await this.publicClient.readContract({
        address: CONTRACTS.sessionManager!,
        abi: sessionManagerABI,
        functionName: 'isSessionActive',
        args: [checksummed],
      })) as boolean;
    } catch (error: any) {
      throw new Error(`Session status check failed: ${error.shortMessage || error.message}`);
    }
  }

  /**
   * Get remaining session time in seconds for a user (read-only, returns 0 if inactive).
   */
  async getRemainingTime(userAddress: Address): Promise<number> {
    const checksummed = getAddress(userAddress);
    try {
      const remaining = await this.publicClient.readContract({
        address: CONTRACTS.sessionManager!,
        abi: sessionManagerABI,
        functionName: 'getRemainingTime',
        args: [checksummed],
      });
      return Number(remaining);
    } catch (error: any) {
      throw new Error(`Get remaining time failed: ${error.shortMessage || error.message}`);
    }
  }

  /**
   * Get latest block number (health check).
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  // ── Write (requires VERIFIER_PRIVATE_KEY + VERIFIER_ROLE on SessionManager) ──

  /**
   * Start a 24-hour compliance session on-chain for a user.
   * Requires: VERIFIER_PRIVATE_KEY set, relay wallet has VERIFIER_ROLE on SessionManager.
   */
  async startSession(userAddress: Address, durationSeconds = 24 * 60 * 60): Promise<{
    txHash: string;
    sessionExpiry: bigint;
    gasUsed: bigint;
  }> {
    if (!this.walletClient || !this.account) {
      throw new Error(
        'VERIFIER_PRIVATE_KEY is not configured — session activation is disabled. ' +
        'Set this environment variable in Railway and ensure the relay wallet has VERIFIER_ROLE on SessionManager.'
      );
    }

    const checksummed = getAddress(userAddress);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);

    logger.info('Starting compliance session', { user: checksummed, expiry: expiry.toString() });

    try {
      const hash = await this.walletClient.writeContract({
        address: CONTRACTS.sessionManager!,
        abi: sessionManagerABI,
        functionName: 'startSession',
        args: [checksummed, expiry],
        account: this.account,
        chain: baseSepolia,
      });

      logger.info('Session tx submitted', { hash });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      logger.info('Session activated', {
        hash,
        block: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      });

      return { txHash: hash, sessionExpiry: expiry, gasUsed: receipt.gasUsed };
    } catch (error: any) {
      const msg = error.shortMessage || error.message || String(error);
      // Give an actionable error when VERIFIER_ROLE is missing
      if (msg.includes('AccessControl') || msg.includes('missing role')) {
        throw new Error(
          'startSession reverted: relay wallet is missing VERIFIER_ROLE on the SessionManager contract. ' +
          `Run the GrantVerifierRole foundry script with relay address: ${this.account.address}`
        );
      }
      logger.error('Start session failed', { error: msg });
      throw new Error(`Start session failed: ${msg}`);
    }
  }

  /**
   * Execute a raw contract write (used by legacy DeFi path).
   */
  async executeContractWrite(params: {
    address: Address;
    abi: any;
    functionName: string;
    args: any[];
    value?: bigint;
    gas?: bigint;
  }): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('VERIFIER_PRIVATE_KEY not configured — contract writes disabled');
    }

    const hash = await this.walletClient.writeContract({
      ...params,
      account: this.account,
      chain: baseSepolia,
    });

    logger.info('Contract write executed', { hash, contract: params.address, fn: params.functionName });
    return hash;
  }

  /**
   * Get the relay wallet address (if configured).
   */
  getRelayAddress(): Address {
    if (!this.account) throw new Error('VERIFIER_PRIVATE_KEY not configured');
    return this.account.address;
  }
}

export const blockchainService = new BlockchainService();
