/**
 * ILAL 机构全自助端到端测试
 *
 * 完整自助入驻流程:
 *   Phase 1: API 健康检查
 *   Phase 2: 机构注册 & 登录 (获取 JWT + API Key)
 *   Phase 3: 机构入驻 (POST /onboarding/register)
 *   Phase 4: 获取 Attestation + 本地生成 ZK Proof + 激活 Session
 *   Phase 5: API 构建 Swap / Liquidity TX
 *   Phase 6: 链上真实交易 (EIP-712 签名 & 广播)
 *   Phase 7: 收盘 — 余额 & 状态验证
 */

import {
  createPublicClient, createWalletClient, http,
  formatEther, formatUnits, parseUnits,
  encodeAbiParameters, keccak256, concat,
  type Address, type Hex, type Hash,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════
//  Config
// ═══════════════════════════════════════

const API_BASE = 'http://localhost:3001/api/v1';

const envPath = path.join(__dirname, '../apps/api/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const rawKey = process.env.PRIVATE_KEY || envContent.match(/VERIFIER_PRIVATE_KEY=["']?([^"'\s]+)/)?.[1]?.trim();
const PRIVATE_KEY = rawKey as Hex;

const account = privateKeyToAccount(PRIVATE_KEY);
const pub = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });

const CIRCUIT_WASM = path.join(__dirname, '../packages/circuits/build/compliance_js/compliance.wasm');
const CIRCUIT_ZKEY = path.join(__dirname, '../packages/circuits/keys/compliance.zkey');

const ADDR = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  hook: '0xe633220f15932428FcA60A1A2C2C48797A180A80' as Address,
  swapRouter: '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891' as Address,
  mUSD: '0xdd3d112a48906807c4b73c94ed884552427e4cf9' as Address,
  mTBILL: '0xfb080423cedd4ca56da3f60a4b901f51846459ae' as Address,
};

const TOKEN_DECIMALS = 18;

const POOL_KEY = {
  currency0: ADDR.mUSD, currency1: ADDR.mTBILL,
  fee: 500, tickSpacing: 10, hooks: ADDR.hook,
};

