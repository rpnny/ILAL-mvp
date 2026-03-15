/**
 * ILAL Institutional Benchmark — SDK vs API 真实链上对比实验
 *
 * 在 Base Sepolia 上执行真实交易，对比两种机构接入模式:
 *   Phase 1: 环境检查 & 钱包状态
 *   Phase 2: SDK 直连模式 — 3 Swap + 1 Add Liquidity
 *   Phase 3: API 中继模式 — 3 Swap + 1 Add Liquidity
 *   Phase 4: 生成对比报告 (Markdown)
 *
 * Usage:
 *   pnpm dev:api  (先在另一个终端启动 API)
 *   PRIVATE_KEY=0x... npx tsx scripts/institutional-benchmark.ts
 */

import {
  createPublicClient, createWalletClient, http,
  formatEther, formatUnits, parseUnits, parseEther,
  encodeAbiParameters, keccak256, concat, encodeFunctionData,
  type Address, type Hex, type Hash, type TransactionReceipt,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════
//  Configuration
// ═══════════════════════════════════════════════════════════

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';

const envPath = path.join(__dirname, '../apps/api/.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const PRIVATE_KEY = (
  process.env.PRIVATE_KEY ||
  envContent.match(/VERIFIER_PRIVATE_KEY=["']?(.+?)["']?\s*$/m)?.[1]?.trim() ||
  ''
) as Hex;

if (!PRIVATE_KEY) {
  console.error('PRIVATE_KEY or VERIFIER_PRIVATE_KEY required');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

// ═══════════════════════════════════════════════════════════
//  Contract Addresses & Pool Config
// ═══════════════════════════════════════════════════════════

const ADDR = {
  registry:        '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager:  '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  hook:            '0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80' as Address,
  swapRouter:      '0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73' as Address,
  positionManager: '0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6' as Address,
  poolManager:     '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  USDC:            '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH:            '0x4200000000000000000000000000000000000006' as Address,
};

const POOL_KEY = {
  currency0: ADDR.USDC,
  currency1: ADDR.WETH,
  fee: 500,
  tickSpacing: 10,
  hooks: ADDR.hook,
};

// ═══════════════════════════════════════════════════════════
//  ABIs
// ═══════════════════════════════════════════════════════════

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
] as const;

const REGISTRY_ABI = [
  { type: 'function', name: 'emergencyPaused', inputs: [], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'isRouterApproved', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getSessionTTL', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const SESSION_ABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'sessionExpiry', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const HOOK_ABI = [
  { type: 'function', name: 'getNonce', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getDomainSeparator', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SWAP_PERMIT_TYPEHASH', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'isUserAllowed', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const;

const SWAP_ABI = [{
  type: 'function', name: 'swap',
  inputs: [
    { name: 'key', type: 'tuple', components: [
      { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
      { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
    ]},
    { name: 'params', type: 'tuple', components: [
      { name: 'zeroForOne', type: 'bool' }, { name: 'amountSpecified', type: 'int256' }, { name: 'sqrtPriceLimitX96', type: 'uint160' },
    ]},
    { name: 'hookData', type: 'bytes' },
    { name: 'minAmountOut', type: 'uint128' },
  ],
  outputs: [{ name: '', type: 'int256' }],
  stateMutability: 'payable',
}] as const;

const POSITION_MANAGER_ABI = [
  {
    type: 'function', name: 'mint',
    inputs: [
      { name: 'poolKey', type: 'tuple', components: [
        { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
      ]},
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  { type: 'function', name: 'nextTokenId', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'event', name: 'PositionMinted', inputs: [
    { name: 'tokenId', type: 'uint256', indexed: true },
    { name: 'owner', type: 'address', indexed: true },
    { name: 'currency0', type: 'address', indexed: false },
    { name: 'currency1', type: 'address', indexed: false },
    { name: 'liquidity', type: 'uint128', indexed: false },
    { name: 'tickLower', type: 'int24', indexed: false },
    { name: 'tickUpper', type: 'int24', indexed: false },
  ]},
] as const;

// ═══════════════════════════════════════════════════════════
//  Types & Metrics
// ═══════════════════════════════════════════════════════════

interface TxRecord {
  mode: 'SDK' | 'API';
  operation: 'swap' | 'liquidity';
  label: string;
  status: 'success' | 'failed' | 'reverted';
  hash?: string;
  block?: bigint;
  gasUsed?: bigint;
  totalLatencyMs: number;
  apiLatencyMs?: number;
  chainLatencyMs?: number;
  error?: string;
}

interface Balances { eth: bigint; usdc: bigint; weth: bigint }

const results: TxRecord[] = [];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

async function getBalances(): Promise<Balances> {
  const [eth, usdc, weth] = await Promise.all([
    pub.getBalance({ address: account.address }),
    pub.readContract({ address: ADDR.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    pub.readContract({ address: ADDR.WETH, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
  ]);
  return { eth, usdc, weth };
}

function fmtBal(b: Balances) {
  return `ETH=${formatEther(b.eth)} | USDC=${formatUnits(b.usdc, 6)} | WETH=${formatEther(b.weth)}`;
}

async function buildSwapPermit(): Promise<Hex> {
  const [nonce, ds, th] = await Promise.all([
    pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] }),
    pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getDomainSeparator' }),
    pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'SWAP_PERMIT_TYPEHASH' }),
  ]);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const structHash = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }],
    [th, account.address, deadline, nonce],
  ));
  const digest = keccak256(concat(['0x1901' as Hex, ds, structHash]));
  const sig = await account.sign({ hash: digest });
  return encodeAbiParameters(
    [{ type: 'tuple', components: [
      { name: 'user', type: 'address' }, { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }, { name: 'signature', type: 'bytes' },
    ]}],
    [{ user: account.address, deadline, nonce, signature: sig }],
  );
}

async function ensureApproval(token: Address, spender: Address, needed: bigint, label: string) {
  const allow = await pub.readContract({ address: token, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, spender] });
  if (allow < needed) {
    console.log(`  Approving ${label}...`);
    const tx = await wallet.writeContract({ address: token, abi: ERC20_ABI, functionName: 'approve', args: [spender, parseEther('1000')] });
    await pub.waitForTransactionReceipt({ hash: tx });
    console.log(`  Approved: ${tx.slice(0, 22)}...`);
    await sleep(2000);
  }
}

async function apiCall(method: string, path: string, body?: any, auth?: string): Promise<{ status: number; data: any; ms: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth?.startsWith('ApiKey ')) headers['X-API-Key'] = auth.replace('ApiKey ', '');
  else if (auth) headers['Authorization'] = auth;
  const t0 = Date.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = Date.now() - t0;
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, ms };
}

// ═══════════════════════════════════════════════════════════
//  SDK Mode: Swap (EIP-712 Permit)
// ═══════════════════════════════════════════════════════════

const MIN_SQRT_PRICE = 4295128740n;
const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341n;

async function sdkSwap(amount: bigint, zeroForOne: boolean, label: string): Promise<TxRecord> {
  const t0 = Date.now();
  try {
    const hookData = await buildSwapPermit();
    const tChain = Date.now();
    const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE;
    const tx = await wallet.writeContract({
      address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
      args: [POOL_KEY, { zeroForOne, amountSpecified: -amount, sqrtPriceLimitX96 }, hookData, 0n],
    });
    const receipt = await pub.waitForTransactionReceipt({ hash: tx });
    const chainMs = Date.now() - tChain;
    const totalMs = Date.now() - t0;
    const rec: TxRecord = { mode: 'SDK', operation: 'swap', label, status: 'success', hash: tx, block: receipt.blockNumber, gasUsed: receipt.gasUsed, totalLatencyMs: totalMs, chainLatencyMs: chainMs };
    results.push(rec);
    console.log(`  ✅ ${label}: hash=${tx.slice(0, 20)}... gas=${receipt.gasUsed} (${totalMs}ms)`);
    return rec;
  } catch (e: any) {
    const totalMs = Date.now() - t0;
    const rec: TxRecord = { mode: 'SDK', operation: 'swap', label, status: 'failed', totalLatencyMs: totalMs, error: e.message?.slice(0, 200) };
    results.push(rec);
    console.log(`  ❌ ${label}: ${e.message?.slice(0, 100)}`);
    return rec;
  }
}

// ═══════════════════════════════════════════════════════════
//  SDK Mode: Add Liquidity (Direct EOA)
// ═══════════════════════════════════════════════════════════

async function sdkAddLiquidity(liquidity: bigint, label: string): Promise<TxRecord> {
  const t0 = Date.now();
  try {
    const tx = await wallet.writeContract({
      address: ADDR.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'mint',
      args: [POOL_KEY, -23040, 23040, liquidity, '0x' as Hex],
    });
    const receipt = await pub.waitForTransactionReceipt({ hash: tx });
    const totalMs = Date.now() - t0;
    const rec: TxRecord = { mode: 'SDK', operation: 'liquidity', label, status: 'success', hash: tx, block: receipt.blockNumber, gasUsed: receipt.gasUsed, totalLatencyMs: totalMs, chainLatencyMs: totalMs };
    results.push(rec);
    console.log(`  ✅ ${label}: hash=${tx.slice(0, 20)}... gas=${receipt.gasUsed} (${totalMs}ms)`);
    return rec;
  } catch (e: any) {
    const totalMs = Date.now() - t0;
    const rec: TxRecord = { mode: 'SDK', operation: 'liquidity', label, status: 'failed', totalLatencyMs: totalMs, error: e.message?.slice(0, 200) };
    results.push(rec);
    console.log(`  ❌ ${label}: ${e.message?.slice(0, 100)}`);
    return rec;
  }
}

// ═══════════════════════════════════════════════════════════
//  API Mode: Swap (API → Sign → Broadcast)
// ═══════════════════════════════════════════════════════════

async function apiSwap(amount: string, zeroForOne: boolean, label: string, auth: string): Promise<TxRecord> {
  const t0 = Date.now();
  try {
    const tokenIn = zeroForOne ? ADDR.USDC : ADDR.WETH;
    const tokenOut = zeroForOne ? ADDR.WETH : ADDR.USDC;
    const apiRes = await apiCall('POST', '/defi/swap', {
      tokenIn, tokenOut, amount, zeroForOne,
      userAddress: account.address,
    }, auth);
    const apiMs = Date.now() - t0;

    if (!apiRes.data.success) {
      const rec: TxRecord = { mode: 'API', operation: 'swap', label, status: 'failed', totalLatencyMs: apiMs, apiLatencyMs: apiMs, error: `API error: ${JSON.stringify(apiRes.data).slice(0, 150)}` };
      results.push(rec);
      console.log(`  ❌ ${label} (API): ${JSON.stringify(apiRes.data).slice(0, 100)}`);
      return rec;
    }

    const txData = apiRes.data.transaction;
    const tChain = Date.now();
    const hash = await wallet.sendTransaction({
      to: txData.to as Address,
      data: txData.data as Hex,
      value: BigInt(txData.value || '0'),
      chain: baseSepolia,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    const chainMs = Date.now() - tChain;
    const totalMs = Date.now() - t0;

    const status = receipt.status === 'success' ? 'success' : 'reverted';
    const rec: TxRecord = { mode: 'API', operation: 'swap', label, status, hash, block: receipt.blockNumber, gasUsed: receipt.gasUsed, totalLatencyMs: totalMs, apiLatencyMs: apiMs, chainLatencyMs: chainMs };
    results.push(rec);
    const icon = status === 'success' ? '✅' : '⚠️';
    console.log(`  ${icon} ${label}: hash=${hash.slice(0, 20)}... gas=${receipt.gasUsed} api=${apiMs}ms chain=${chainMs}ms (${totalMs}ms)`);
    return rec;
  } catch (e: any) {
    const totalMs = Date.now() - t0;
    const rec: TxRecord = { mode: 'API', operation: 'swap', label, status: 'failed', totalLatencyMs: totalMs, error: e.message?.slice(0, 200) };
    results.push(rec);
    console.log(`  ❌ ${label}: ${e.message?.slice(0, 100)}`);
    return rec;
  }
}

// ═══════════════════════════════════════════════════════════
//  API Mode: Add Liquidity (API → Sign → Broadcast)
// ═══════════════════════════════════════════════════════════

async function apiAddLiquidity(label: string, auth: string): Promise<TxRecord> {
  const t0 = Date.now();
  try {
    const apiRes = await apiCall('POST', '/defi/liquidity', {
      token0: ADDR.USDC, token1: ADDR.WETH,
      amount0: '10000',
      amount1: '10000000000000',
      tickLower: -23040,
      tickUpper: 23040,
      userAddress: account.address,
    }, auth);
    const apiMs = Date.now() - t0;

    if (!apiRes.data.success) {
      const rec: TxRecord = { mode: 'API', operation: 'liquidity', label, status: 'failed', totalLatencyMs: apiMs, apiLatencyMs: apiMs, error: `API error: ${JSON.stringify(apiRes.data).slice(0, 150)}` };
      results.push(rec);
      console.log(`  ❌ ${label} (API): ${JSON.stringify(apiRes.data).slice(0, 100)}`);
      return rec;
    }

    const txData = apiRes.data.transaction;
    const tChain = Date.now();
    const hash = await wallet.sendTransaction({
      to: txData.to as Address,
      data: txData.data as Hex,
      value: BigInt(txData.value || '0'),
      chain: baseSepolia,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    const chainMs = Date.now() - tChain;
    const totalMs = Date.now() - t0;

    const status = receipt.status === 'success' ? 'success' : 'reverted';
    const rec: TxRecord = { mode: 'API', operation: 'liquidity', label, status, hash, block: receipt.blockNumber, gasUsed: receipt.gasUsed, totalLatencyMs: totalMs, apiLatencyMs: apiMs, chainLatencyMs: chainMs };
    results.push(rec);
    const icon = status === 'success' ? '✅' : '⚠️';
    console.log(`  ${icon} ${label}: hash=${hash.slice(0, 20)}... gas=${receipt.gasUsed} api=${apiMs}ms chain=${chainMs}ms (${totalMs}ms)`);
    return rec;
  } catch (e: any) {
    const totalMs = Date.now() - t0;
    const rec: TxRecord = { mode: 'API', operation: 'liquidity', label, status: 'failed', totalLatencyMs: totalMs, error: e.message?.slice(0, 200) };
    results.push(rec);
    console.log(`  ❌ ${label}: ${e.message?.slice(0, 100)}`);
    return rec;
  }
}

// ═══════════════════════════════════════════════════════════
//  Report Generator
// ═══════════════════════════════════════════════════════════

function generateReport(
  envInfo: { sessionActive: boolean; sessionExpiry: bigint; paused: boolean; routerOk: boolean; ttl: bigint },
  balBefore: Balances,
  balMid: Balances,
  balAfter: Balances,
  nonce0: bigint,
  nonceEnd: bigint,
  apiHealthMs: number,
  durationMs: number,
): string {
  const now = new Date().toISOString();
  const sdkSwaps = results.filter(r => r.mode === 'SDK' && r.operation === 'swap');
  const apiSwaps = results.filter(r => r.mode === 'API' && r.operation === 'swap');
  const sdkLiq = results.filter(r => r.mode === 'SDK' && r.operation === 'liquidity');
  const apiLiq = results.filter(r => r.mode === 'API' && r.operation === 'liquidity');

  const avg = (arr: TxRecord[], key: keyof TxRecord) => {
    const vals = arr.filter(r => r.status === 'success' && r[key] != null).map(r => Number(r[key]));
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  const sum = (arr: TxRecord[], key: keyof TxRecord) => {
    return arr.filter(r => r[key] != null).reduce((a, r) => a + BigInt(r[key] as any || 0), 0n);
  };
  const count = (arr: TxRecord[], s: string) => arr.filter(r => r.status === s).length;

  const totalSuccess = count(results, 'success');
  const totalFailed = count(results, 'failed') + count(results, 'reverted');
  const totalGas = sum(results.filter(r => r.status === 'success'), 'gasUsed');

  const txTable = results.map(r => {
    const hashLink = r.hash ? `[\`${r.hash.slice(0, 12)}...\`](https://sepolia.basescan.org/tx/${r.hash})` : '-';
    const icon = r.status === 'success' ? '✅' : r.status === 'reverted' ? '⚠️' : '❌';
    return `| ${r.mode} | ${r.operation} | ${r.label} | ${icon} ${r.status} | ${r.gasUsed || '-'} | ${r.totalLatencyMs}ms | ${r.apiLatencyMs ? r.apiLatencyMs + 'ms' : '-'} | ${hashLink} |`;
  }).join('\n');

  const sdkSwapAvg = avg(sdkSwaps, 'totalLatencyMs');
  const apiSwapAvg = avg(apiSwaps, 'totalLatencyMs');
  const apiSwapApiAvg = avg(apiSwaps, 'apiLatencyMs');
  const sdkSwapGas = sum(sdkSwaps.filter(r => r.status === 'success'), 'gasUsed');
  const apiSwapGas = sum(apiSwaps.filter(r => r.status === 'success'), 'gasUsed');

  const sdkLiqLatency = sdkLiq[0]?.totalLatencyMs || 0;
  const apiLiqLatency = apiLiq[0]?.totalLatencyMs || 0;
  const sdkLiqGas = sdkLiq[0]?.gasUsed || 0n;
  const apiLiqGas = apiLiq[0]?.gasUsed || 0n;

  return `# ILAL Institutional Benchmark Report

**Date:** ${now}
**Network:** Base Sepolia (Chain ID: 84532)
**Wallet:** \`${account.address}\`
**RPC:** ${RPC_URL}
**API:** ${API_BASE}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Operations | ${results.length} |
| Succeeded | ${totalSuccess} |
| Failed/Reverted | ${totalFailed} |
| Total Gas | ${totalGas} |
| Duration | ${(durationMs / 1000).toFixed(1)}s |
| EIP-712 Permits Used | ${Number(nonceEnd) - Number(nonce0)} |

---

## Environment

| Check | Status |
|-------|--------|
| Session Active | ${envInfo.sessionActive ? '✅ Yes' : '❌ No'} |
| Session Expiry | ${new Date(Number(envInfo.sessionExpiry) * 1000).toISOString()} |
| Emergency Paused | ${envInfo.paused ? '❌ YES' : '✅ No'} |
| SwapRouter Approved | ${envInfo.routerOk ? '✅ Yes' : '❌ No'} |
| Session TTL | ${Number(envInfo.ttl) / 3600}h |
| API Health | ${apiHealthMs}ms |

---

## All Transactions

| Mode | Type | Label | Status | Gas | Total | API | Tx Hash |
|------|------|-------|--------|-----|-------|-----|---------|
${txTable}

---

## Swap Comparison (SDK vs API)

| Metric | SDK Direct | API Relay | Diff |
|--------|-----------|-----------|------|
| Avg Total Latency | ${sdkSwapAvg}ms | ${apiSwapAvg}ms | ${apiSwapAvg > 0 ? ((apiSwapAvg - sdkSwapAvg) > 0 ? '+' : '') + (apiSwapAvg - sdkSwapAvg) + 'ms' : 'N/A'} |
| Avg API Overhead | - | ${apiSwapApiAvg}ms | - |
| Total Gas (${count(sdkSwaps, 'success')} TXs / ${count(apiSwaps, 'success')} TXs) | ${sdkSwapGas} | ${apiSwapGas} | ${apiSwapGas > 0n && sdkSwapGas > 0n ? (Number(apiSwapGas) / Number(sdkSwapGas) * 100).toFixed(1) + '%' : 'N/A'} |
| Success Rate | ${count(sdkSwaps, 'success')}/${sdkSwaps.length} | ${count(apiSwaps, 'success')}/${apiSwaps.length} | - |
| hookData Mode | EIP-712 SwapPermit | 0x (EOA Direct) | Different |

### SDK Swap Details (EIP-712 Permit Mode)
${sdkSwaps.map(r => `- **${r.label}**: ${r.status === 'success' ? `gas=${r.gasUsed}, ${r.totalLatencyMs}ms` : `FAILED: ${r.error?.slice(0, 80)}`} ${r.hash ? `[TX](https://sepolia.basescan.org/tx/${r.hash})` : ''}`).join('\n')}

### API Swap Details (Unsigned TX Mode)
${apiSwaps.map(r => `- **${r.label}**: ${r.status === 'success' ? `gas=${r.gasUsed}, api=${r.apiLatencyMs}ms, chain=${r.chainLatencyMs}ms, total=${r.totalLatencyMs}ms` : `${r.status.toUpperCase()}: ${r.error?.slice(0, 80) || 'reverted on-chain'}`} ${r.hash ? `[TX](https://sepolia.basescan.org/tx/${r.hash})` : ''}`).join('\n')}

---

## Liquidity Comparison (SDK vs API)

| Metric | SDK Direct | API Relay |
|--------|-----------|-----------|
| Latency | ${sdkLiqLatency}ms | ${apiLiqLatency}ms |
| Gas | ${sdkLiqGas} | ${apiLiqGas} |
| Status | ${sdkLiq[0]?.status || 'N/A'} | ${apiLiq[0]?.status || 'N/A'} |
| hookData | 0x (EOA Direct) | 0x (EOA Direct) |
| Contract | PositionManager.mint() | PositionManager.mint() |

---

## Balance Changes

| Token | Before (SDK) | After SDK | After API | Total Change |
|-------|-------------|-----------|-----------|--------------|
| ETH | ${formatEther(balBefore.eth)} | ${formatEther(balMid.eth)} | ${formatEther(balAfter.eth)} | ${formatEther(balAfter.eth - balBefore.eth)} |
| USDC | ${formatUnits(balBefore.usdc, 6)} | ${formatUnits(balMid.usdc, 6)} | ${formatUnits(balAfter.usdc, 6)} | ${formatUnits(balAfter.usdc - balBefore.usdc, 6)} |
| WETH | ${formatEther(balBefore.weth)} | ${formatEther(balMid.weth)} | ${formatEther(balAfter.weth)} | ${formatEther(balAfter.weth - balBefore.weth)} |

---

## Architecture Comparison

| Dimension | SDK Direct Mode | API Relay Mode |
|-----------|----------------|----------------|
| Target User | DeFi-native: market makers, quant funds | TradFi: asset managers, banks |
| Chain Interaction | Direct via viem/ethers | API builds unsigned TX, client signs & broadcasts |
| Auth Model | Wallet signature only | JWT + API Key + Wallet signature |
| Swap hookData | EIP-712 SwapPermit (Mode 1) | 0x empty (Mode 2, EOA resolves as sender) |
| Liquidity hookData | 0x (EOA Direct) | 0x (EOA Direct) |
| Key Custody | Client holds private key | Client holds private key (non-custodial) |
| Latency Profile | 1 step: sign + broadcast | 2 steps: HTTP API + sign + broadcast |
| Complexity | Requires Web3 + EIP-712 knowledge | HTTP-only (after initial setup) |
| Rate Limiting | None (direct chain) | Tiered (Free/Pro/Enterprise) |
| Usage Tracking | None | Built-in billing & analytics |

---

## Key Findings

${sdkSwaps.every(r => r.status === 'success') ? '1. **SDK Swap (EIP-712)**: All swaps succeeded. EIP-712 permits provide cryptographic authorization per swap.' : '1. **SDK Swap (EIP-712)**: Some swaps failed — check session and nonce state.'}

${apiSwaps.every(r => r.status === 'success')
  ? '2. **API Swap (Mode 2)**: All swaps succeeded. The API unsigned TX with empty hookData works when the SwapRouter has proper permissions.'
  : apiSwaps.some(r => r.status === 'reverted')
    ? '2. **API Swap (Mode 2)**: Swaps reverted on-chain. The API builds TXs with hookData=0x, which resolves user as the SwapRouter contract (not the EOA). The ComplianceHook checks the SwapRouter address for an active session, which may not exist. **Recommendation**: API should support building EIP-712 permit hookData server-side or return parameters for client-side permit construction.'
    : '2. **API Swap**: Some failures occurred during the API flow.'}

${sdkLiq[0]?.status === 'success'
  ? '3. **SDK Liquidity**: Add liquidity succeeded. PositionManager checks session via its own `onlyVerified` modifier (msg.sender = EOA).'
  : '3. **SDK Liquidity**: Failed — check token approvals and pool initialization.'}

${apiLiq[0]?.status === 'success'
  ? '4. **API Liquidity**: Add liquidity succeeded via API unsigned TX.'
  : apiLiq[0]?.status === 'reverted'
    ? '4. **API Liquidity**: Reverted on-chain. The API uses fee=3000/tickSpacing=60 pool config which may differ from the initialized pool (fee=500/tickSpacing=10).'
    : '4. **API Liquidity**: Failed — check API response and pool configuration.'}

5. **Latency**: SDK swaps averaged ${sdkSwapAvg}ms total. API swaps averaged ${apiSwapAvg}ms total (including ${apiSwapApiAvg}ms API overhead).

---

## Recommendations

| Institution Type | Recommended Mode | Rationale |
|-----------------|-----------------|-----------|
| Market Makers / HFT | SDK Direct | Lowest latency, full control, EIP-712 permits |
| DeFi Funds / Quant | SDK Direct | Programmatic access, no API dependency |
| Asset Managers (TradFi) | API Relay | Simpler integration, built-in analytics |
| Banks / Custodians | API Relay | REST API familiar, compliance audit trail |
| Hybrid Teams | Both | SDK for trading, API for reporting & billing |

---

*Generated by ILAL Institutional Benchmark at ${now}*
`;
}

// ═══════════════════════════════════════════════════════════
//  Main
// ═══════════════════════════════════════════════════════════

async function main() {
  const t0 = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   ILAL Institutional Benchmark — SDK vs API                  ║');
  console.log('║   Real transactions on Base Sepolia                          ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  Wallet: ${account.address}`);
  console.log(`  RPC:    ${RPC_URL}`);
  console.log(`  API:    ${API_BASE}\n`);

  // ─── Phase 1: Environment Check ───

  console.log('┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 1: Environment Check                          │');
  console.log('└──────────────────────────────────────────────────────┘\n');

  let bal0 = await getBalances();
  console.log(`  Wallet: ${fmtBal(bal0)}`);

  const [paused, routerOk, ttl] = await Promise.all([
    pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'emergencyPaused' }),
    pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'isRouterApproved', args: [ADDR.swapRouter] }),
    pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'getSessionTTL' }),
  ]);
  const sessionActive = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'isSessionActive', args: [account.address] });
  const sessionExpiry = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'sessionExpiry', args: [account.address] });
  const nonce0 = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });

  console.log(`  Session: ${sessionActive ? '✅ Active' : '❌ Inactive'} (expires ${new Date(Number(sessionExpiry) * 1000).toISOString()})`);
  console.log(`  Emergency: ${paused ? '❌ PAUSED' : '✅ Not paused'} | Router: ${routerOk ? '✅ Approved' : '❌ Not approved'} | TTL: ${Number(ttl) / 3600}h`);
  console.log(`  Permit Nonce: ${nonce0}`);

  if (!sessionActive) {
    console.log('\n  ⚠️  Session expired — activating new session (24h)...');
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
    const tx = await wallet.writeContract({
      address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'startSession',
      args: [account.address, expiry],
    });
    await pub.waitForTransactionReceipt({ hash: tx });
    console.log(`  ✅ Session activated for wallet: ${tx.slice(0, 22)}...`);
    await sleep(2000);
  }

  // PositionManager & SwapRouter need sessions (hook resolves sender=contract when hookData=0x)
  for (const [name, addr] of [['PositionManager', ADDR.positionManager], ['SwapRouter', ADDR.swapRouter]] as const) {
    const active = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'isSessionActive', args: [addr] });
    if (!active) {
      console.log(`  Activating session for ${name}...`);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
      const tx = await wallet.writeContract({
        address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'startSession',
        args: [addr, expiry],
      });
      await pub.waitForTransactionReceipt({ hash: tx });
      console.log(`  ✅ Session for ${name}: ${tx.slice(0, 22)}...`);
      await sleep(2000);
    }
  }

  // Ensure we have enough USDC for swaps (need ~0.036 total for both phases)
  if (bal0.usdc < parseUnits('0.04', 6)) {
    console.log('\n  ⚠️  Low USDC — swapping WETH→USDC to replenish...');
    const replenishPermit = await buildSwapPermit();
    const repTx = await wallet.writeContract({
      address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
      args: [POOL_KEY, { zeroForOne: false, amountSpecified: -parseEther('0.0001'), sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970341n }, replenishPermit, 0n],
    });
    const repR = await pub.waitForTransactionReceipt({ hash: repTx });
    const newBal = await getBalances();
    console.log(`  ✅ Replenished: ${repTx.slice(0, 22)}... gas=${repR.gasUsed}`);
    console.log(`  New balance: ${fmtBal(newBal)}`);
    bal0 = newBal;
    await sleep(3000);
  }

  // Ensure approvals for SwapRouter and PositionManager
  await ensureApproval(ADDR.WETH, ADDR.swapRouter, parseEther('0.01'), 'WETH→SwapRouter');
  await ensureApproval(ADDR.USDC, ADDR.swapRouter, parseUnits('1', 6), 'USDC→SwapRouter');
  await ensureApproval(ADDR.USDC, ADDR.positionManager, parseUnits('1', 6), 'USDC→PositionManager');
  await ensureApproval(ADDR.WETH, ADDR.positionManager, parseEther('0.01'), 'WETH→PositionManager');

  // Check API health
  let apiHealthMs = 0;
  try {
    const h = await apiCall('GET', '/health');
    apiHealthMs = h.ms;
    console.log(`\n  API Health: ${h.status === 200 ? '✅' : '❌'} (${h.ms}ms)`);
  } catch {
    console.log(`\n  API Health: ❌ Unreachable (${API_BASE})`);
  }

  // ─── Phase 2: SDK Direct Mode ───

  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 2: SDK Direct Mode (3 Swap + 1 Liquidity)     │');
  console.log('└──────────────────────────────────────────────────────┘\n');

  // Small amounts to leave balance for API phase
  const sdkSwapOps = [
    { amount: parseUnits('0.005', 6), zeroForOne: true,  label: 'SDK Swap 1 — 0.005 USDC→WETH' },
    { amount: parseUnits('0.008', 6), zeroForOne: true,  label: 'SDK Swap 2 — 0.008 USDC→WETH' },
    { amount: parseUnits('0.005', 6), zeroForOne: true,  label: 'SDK Swap 3 — 0.005 USDC→WETH' },
  ];

  for (const { amount, zeroForOne, label } of sdkSwapOps) {
    await sdkSwap(amount, zeroForOne, label);
    await sleep(3000);
  }

  console.log('');
  await sdkAddLiquidity(100000n, 'SDK Add Liquidity — full range');
  await sleep(3000);

  const balMid = await getBalances();
  console.log(`\n  Post-SDK Wallet: ${fmtBal(balMid)}`);

  // ─── Phase 3: API Relay Mode ───

  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 3: API Relay Mode (3 Swap + 1 Liquidity)      │');
  console.log('└──────────────────────────────────────────────────────┘\n');

  // Register & Login (with rate-limit retry)
  const uid = `bench_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${uid}@benchmark.test`;
  const password = 'BenchMark2026!@#';
  let jwt = '';
  let apiKey = '';

  for (let attempt = 0; attempt < 3 && !jwt; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`  Auth: retrying (attempt ${attempt + 1})...`);
        await sleep(5000);
      }

      const reg = await apiCall('POST', '/auth/register', { email, password, name: 'Benchmark Test' });
      if (reg.status === 201) {
        jwt = reg.data.accessToken || reg.data.token || '';
        if (jwt) {
          console.log(`  Auth: ✅ Registered & JWT (${reg.ms}ms)`);
          break;
        }
      }
      if (reg.status === 429) {
        console.log(`  Auth: rate-limited, waiting...`);
        await sleep(10000);
        continue;
      }

      // Try login
      const login = await apiCall('POST', '/auth/login', { email, password });
      jwt = login.data.accessToken || login.data.token || '';
      if (jwt) {
        console.log(`  Auth: ✅ Logged in (${login.ms}ms)`);
        break;
      }
      if (login.status === 429) {
        console.log(`  Auth: login rate-limited, waiting...`);
        await sleep(10000);
        continue;
      }
    } catch (e: any) {
      console.log(`  Auth: ❌ attempt ${attempt + 1}: ${e.message?.slice(0, 60)}`);
    }
  }

  if (jwt) {
    try {
      const keyRes = await apiCall('POST', '/apikeys', { name: 'Benchmark Key' }, `Bearer ${jwt}`);
      apiKey = keyRes.data.key || keyRes.data.apiKey || '';
      if (apiKey) console.log(`  API Key: ✅ Created (${keyRes.ms}ms)`);
    } catch { /* ignore */ }
  } else {
    console.log('  Auth: ⚠️ Could not obtain JWT after retries');
  }

  const authHeader = apiKey ? `ApiKey ${apiKey}` : (jwt ? `Bearer ${jwt}` : '');
  if (!authHeader) {
    console.log('  ⚠️ No auth available — API operations will use unauthenticated requests');
  }

  // Session status via API
  try {
    const sess = await apiCall('GET', `/session/${account.address}`);
    console.log(`  Session (API): active=${sess.data.isActive}, remaining=${sess.data.remainingSeconds}s (${sess.ms}ms)`);
  } catch { /* ignore */ }

  console.log('');

  // USDC → WETH swaps via API (same direction as SDK for fair comparison)
  const apiSwapOps = [
    { amount: '5000', zeroForOne: true,  label: 'API Swap 1 — 0.005 USDC→WETH' },
    { amount: '8000', zeroForOne: true,  label: 'API Swap 2 — 0.008 USDC→WETH' },
    { amount: '5000', zeroForOne: true,  label: 'API Swap 3 — 0.005 USDC→WETH' },
  ];

  for (const { amount, zeroForOne, label } of apiSwapOps) {
    await apiSwap(amount, zeroForOne, label, authHeader);
    await sleep(3000);
  }

  console.log('');
  await apiAddLiquidity('API Add Liquidity — full range', authHeader);
  await sleep(2000);

  // ─── Phase 4: Final State & Report ───

  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 4: Results & Report Generation                 │');
  console.log('└──────────────────────────────────────────────────────┘\n');

  const balAfter = await getBalances();
  const nonceEnd = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });

  console.log(`  Before:    ${fmtBal(bal0)}`);
  console.log(`  After SDK: ${fmtBal(balMid)}`);
  console.log(`  After API: ${fmtBal(balAfter)}`);
  console.log(`  Nonce: ${nonce0} → ${nonceEnd} (${Number(nonceEnd) - Number(nonce0)} permits)`);

  const durationMs = Date.now() - t0;

  // Generate report
  const report = generateReport(
    { sessionActive, sessionExpiry, paused, routerOk, ttl },
    bal0, balMid, balAfter,
    nonce0, nonceEnd,
    apiHealthMs,
    durationMs,
  );

  const reportPath = path.join(__dirname, '../docs/testing/INSTITUTIONAL_BENCHMARK.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`\n  📄 Report: ${reportPath}`);

  // Summary
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status !== 'success').length;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  BENCHMARK SUMMARY                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Operations:  ${(passed + failed).toString().padEnd(40)}║`);
  console.log(`║  Succeeded:         ${passed.toString().padEnd(40)}║`);
  console.log(`║  Failed/Reverted:   ${failed.toString().padEnd(40)}║`);
  console.log(`║  SDK Swap Avg:      ${(results.filter(r => r.mode === 'SDK' && r.operation === 'swap' && r.status === 'success').reduce((a, r) => a + r.totalLatencyMs, 0) / Math.max(1, results.filter(r => r.mode === 'SDK' && r.operation === 'swap' && r.status === 'success').length)).toFixed(0).padEnd(37)}ms ║`);
  console.log(`║  API Swap Avg:      ${(results.filter(r => r.mode === 'API' && r.operation === 'swap' && r.status === 'success').reduce((a, r) => a + r.totalLatencyMs, 0) / Math.max(1, results.filter(r => r.mode === 'API' && r.operation === 'swap' && r.status === 'success').length)).toFixed(0).padEnd(37)}ms ║`);
  console.log(`║  Permits Used:      ${(Number(nonceEnd) - Number(nonce0)).toString().padEnd(40)}║`);
  console.log(`║  Duration:          ${(durationMs / 1000).toFixed(1)}s${' '.repeat(39 - (durationMs / 1000).toFixed(1).length)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n  Failed Operations:');
    results.filter(r => r.status !== 'success').forEach(r => {
      console.log(`    [${r.mode}] ${r.label}: ${r.status} — ${r.error || 'reverted on-chain'}`);
    });
  }

  console.log('\n  Transaction Links:');
  results.filter(r => r.hash).forEach(r => {
    console.log(`    [${r.mode}] ${r.label}: https://sepolia.basescan.org/tx/${r.hash}`);
  });

  console.log('');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
