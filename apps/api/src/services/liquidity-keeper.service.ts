/**
 * Liquidity Keeper Service
 *
 * Runs as a background process on API startup. Every CHECK_INTERVAL_MS it:
 *   1. Checks relay wallet session expiry — renews automatically if < RENEW_THRESHOLD.
 *   2. Probes both swap directions (WETH→tUSDC, tUSDC→WETH) via eth_call.
 *   3. If either direction fails: mints tUSDC, wraps ETH if WETH low, adds LP.
 *
 * This ensures pool depth is self-maintaining — no manual intervention needed.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, DEMO_TOKENS, RPC_URL, VERIFIER_PRIVATE_KEY } from '../config/constants.js';
import { blockchainService } from './blockchain.service.js';
import { defiService } from './defi.service.js';
import { logger } from '../config/logger.js';

// ── Tunables ─────────────────────────────────────────────────────────────────

/** How often to run the health check (ms). */
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 min

/** Renew relay session when remaining time drops below this threshold. */
const SESSION_RENEW_THRESHOLD_SECONDS = 4 * 3600; // 4 h

/** Duration to renew relay session to (seconds). */
const SESSION_RENEWAL_DURATION = 720 * 3600; // 720 h

/** Minimum WETH balance before we wrap ETH. */
const WETH_MIN_BALANCE = BigInt('50000000000000000'); // 0.05 WETH

/** How much ETH to wrap when WETH runs low (fraction of balance). */
const ETH_WRAP_FRACTION = 2n; // wrap half

/** How much tUSDC to mint each reseed (6 decimals). */
const TUSDC_MINT_AMOUNT = BigInt('5000000000000'); // 5 M tUSDC

/** Liquidity units to add per reseed. */
const LP_LIQUIDITY = BigInt('3000000000000'); // 3e12

/** Tick range to use when adding liquidity. */
const TICK_LOWER = -210000;
const TICK_UPPER = -180000;

// ── ABIs ─────────────────────────────────────────────────────────────────────

const SESSION_MANAGER_ABI = [
  {
    type: 'function', name: 'startSession',
    inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable',
  },
] as const;

const MINT_ABI = [
  {
    type: 'function', name: 'mint',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable',
  },
] as const;

const WETH_ABI = [
  { type: 'function', name: 'deposit', inputs: [], outputs: [], stateMutability: 'payable' },
  {
    type: 'function', name: 'approve',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable',
  },
] as const;

