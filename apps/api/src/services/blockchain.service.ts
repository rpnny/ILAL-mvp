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
  keccak256,
  encodeAbiParameters,
  hexToBigInt,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { RPC_URL, CONTRACTS, VERIFIER_PRIVATE_KEY } from '../config/constants.js';
import { logger } from '../config/logger.js';
import { logTransaction } from './transaction-log.service.js';

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

  // ── Retry helper ─────────────────────────────────────────────────────────────

  /**
   * Retry an async operation with exponential backoff.
   * Only retries on transient RPC errors, not on deterministic reverts.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const msg = (error.shortMessage || error.message || '').toLowerCase();
        const isTransient =
          msg.includes('timeout') ||
          msg.includes('econnrefused') ||
          msg.includes('econnreset') ||
          msg.includes('429') ||
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('rate limit') ||
          msg.includes('fetch failed');

        if (!isTransient || attempt === maxAttempts) throw error;

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`RPC call failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, {
          error: msg,
        });
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('unreachable');
  }

  // ── Read-only (always available) ─────────────────────────────────────────────

  /**
   * Verify a ZK compliance proof on-chain (read-only, no gas needed).
   * Proof must be 768 bytes (24 × 32-byte words, BN254/PLONK).
   * Public inputs must be exactly 5 uint256 values: [userAddress, merkleRoot, issuerAx, issuerAy, timestamp].
   */
  async verifyProof(proof: Hex, publicInputs: bigint[]): Promise<boolean> {
    if (publicInputs.length !== 5) {
      throw new Error('publicInputs must have exactly 5 elements: [userAddress, merkleRoot, issuerAx, issuerAy, timestamp]');
    }

    try {
      const isValid = await this.withRetry(() =>
        this.publicClient.readContract({
          address: CONTRACTS.verifier!,
          abi: verifierABI,
          functionName: 'verifyComplianceProof',
          args: [proof, publicInputs],
        })
      );

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
      return (await this.withRetry(() =>
        this.publicClient.readContract({
          address: CONTRACTS.sessionManager!,
          abi: sessionManagerABI,
          functionName: 'isSessionActive',
          args: [checksummed],
        })
      )) as boolean;
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
      const remaining = await this.withRetry(() =>
        this.publicClient.readContract({
          address: CONTRACTS.sessionManager!,
          abi: sessionManagerABI,
          functionName: 'getRemainingTime',
          args: [checksummed],
        })
      );
      return Number(remaining);
    } catch (error: any) {
      throw new Error(`Get remaining time failed: ${error.shortMessage || error.message}`);
    }
  }

  /**
   * Get latest block number (health check).
   */
  async getBlockNumber(): Promise<bigint> {
    return this.withRetry(() => this.publicClient.getBlockNumber());
  }

  /**
   * Read an ERC-20 token's allowance for (owner, spender).
   */
  async getTokenAllowance(token: Address, owner: Address, spender: Address): Promise<bigint> {
    try {
      return (await this.publicClient.readContract({
        address: token,
        abi: [{
          type: 'function', name: 'allowance',
          inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        }] as const,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint;
    } catch (error: any) {
      logger.warn('Token allowance check failed', { token, owner, spender, error: error.message });
      return 0n;
    }
  }

  /**
   * Read an ERC-20 token balance for an address.
   */
  async getTokenBalance(token: Address, owner: Address): Promise<bigint> {
    try {
      return (await this.publicClient.readContract({
        address: token,
        abi: [{
          type: 'function', name: 'balanceOf',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        }] as const,
        functionName: 'balanceOf',
        args: [owner],
      })) as bigint;
    } catch (error: any) {
      logger.warn('Token balance check failed', { token, owner, error: error.message });
      return 0n;
    }
  }

  /**
   * Get native ETH balance for an address.
   */
  async getEthBalance(address: Address): Promise<bigint> {
    try {
      return await this.publicClient.getBalance({ address });
    } catch (error: any) {
      logger.warn('ETH balance check failed', { address, error: error.message });
      return 0n;
    }
  }

  // ── Shared revert selector map ────────────────────────────────────────────────

  private static readonly KNOWN_SELECTORS: Record<string, { reason: string; category: string }> = {
    // Pool / swap errors
    '0xbb2875c3': { reason: 'InsufficientOutput — pool cannot fill this amount at current price. Reduce swap size or wait for more liquidity.', category: 'pool_depth' },
    '0x7c9c6e8f': { reason: 'PRICE_LIMIT — pool liquidity exhausted in this direction. The pool tick has hit the boundary of available liquidity.', category: 'pool_depth' },
    '0x39d35496': { reason: 'PoolNotInitialized — the token pair pool does not exist on this ComplianceHook.', category: 'pool_config' },
    '0xfb8f41b2': { reason: 'InvalidTick — tick parameter is out of range for this pool.', category: 'params' },
    // ERC-20 errors
    '0x13be252b': { reason: 'ERC20: insufficient allowance — approve the token to the router/manager first.', category: 'allowance' },
    '0xf4d678b8': { reason: 'ERC20: insufficient balance — wallet does not hold enough of the input token.', category: 'balance' },
    '0xe450d38c': { reason: 'ERC20: transfer amount exceeds balance.', category: 'balance' },
    // ComplianceHook errors
    '0xb12c8f91': { reason: 'NotVerified — wallet does not have an active compliance session, or the router did not properly encode user identity (hookData). Ensure session is active and the contract is registered as an identity router.', category: 'session' },
    '0x8d4b1b19': { reason: 'IdentityRouterRequired — the calling contract is not registered as an identity router in the Registry. The PositionManager or SwapRouter may need whitelisting via UpgradeRegistry script.', category: 'hook_config' },
    '0x8f1186d2': { reason: 'RouterNotApproved — the calling router is not approved in the Registry. Whitelist it via Registry.approveRouter().', category: 'hook_config' },
    '0x584a7938': { reason: 'InvalidCaller — the router is not authorized to call the hook.', category: 'hook_config' },
    '0xd59b569a': { reason: 'InvalidHookData — hookData format is invalid. Expected empty (Mode 2/3) or >= 148 bytes (Mode 1 EIP-712 permit).', category: 'hook_config' },
    '0x4cb3183d': { reason: 'EmergencyPaused — the protocol is in emergency pause mode. Contact the ILAL team.', category: 'hook_config' },
    '0x2f6c6a6f': { reason: 'Compliance session not active or expired for this wallet.', category: 'session' },
  };

  /**
   * Parse a revert error into a structured { reason, category } using KNOWN_SELECTORS.
   */
  private parseRevertError(error: any): { reason: string; category: string } {
    const revertData: string | undefined =
      error?.cause?.data ?? error?.data ?? error?.cause?.cause?.data;
    const shortMsg: string = error?.shortMessage ?? error?.message ?? 'unknown';

    let selector: string | undefined;
    if (revertData && typeof revertData === 'string' && revertData.startsWith('0x') && revertData.length >= 10) {
      selector = revertData.slice(0, 10);
    }
    if (!selector) {
      const hexMatch = shortMsg.match(/0x[0-9a-fA-F]{8}/);
      if (hexMatch) selector = hexMatch[0];
    }

    const known = selector ? BlockchainService.KNOWN_SELECTORS[selector] : undefined;
    if (known) return known;

    if (shortMsg.includes('reverted') && !shortMsg.includes('unknown')) {
      return { reason: shortMsg, category: 'unknown' };
    }

    return {
      reason: `Simulation reverted. ${revertData ? `Data: ${revertData.slice(0, 74)}` : shortMsg}`,
      category: 'unknown',
    };
  }

  /**
   * Simulate a transaction via eth_call with the given sender.
   * Returns { success: true } if the call succeeds, or { success: false, reason } if it reverts.
   * This is the most reliable way to check if a TX will succeed given current on-chain state.
   */
  async simulateCall(params: {
    from: Address;
    to: Address;
    data: Hex;
    value?: bigint;
  }): Promise<{ success: boolean; reason?: string; category?: string }> {
    try {
      await this.publicClient.call({
        account: params.from,
        to: params.to,
        data: params.data,
        value: params.value ?? 0n,
      });
      return { success: true };
    } catch (error: any) {
      const parsed = this.parseRevertError(error);
      return { success: false, reason: parsed.reason, category: parsed.category };
    }
  }

  /**
   * Simulate a transaction and return the raw return data on success.
   * Used for quote / estimateOutput — we need the actual return value, not just success/fail.
   */
  async simulateCallWithReturn(params: {
    from: Address;
    to: Address;
    data: Hex;
    value?: bigint;
  }): Promise<{ success: boolean; returnData?: Hex; reason?: string; category?: string }> {
    try {
      const result = await this.publicClient.call({
        account: params.from,
        to: params.to,
        data: params.data,
        value: params.value ?? 0n,
      });
      return { success: true, returnData: result.data };
    } catch (error: any) {
      const parsed = this.parseRevertError(error);
      return { success: false, reason: parsed.reason, category: parsed.category };
    }
  }

  /**
   * Read decimals of an ERC-20 token.
   */
  async getTokenDecimals(token: Address): Promise<number> {
    try {
      const decimals = await this.publicClient.readContract({
        address: token,
        abi: [{
          type: 'function', name: 'decimals',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
          stateMutability: 'view',
        }] as const,
        functionName: 'decimals',
      });
      return Number(decimals);
    } catch {
      return 18;
    }
  }

  /**
   * Read the current sqrtPriceX96 from the Uniswap v4 PoolManager via extsload.
   *
   * The deployed PoolManager does not expose a getSlot0() view function.
   * Instead we use the EIP-2330 `extsload` interface to read raw storage:
   *   - poolId = keccak256(abi.encode(poolKey))
   *   - slot   = keccak256(abi.encode(poolId, POOLS_MAPPING_SLOT))
   *   - The slot packs: sqrtPriceX96 (uint160, bits 0-159) | tick (int24) | protocolFee | lpFee
   *
   * Returns 0n if the pool is not initialized or the call fails.
   */
  async getPoolSqrtPrice(poolKey: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
  }): Promise<bigint> {
    // Storage slot of `mapping(PoolId => Pool.State) _pools` in the deployed PoolManager.
    // Verified empirically against the Base Sepolia deployment at 0x05E73354...
    const POOLS_MAPPING_SLOT = 6n;

    try {
      const poolId = keccak256(encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'address' },
          { type: 'uint24' },
          { type: 'int24' },
          { type: 'address' },
        ],
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
      ));

      // Slot 0 of the Pool.State struct within the mapping
      const stateSlot = keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [poolId, POOLS_MAPPING_SLOT],
      ));

      const raw = await this.publicClient.readContract({
        address: CONTRACTS.poolManager,
        abi: [{
          type: 'function', name: 'extsload',
          inputs: [{ name: 'slot', type: 'bytes32' }],
          outputs: [{ name: '', type: 'bytes32' }],
          stateMutability: 'view',
        }] as const,
        functionName: 'extsload',
        args: [stateSlot],
      });

      // sqrtPriceX96 is stored in bits 0-159 (lowest 160 bits)
      const sqrtPriceX96 = hexToBigInt(raw) & ((1n << 160n) - 1n);

      logger.info('Pool sqrtPriceX96 fetched', {
        poolId,
        sqrtPriceX96: sqrtPriceX96.toString(),
      });

      return sqrtPriceX96;
    } catch (error: any) {
      logger.warn('Failed to fetch pool sqrtPriceX96 via extsload', {
        poolManager: CONTRACTS.poolManager,
        error: error.message,
      });
      return 0n;
    }
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

      const receipt = await this.withRetry(() =>
        this.publicClient.waitForTransactionReceipt({ hash })
      );

      logger.info('Session activated', {
        hash,
        block: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      });

      // Fire-and-forget transaction log
      logTransaction({
        userAddress: checksummed,
        txHash: hash,
        type: 'SESSION_ACTIVATION',
        status: 'CONFIRMED',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        metadata: { expiry: expiry.toString(), durationSeconds },
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
      if (msg.includes('InactiveVerifier')) {
        throw new Error(
          'startSession reverted: relay wallet is not an active verifier in Registry. ' +
          'Ensure the issuer is still active and its verifier address matches the relay wallet.'
        );
      }
      logger.error('Start session failed', { error: msg });
      throw new Error(`Start session failed: ${msg}`);
    }
  }

  /**
   * Execute a contract write restricted to the SessionManager.startSession function.
   * The relay wallet's VERIFIER_ROLE must not be used for arbitrary contract calls.
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

    const ALLOWED_CALLS: Record<string, string[]> = {
      [CONTRACTS.sessionManager!.toLowerCase()]: ['startSession'],
    };

    const allowedFns = ALLOWED_CALLS[params.address.toLowerCase()];
    if (!allowedFns || !allowedFns.includes(params.functionName)) {
      throw new Error(
        `Blocked: relay wallet may only call whitelisted functions. ` +
        `Attempted: ${params.address}.${params.functionName}`
      );
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
