#!/usr/bin/env npx tsx
/**
 * ILAL Institutional API Quickstart
 *
 * Complete flow: activate session -> get tUSDC -> approve -> swap
 *
 * Usage:
 *   API_KEY=ilal_live_... PRIVATE_KEY=0x... npx tsx quickstart.ts
 */

import { createWalletClient, createPublicClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// ── Config ──────────────────────────────────────────────────────
const API = process.env.API_URL || 'https://ilal-mvp-production.up.railway.app';
const API_KEY = process.env.API_KEY!;
const PRIVATE_KEY = process.env.PRIVATE_KEY! as Hex;

if (!API_KEY || !PRIVATE_KEY) {
  console.error('Usage: API_KEY=... PRIVATE_KEY=0x... npx tsx quickstart.ts');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const WALLET = account.address;
const headers = { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };

const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

const TUSDC = '0xa486Fb51ED09B970A23F7Fe910bc90089f78424D';

// ── Helpers ─────────────────────────────────────────────────────
async function post(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function signAndBroadcast(tx: { to: string; data: string; value: string; gas: string }) {
  const hash = await wallet.sendTransaction({
    to: tx.to as Hex,
    data: tx.data as Hex,
    value: BigInt(tx.value),
    gas: BigInt(tx.gas),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, blockNumber: receipt.blockNumber };
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log(`\nWallet: ${WALLET}\n`);

  // 1. Activate session
  console.log('1. Activating compliance session...');
  const activate = await post('/api/v1/testnet/activate', { walletAddress: WALLET });
  console.log(`   ${activate.alreadyActive ? 'Already active' : `TX: ${activate.txHash}`}\n`);

  // 2. Get tUSDC
  console.log('2. Requesting tUSDC from faucet...');
  try {
    const faucet = await post('/api/v1/testnet/faucet', { walletAddress: WALLET });
    console.log(`   Minted ${faucet.formattedAmount} - TX: ${faucet.txHash}\n`);
  } catch (e: any) {
    console.log(`   Skipped (already claimed today)\n`);
  }

  // 3. Approve tUSDC
  console.log('3. Approving tUSDC for SwapRouter...');
  const approveRes = await post('/api/v1/defi/approve', {
    token: TUSDC, operation: 'swap', amount: '10000000000', userAddress: WALLET,
  });
  if (approveRes.allowance?.alreadySufficient) {
    console.log('   Already approved\n');
  } else {
    const { hash } = await signAndBroadcast(approveRes.transaction);
    console.log(`   Approved - TX: ${hash}\n`);
  }

  // 4. Swap 100 tUSDC -> WETH
  console.log('4. Swapping 100 tUSDC -> WETH...');
  const swapRes = await post('/api/v1/defi/swap', {
    tokenIn: TUSDC,
    tokenOut: '0x4200000000000000000000000000000000000006',
    amount: '100000000', // 100 tUSDC
    userAddress: WALLET,
  });

  if (!swapRes.preflight?.canBroadcastSafely) {
    console.log('   WARNING: Preflight says TX may fail:', swapRes.preflight?.simulation?.reason);
  }

  const { hash, blockNumber } = await signAndBroadcast(swapRes.transaction);
  console.log(`   Swapped! TX: ${hash} (block ${blockNumber})`);
  console.log(`   Explorer: https://sepolia.basescan.org/tx/${hash}\n`);

  console.log('Done! Full flow completed successfully.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