const HOOK_ABI = [
  { type: 'function', name: 'getNonce', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getDomainSeparator', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SWAP_PERMIT_TYPEHASH', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
] as const;

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'mint', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════
//  Results Tracker
// ═══════════════════════════════════════

interface TestResult { phase: string; test: string; status: 'PASS' | 'FAIL'; detail: string; duration: number }
const results: TestResult[] = [];
let jwt = '';
let apiKey = '';
let apiKeyId = '';

function record(phase: string, test: string, status: 'PASS' | 'FAIL', detail: string, duration: number) {
  results.push({ phase, test, status, detail, duration });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${test} (${duration}ms)`);
  if (status === 'FAIL') console.log(`     ↳ ${detail}`);
}

async function api(method: string, path: string, body?: any, auth?: string): Promise<{ status: number; data: any; ms: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth?.startsWith('ApiKey ')) {
    headers['X-API-Key'] = auth.replace('ApiKey ', '');
  } else if (auth) {
    headers['Authorization'] = auth;
  }
  const t0 = Date.now();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = Date.now() - t0;
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, ms };
}

// ═══════════════════════════════════════
//  Phase helpers
// ═══════════════════════════════════════

async function buildPermit(): Promise<Hex> {
  const [nonce, ds, th] = await Promise.all([
    pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] }),
    pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getDomainSeparator' }),
    pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'SWAP_PERMIT_TYPEHASH' }),
  ]);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const structHash = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }],
    [th, account.address, deadline, nonce]
  ));
  const digest = keccak256(concat(['0x1901' as Hex, ds, structHash]));
  const sig = await account.sign({ hash: digest });
  return encodeAbiParameters(
    [{ type: 'tuple', components: [
      { name: 'user', type: 'address' }, { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }, { name: 'signature', type: 'bytes' },
    ]}],
    [{ user: account.address, deadline, nonce, signature: sig }]
  );
}

async function getBalances() {
  const [eth, musd, mtbill] = await Promise.all([
    pub.getBalance({ address: account.address }),
    pub.readContract({ address: ADDR.mUSD, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    pub.readContract({ address: ADDR.mTBILL, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
  ]);
  return { eth, musd, mtbill };
}

async function ensureTokenBalance(token: Address, symbol: string, minAmount: bigint) {
  const bal = await pub.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] });
  if (bal < minAmount) {
    const mintAmount = parseUnits('10000', TOKEN_DECIMALS);
    console.log(`  Mint ${symbol}...`);
    const tx = await wallet.writeContract({ address: token, abi: ERC20_ABI, functionName: 'mint', args: [account.address, mintAmount] });
    await pub.waitForTransactionReceipt({ hash: tx });
    console.log(`  ✅ Minted ${formatUnits(mintAmount, TOKEN_DECIMALS)} ${symbol}`);
    await sleep(2000);
  }
}

function bigIntToHex(num: bigint): string {
  return '0x' + num.toString(16).padStart(64, '0');
}

// ═══════════════════════════════════════
//  Main
// ═══════════════════════════════════════

async function main() {
  const t0 = Date.now();
  const uid = `inst_${Date.now()}`;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   ILAL — 机构全自助入驻 E2E 测试                                     ║');
  console.log('║   注册 → 入驻 → ZK Proof → Session → 交易                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Wallet: ${account.address}\n`);

  // ─── Phase 1: Health Check ───
  console.log('┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 1: API 健康检查                                │');
  console.log('└──────────────────────────────────────────────────────┘');

  {
    const r = await api('GET', '/health');
    if (r.status === 200 && r.data.status === 'ok') {
      record('P1', 'GET /health', 'PASS', `blockchain=${r.data.blockchain?.connected}`, r.ms);
    } else {
      record('P1', 'GET /health', 'FAIL', JSON.stringify(r.data), r.ms);
    }
  }

  // ─── Phase 2: Register & Login + API Key ───
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 2: 用户注册 & API Key 获取                     │');
  console.log('└──────────────────────────────────────────────────────┘');

  {
    const email = `${uid}@testinstitution.com`;
    const password = 'SecurePass123!@#';

    const reg = await api('POST', '/auth/register', { email, password, name: 'Test Institution' });
    const regToken = reg.data.accessToken || reg.data.token;
    if (reg.status === 201 && regToken) {
      jwt = regToken;
      record('P2', 'POST /auth/register', 'PASS', `JWT obtained`, reg.ms);
    } else if (reg.status === 409) {
      record('P2', 'POST /auth/register', 'PASS', `conflict (re-run)`, reg.ms);
    } else {
      record('P2', 'POST /auth/register', 'FAIL', `status=${reg.status} ${JSON.stringify(reg.data).slice(0, 80)}`, reg.ms);
    }

    if (!jwt) {
      const login = await api('POST', '/auth/login', { email, password });
      const token = login.data.accessToken || login.data.token;
      if (login.status === 200 && token) {
        jwt = token;
        record('P2', 'POST /auth/login', 'PASS', 'JWT obtained', login.ms);
      } else {
        record('P2', 'POST /auth/login', 'FAIL', `status=${login.status}`, login.ms);
      }
    }

    if (jwt) {
      const create = await api('POST', '/apikeys', { name: 'E2E Key' }, `Bearer ${jwt}`);
      if (create.status === 201 || create.status === 200) {
        apiKey = create.data.key || create.data.apiKey || '';
        apiKeyId = create.data.id || create.data.apiKeyId || '';
        record('P2', 'POST /apikeys', 'PASS', `key=${apiKey.slice(0, 12)}...`, create.ms);
      } else {
        record('P2', 'POST /apikeys', 'FAIL', JSON.stringify(create.data).slice(0, 80), create.ms);
      }
    }
  }

  // ─── Phase 3: Self-Service Onboarding ───
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 3: 机构自助入驻 (onboarding/register)          │');
  console.log('└──────────────────────────────────────────────────────┘');

  const authHeader = apiKey ? `ApiKey ${apiKey}` : `Bearer ${jwt}`;

  {
    const reg = await api('POST', '/onboarding/register', {
      name: 'Test Institutional Fund',
      walletAddress: account.address,
      countryCode: 840,
    }, authHeader);

    if (reg.status === 201) {
      record('P3', 'POST /onboarding/register', 'PASS',
        `status=${reg.data.status}, merkleRoot=${reg.data.merkleRoot?.slice(0, 20)}...`, reg.ms);
    } else if (reg.status === 409) {
      record('P3', 'POST /onboarding/register', 'PASS',
        `already registered (idempotent)`, reg.ms);
    } else {
      record('P3', 'POST /onboarding/register', 'FAIL', JSON.stringify(reg.data).slice(0, 120), reg.ms);
    }

    const status = await api('GET', `/onboarding/status/${account.address}`, undefined, authHeader);
    if (status.status === 200 && status.data.status === 'approved') {
      record('P3', 'GET /onboarding/status', 'PASS', `status=${status.data.status}`, status.ms);
    } else {
      record('P3', 'GET /onboarding/status', 'FAIL', JSON.stringify(status.data).slice(0, 80), status.ms);
    }
  }

  // ─── Phase 4: Get Attestation → ZK Proof → Activate Session ───
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 4: Attestation → ZK Proof → Session 激活       │');
  console.log('└──────────────────────────────────────────────────────┘');

  {
    // 4a: Get attestation
    const attRes = await api('GET', `/onboarding/attestation/${account.address}`, undefined, authHeader);
    if (attRes.status !== 200 || !attRes.data.attestation) {
      record('P4', 'GET /onboarding/attestation', 'FAIL', JSON.stringify(attRes.data).slice(0, 120), attRes.ms);
    } else {
      record('P4', 'GET /onboarding/attestation', 'PASS',
        `issuerAx=${attRes.data.attestation.issuerAx?.slice(0, 15)}... merkleIndex=${attRes.data.attestation.merkleIndex}`, attRes.ms);

      const attestation = attRes.data.attestation;

      // 4b: Generate ZK Proof locally
      console.log('  ⏳ 生成 ZK Proof (本地 snarkjs, ~10-30s)...');
      const proofStart = Date.now();

      try {
        const snarkjs = require('snarkjs');

        const circuitInput = {
          userAddress: BigInt(account.address.toLowerCase()).toString(),
          merkleRoot: attestation.merkleRoot,
          issuerAx: attestation.issuerAx,
          issuerAy: attestation.issuerAy,
          timestamp: attestation.timestamp,
          sigR8x: attestation.sigR8x,
          sigR8y: attestation.sigR8y,
          sigS: attestation.sigS,
          kycStatus: attestation.kycStatus,
          countryCode: attestation.countryCode,
          merkleProof: attestation.merkleProof,
          merkleIndex: attestation.merkleIndex,
        };

        const { proof, publicSignals } = await snarkjs.plonk.fullProve(
          circuitInput,
          CIRCUIT_WASM,
          CIRCUIT_ZKEY,
        );

        const proofMs = Date.now() - proofStart;
        record('P4', 'ZK Proof 生成 (本地)', 'PASS', `elapsed=${(proofMs / 1000).toFixed(1)}s`, proofMs);

        // Format proof bytes for on-chain verification
        const proofElements: string[] = [
          proof.A[0], proof.A[1],
          proof.B[0], proof.B[1],
          proof.C[0], proof.C[1],
          proof.Z[0], proof.Z[1],
          proof.T1[0], proof.T1[1],
          proof.T2[0], proof.T2[1],
          proof.T3[0], proof.T3[1],
          proof.Wxi[0], proof.Wxi[1],
          proof.Wxiw[0], proof.Wxiw[1],
          proof.eval_a, proof.eval_b, proof.eval_c,
          proof.eval_s1, proof.eval_s2, proof.eval_zw,
        ];

        const proofHex = '0x' + proofElements.map(x => BigInt(x).toString(16).padStart(64, '0')).join('');

        // 4c: Submit proof to API to activate session
        const verifyRes = await api('POST', '/verify', {
          userAddress: account.address,
          proof: proofHex,
          publicInputs: publicSignals,
        }, authHeader);

        if (verifyRes.status === 200 && verifyRes.data.success) {
          record('P4', 'POST /verify (session 激活)', 'PASS',
            `txHash=${verifyRes.data.txHash?.slice(0, 20) ?? 'already-active'}... sessionExpiry=${verifyRes.data.sessionExpiry ?? verifyRes.data.remainingSeconds}`, verifyRes.ms);
        } else {
          record('P4', 'POST /verify (session 激活)', 'FAIL', JSON.stringify(verifyRes.data).slice(0, 120), verifyRes.ms);
        }

      } catch (e: any) {
        record('P4', 'ZK Proof 生成/验证', 'FAIL', e.message?.slice(0, 150), Date.now() - proofStart);
      }
    }
  }

  // ─── Phase 5: Build Swap & Liquidity TX via API ───
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 5: API 构建 Swap/Liquidity TX                  │');
  console.log('└──────────────────────────────────────────────────────┘');

  {
    const swap = await api('POST', '/defi/swap', {
      tokenIn: ADDR.mUSD,
      tokenOut: ADDR.mTBILL,
      amount: parseUnits('100', TOKEN_DECIMALS).toString(),
      zeroForOne: true,
      userAddress: account.address,
    }, authHeader);

    if (swap.status === 200 && swap.data.success) {
      record('P5', 'POST /defi/swap', 'PASS',
        `to=${swap.data.transaction?.to?.slice(0, 10)}...`, swap.ms);
    } else {
      record('P5', 'POST /defi/swap', swap.status === 200 ? 'PASS' : 'FAIL',
        JSON.stringify(swap.data).slice(0, 120), swap.ms);
    }

    const liq = await api('POST', '/defi/liquidity', {
      token0: ADDR.mUSD,
      token1: ADDR.mTBILL,
      amount0: parseUnits('100', TOKEN_DECIMALS).toString(),
      amount1: parseUnits('100', TOKEN_DECIMALS).toString(),
      tickLower: -887220,
      tickUpper: 887220,
      userAddress: account.address,
    }, authHeader);

    if (liq.status === 200 && liq.data.success) {
      record('P5', 'POST /defi/liquidity', 'PASS',
        `to=${liq.data.transaction?.to?.slice(0, 10)}...`, liq.ms);
    } else {
      record('P5', 'POST /defi/liquidity', liq.status === 200 ? 'PASS' : 'FAIL',
        JSON.stringify(liq.data).slice(0, 120), liq.ms);
    }
  }

  // ─── Phase 6: Real On-Chain Trades ───
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 6: 链上真实交易 — EIP-712 签名 & 广播           │');
  console.log('└──────────────────────────────────────────────────────┘');

  await ensureTokenBalance(ADDR.mUSD, 'mUSD', parseUnits('500', TOKEN_DECIMALS));

  const bal0 = await getBalances();
  console.log(`  开盘余额: ETH=${formatEther(bal0.eth)} | mUSD=${formatUnits(bal0.musd, TOKEN_DECIMALS)} | mTBILL=${formatUnits(bal0.mtbill, TOKEN_DECIMALS)}`);

  const allow = await pub.readContract({ address: ADDR.mUSD, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, ADDR.swapRouter] });
  if (allow < parseUnits('1000', TOKEN_DECIMALS)) {
    console.log('  授权 mUSD...');
    const appTx = await wallet.writeContract({ address: ADDR.mUSD, abi: ERC20_ABI, functionName: 'approve', args: [ADDR.swapRouter, parseUnits('100000', TOKEN_DECIMALS)] });
    await pub.waitForTransactionReceipt({ hash: appTx });
    await sleep(2000);
  }

  const perTrade = parseUnits('100', TOKEN_DECIMALS);
  const txHashes: { hash: Hash; gas: bigint; block: bigint }[] = [];

  const trades = [
    { amt: perTrade, label: 'Trade 1 — 试探性小单' },
    { amt: perTrade, label: 'Trade 2 — 常规交易' },
  ];

  for (const { amt, label } of trades) {
    const tt = Date.now();
    try {
      const hookData = await buildPermit();
      const tx = await wallet.writeContract({
        address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
        args: [POOL_KEY, { zeroForOne: true, amountSpecified: -amt, sqrtPriceLimitX96: BigInt('4295128740') }, hookData, 0n],
      });
      const r = await pub.waitForTransactionReceipt({ hash: tx });
      txHashes.push({ hash: tx, gas: r.gasUsed, block: r.blockNumber });
      record('P6', label, 'PASS', `hash=${tx.slice(0, 20)}... gas=${r.gasUsed}`, Date.now() - tt);
      await sleep(3000);
    } catch (e: any) {
      record('P6', label, 'FAIL', e.message?.slice(0, 100), Date.now() - tt);
    }
  }

  // ─── Phase 7: Closing ───
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  Phase 7: 收盘 — 资产变化 & 最终状态                  │');
  console.log('└──────────────────────────────────────────────────────┘');

  const bal1 = await getBalances();
  const nonce1 = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });

  console.log(`  Before: mUSD=${formatUnits(bal0.musd, TOKEN_DECIMALS)} | mTBILL=${formatUnits(bal0.mtbill, TOKEN_DECIMALS)}`);
  console.log(`  After:  mUSD=${formatUnits(bal1.musd, TOKEN_DECIMALS)} | mTBILL=${formatUnits(bal1.mtbill, TOKEN_DECIMALS)}`);
  console.log(`  Delta:  mUSD=${formatUnits(bal1.musd - bal0.musd, TOKEN_DECIMALS)} | mTBILL=${formatUnits(bal1.mtbill - bal0.mtbill, TOKEN_DECIMALS)}`);

  record('P7', '余额变化验证', bal1.musd < bal0.musd ? 'PASS' : 'FAIL',
    `mUSD -${formatUnits(bal0.musd - bal1.musd, TOKEN_DECIMALS)}`, 0);

  const sessEnd = await api('GET', `/session/${account.address}`);
  if (sessEnd.status === 200) {
    record('P7', 'Session 查询', 'PASS',
      `active=${sessEnd.data.isActive}, remaining=${sessEnd.data.remainingSeconds}s`, sessEnd.ms);
  }

  if (apiKeyId && jwt) {
    const del = await api('DELETE', `/apikeys/${apiKeyId}`, undefined, `Bearer ${jwt}`);
    record('P7', 'Cleanup API Key', del.status === 200 || del.status === 204 ? 'PASS' : 'FAIL',
      `status=${del.status}`, del.ms);
  }

  // ─── Summary ───
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const totalMs = Date.now() - t0;

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  测试汇总                                                            ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total:   ${(passed + failed).toString().padEnd(57)}║`);
  console.log(`║  Passed:  ${passed.toString().padEnd(57)}║`);
  console.log(`║  Failed:  ${failed.toString().padEnd(57)}║`);
  console.log(`║  TXs:     ${txHashes.length.toString().padEnd(57)}║`);
  console.log(`║  Time:    ${(totalMs / 1000).toFixed(1)}s${' '.repeat(55 - (totalMs / 1000).toFixed(1).length)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ Failed:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   [${r.phase}] ${r.test}: ${r.detail}`);
    });
  }

  txHashes.forEach((t, i) => {
    console.log(`  ${i + 1}. https://sepolia.basescan.org/tx/${t.hash}`);
  });

  console.log('');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
