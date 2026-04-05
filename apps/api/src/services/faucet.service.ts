/**
 * Faucet Service
 *
 * Mints tUSDC to institutional wallets for testnet integration testing.
 * Uses the same relay wallet as the liquidity keeper — it is the tUSDC owner.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { RPC_URL, DEMO_TOKENS, VERIFIER_PRIVATE_KEY } from '../config/constants.js';
import { logger } from '../config/logger.js';
import { logTransaction } from './transaction-log.service.js';

const MINT_ABI = [
  {
    type: 'function', name: 'mint',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [], stateMutability: 'nonpayable',
  },
] as const;

/** 10,000 tUSDC (6 decimals) */
const FAUCET_AMOUNT = 10_000_000_000n;

class FaucetService {
  private publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

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
      logger.info('[FaucetService] Ready', { relay: this.account.address });
    } else {
      logger.warn('[FaucetService] VERIFIER_PRIVATE_KEY not set — faucet disabled');
    }
  }

  get available(): boolean {
    return !!this.walletClient;
  }

  /**
   * Mint tUSDC to a wallet address.
   * Returns tx hash and amount details.
   */
  async mintTestTokens(to: Address): Promise<{
    txHash: string;
    amount: string;
    formattedAmount: string;
    token: { symbol: string; address: string; decimals: number };
  }> {
    if (!this.walletClient || !this.account) {
      throw new Error(
        'Faucet unavailable — VERIFIER_PRIVATE_KEY not configured. ' +
        'The relay wallet must be the tUSDC contract owner.',
      );
    }

    logger.info('[FaucetService] Minting tUSDC', { to, amount: FAUCET_AMOUNT.toString() });

    const hash = await this.walletClient.writeContract({
      address: DEMO_TOKENS.tUSDC,
      abi: MINT_ABI,
      functionName: 'mint',
      args: [to, FAUCET_AMOUNT],
      account: this.account,
      chain: baseSepolia,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    logger.info('[FaucetService] tUSDC minted', {
      to,
      txHash: hash,
      block: receipt.blockNumber.toString(),
    });

    // Fire-and-forget audit log
    logTransaction({
      userAddress: to,
      txHash: hash,
      type: 'SWAP', // closest type — could add FAUCET later
      status: 'CONFIRMED',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      metadata: { operation: 'faucet_mint', amount: FAUCET_AMOUNT.toString(), token: 'tUSDC' },
    });

    return {
      txHash: hash,
      amount: FAUCET_AMOUNT.toString(),
      formattedAmount: '10,000 tUSDC',
      token: {
        symbol: 'tUSDC',
        address: DEMO_TOKENS.tUSDC,
        decimals: 6,
      },
    };
  }
}

export const faucetService = new FaucetService();