const POSITION_MANAGER_ABI = [
  {
    type: 'function', name: 'mint',
    inputs: [
      { name: 'poolKey', type: 'tuple', components: [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' },
      ]},
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
  },
] as const;

// ── Service ───────────────────────────────────────────────────────────────────

class LiquidityKeeperService {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  private readonly walletClient: ReturnType<typeof createWalletClient> | null;
  private readonly account: ReturnType<typeof privateKeyToAccount> | null;

  constructor() {
    if (VERIFIER_PRIVATE_KEY) {
      this.account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(RPC_URL),
      });
      logger.info('[LiquidityKeeper] Initialized', { relay: this.account.address });
    } else {
      this.account = null;
      this.walletClient = null;
      logger.warn('[LiquidityKeeper] VERIFIER_PRIVATE_KEY not set — keeper disabled');
    }
  }

  /** Start the keeper. Called once from server startup. */
  start(): void {
    if (!this.walletClient || !this.account) return;

    // Run immediately, then on interval
    void this.runCycle();
    this.timer = setInterval(() => void this.runCycle(), CHECK_INTERVAL_MS);
    logger.info('[LiquidityKeeper] Started', { intervalMin: CHECK_INTERVAL_MS / 60000 });
  }

  /** Stop the keeper gracefully. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('[LiquidityKeeper] Stopped');
    }
  }

  // ── Private cycle logic ───────────────────────────────────────────────────

  private async runCycle(): Promise<void> {
    if (this.running) {
      logger.debug('[LiquidityKeeper] Skipping — previous cycle still running');
      return;
    }
    this.running = true;
    try {
      await this.maintainRelaySession();
      await this.maintainPoolDepth();
    } catch (err: any) {
      logger.error('[LiquidityKeeper] Cycle error', { error: err.message });
    } finally {
      this.running = false;
    }
  }

  /**
   * Renew relay wallet session before it expires.
   * The relay wallet is used as the probe sender — if its session expires,
   * all pool health probes will return canFill=false incorrectly.
   */
  private async maintainRelaySession(): Promise<void> {
    if (!this.account || !this.walletClient) return;

    const remaining = await blockchainService.getRemainingTime(this.account.address);
    logger.debug('[LiquidityKeeper] Relay session remaining', { seconds: remaining });

    if (remaining < SESSION_RENEW_THRESHOLD_SECONDS) {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + SESSION_RENEWAL_DURATION);
      logger.info('[LiquidityKeeper] Renewing relay session', { expiresAt: new Date(Number(expiry) * 1000).toISOString() });

      const hash = await this.walletClient.writeContract({
        address: CONTRACTS.sessionManager!,
        abi: SESSION_MANAGER_ABI,
        functionName: 'startSession',
        args: [this.account.address, expiry],
        account: this.account,
        chain: baseSepolia,
      });
      await this.publicClient.waitForTransactionReceipt({ hash });
      logger.info('[LiquidityKeeper] Relay session renewed', { hash });
    }
  }

  /**
   * Probe pool depth in both directions. Reseed if either direction fails.
   */
  private async maintainPoolDepth(): Promise<void> {
    if (!this.account) return;

    const [wethTx, tusdcTx] = await Promise.all([
      defiService.buildSwapTx({
        tokenIn: DEMO_TOKENS.WETH,
        tokenOut: DEMO_TOKENS.tUSDC,
        amount: '1000000000000', // 0.000001 WETH dust
        userAddress: this.account.address,
      }),
      defiService.buildSwapTx({
        tokenIn: DEMO_TOKENS.tUSDC,
        tokenOut: DEMO_TOKENS.WETH,
        amount: '1000', // 0.001 tUSDC dust
        userAddress: this.account.address,
      }),
    ]);

    const [wethProbe, tusdcProbe] = await Promise.all([
      blockchainService.simulateCall({
        from: this.account.address,
        to: wethTx.transaction.to as Address,
        data: wethTx.transaction.data as Hex,
      }),
      blockchainService.simulateCall({
        from: this.account.address,
        to: tusdcTx.transaction.to as Address,
        data: tusdcTx.transaction.data as Hex,
      }),
    ]);

    logger.info('[LiquidityKeeper] Pool depth check', {
      wethToTusdc: wethProbe.success,
      tusdcToWeth: tusdcProbe.success,
    });

    if (!wethProbe.success || !tusdcProbe.success) {
      logger.warn('[LiquidityKeeper] Pool depth insufficient — reseeding', {
        wethToTusdcReason: wethProbe.reason,
        tusdcToWethReason: tusdcProbe.reason,
      });
      await this.reseedPool();
    }
  }

  /**
   * Mint tUSDC, wrap ETH if needed, add LP position.
   */
  private async reseedPool(): Promise<void> {
    if (!this.walletClient || !this.account) return;

    // Step 1: Mint tUSDC
    logger.info('[LiquidityKeeper] Minting tUSDC', { amount: TUSDC_MINT_AMOUNT.toString() });
    const mintHash = await this.walletClient.writeContract({
      address: DEMO_TOKENS.tUSDC,
      abi: MINT_ABI,
      functionName: 'mint',
      args: [this.account.address, TUSDC_MINT_AMOUNT],
      account: this.account,
      chain: baseSepolia,
    });
    await this.publicClient.waitForTransactionReceipt({ hash: mintHash });
    logger.info('[LiquidityKeeper] tUSDC minted', { hash: mintHash });

    // Step 2: Wrap ETH if WETH is low
    const wethBalance = await blockchainService.getTokenBalance(DEMO_TOKENS.WETH, this.account.address);
    if (wethBalance < WETH_MIN_BALANCE) {
      const ethBalance = await this.publicClient.getBalance({ address: this.account.address });
      const wrapAmount = ethBalance / ETH_WRAP_FRACTION;
      if (wrapAmount > 0n) {
        logger.info('[LiquidityKeeper] Wrapping ETH', { amount: wrapAmount.toString() });
        const wrapHash = await this.walletClient.writeContract({
          address: DEMO_TOKENS.WETH,
          abi: WETH_ABI,
          functionName: 'deposit',
          value: wrapAmount,
          account: this.account,
          chain: baseSepolia,
          args: [],
        });
        await this.publicClient.waitForTransactionReceipt({ hash: wrapHash });
        logger.info('[LiquidityKeeper] ETH wrapped', { hash: wrapHash });

        // Approve WETH for PositionManager
        const currentAllowance = await blockchainService.getTokenAllowance(
          DEMO_TOKENS.WETH,
          this.account.address,
          CONTRACTS.positionManager,
        );
        if (currentAllowance < wrapAmount) {
          const approveHash = await this.walletClient.writeContract({
            address: DEMO_TOKENS.WETH,
            abi: WETH_ABI,
            functionName: 'approve',
            args: [CONTRACTS.positionManager, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
            account: this.account,
            chain: baseSepolia,
          });
          await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
          logger.info('[LiquidityKeeper] WETH approved for PositionManager');
        }
      }
    }

    // Step 3: Add LP
    logger.info('[LiquidityKeeper] Adding LP', { tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: LP_LIQUIDITY.toString() });
    const lpHash = await this.walletClient.writeContract({
      address: CONTRACTS.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'mint',
      args: [
        {
          currency0: DEMO_TOKENS.WETH,
          currency1: DEMO_TOKENS.tUSDC,
          fee: 500,
          tickSpacing: 10,
          hooks: CONTRACTS.complianceHook,
        },
        TICK_LOWER,
        TICK_UPPER,
        LP_LIQUIDITY,
        '0x' as Hex,
      ],
      account: this.account,
      chain: baseSepolia,
      gas: 5000000n,
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: lpHash });
    logger.info('[LiquidityKeeper] Pool reseeded', { hash: lpHash, gasUsed: receipt.gasUsed.toString() });
  }
}

export const liquidityKeeper = new LiquidityKeeperService();
