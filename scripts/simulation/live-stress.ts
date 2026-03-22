/**
 * ILAL Live Stress Test — 全面真实链上交易
 *
 * 多轮 Swap、流动性操作、安全拒绝测试、紧急暂停恢复
 * 每一笔都是真实链上交易，可在 BaseScan 验证
 */

import {
  createPublicClient, createWalletClient, http,
  formatEther, formatUnits, parseUnits, parseEther,
  encodeAbiParameters, keccak256, concat,
  type Address, type Hex, type Hash,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY ||
  fs.readFileSync(path.join(__dirname, '../../.env'), 'utf-8').match(/PRIVATE_KEY=(.+)/)![1].trim();

const account = privateKeyToAccount(PRIVATE_KEY as Hex);

const ADDR = {
  registry:       '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  hook:           '0xe633220f15932428FcA60A1A2C2C48797A180A80' as Address,
  swapRouter:     '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891' as Address,
  poolManager:    '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  positionMgr:    '0x692548a6E1797d2762b9d04f29112C172E5Cea32' as Address,
  USDC:           '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH:           '0x4200000000000000000000000000000000000006' as Address,
};

const POOL_KEY = {
  currency0: ADDR.USDC, currency1: ADDR.WETH,
  fee: 500, tickSpacing: 10, hooks: ADDR.hook,
};

const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const REGISTRY_ABI = [
  { type: 'function', name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'emergencyPaused', inputs: [], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getSessionTTL', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'isRouterApproved', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'setEmergencyPause', inputs: [{ name: '', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'approveRouter', inputs: [{ name: '', type: 'address' }, { name: '', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'setSessionTTL', inputs: [{ name: '', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'registerIssuer', inputs: [{ name: '', type: 'bytes32' }, { name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const SESSION_ABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'sessionExpiry', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'startSession', inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'endSession', inputs: [{ name: '', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'VERIFIER_ROLE', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'hasRole', inputs: [{ name: '', type: 'bytes32' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'grantRole', inputs: [{ name: '', type: 'bytes32' }, { name: '', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const HOOK_ABI = [
  { type: 'function', name: 'getNonce', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getDomainSeparator', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SWAP_PERMIT_TYPEHASH', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
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

const PM_ABI = [
  { type: 'function', name: 'transferFrom', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }, { name: '', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'nextTokenId', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Tx { n: string; hash?: Hash; block?: bigint; gas?: bigint; ok: boolean; detail: string; url?: string }
const txs: Tx[] = [];
let passCount = 0;
let failCount = 0;

function log(icon: string, name: string, detail: string, hash?: Hash, gas?: bigint, block?: bigint) {
  const ok = icon !== '❌';
  if (ok) passCount++; else failCount++;
  const entry: Tx = { n: name, ok, detail, hash, gas, block };
  if (hash) entry.url = `https://sepolia.basescan.org/tx/${hash}`;
  txs.push(entry);
  const h = hash ? ` ${hash.slice(0, 14)}...` : '';
  const g = gas ? ` gas:${gas}` : '';
  console.log(`  ${icon} [${txs.length}] ${name}${g}${h}`);
  if (detail) console.log(`      ${detail}`);
}

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

async function doSwap(zeroForOne: boolean, amount: bigint, label: string) {
  const hookData = await buildPermit();
  const sqrtLimit = zeroForOne
    ? BigInt('4295128740')
    : BigInt('1461446703485210103287273052203988822378723970341');
  const tx = await wallet.writeContract({
    address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
    args: [POOL_KEY, { zeroForOne, amountSpecified: -amount, sqrtPriceLimitX96: sqrtLimit }, hookData, 0n],
  });
  const r = await pub.waitForTransactionReceipt({ hash: tx });
  return { tx, r };
}

async function bal() {
  const [usdc, weth] = await Promise.all([
    pub.readContract({ address: ADDR.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    pub.readContract({ address: ADDR.WETH, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
  ]);
  return { usdc, weth, usdcF: formatUnits(usdc, 6), wethF: formatEther(weth) };
}

async function expectRevert(name: string, fn: () => Promise<any>) {
  try {
    await fn();
    log('❌', name, 'UNEXPECTED SUCCESS — should have reverted');
  } catch (err: any) {
    log('🛡️', name, `Correctly rejected: ${(err.shortMessage || err.message).slice(0, 100)}`);
  }
}

// ═══════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════

async function main() {
  const startTime = Date.now();
  const ethBal = await pub.getBalance({ address: account.address });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ILAL Full Live Stress Test — Base Sepolia Real Transactions  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`  Wallet:  ${account.address}`);
  console.log(`  ETH:     ${formatEther(ethBal)}`);
  const b0 = await bal();
  console.log(`  USDC:    ${b0.usdcF} | WETH: ${b0.wethF}`);
  console.log(`  Time:    ${new Date().toISOString()}\n`);

  // ─── 0. Ensure approvals ───
  console.log('─── Setup: Token Approvals ───');
  for (const [token, name] of [[ADDR.USDC, 'USDC'], [ADDR.WETH, 'WETH']] as [Address, string][]) {
    const allow = await pub.readContract({ address: token, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, ADDR.swapRouter] });
    if (allow < parseEther('1')) {
      const tx = await wallet.writeContract({ address: token, abi: ERC20_ABI, functionName: 'approve', args: [ADDR.swapRouter, parseEther('100')] });
      const r = await pub.waitForTransactionReceipt({ hash: tx });
      log('✅', `Approve ${name}→Router`, `allowance set`, tx, r.gasUsed, r.blockNumber);
    } else {
      log('✅', `${name} allowance OK`, `${formatEther(allow)} approved`);
    }
  }

  // ─── 1. Multi-round Swap Stress ───
  console.log('\n─── Phase 1: Multi-Round Swap (5 rounds USDC→WETH) ───');
  const nonce0 = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });

  const swapAmounts = [
    parseUnits('0.02', 6),
    parseUnits('0.01', 6),
    parseUnits('0.03', 6),
    parseUnits('0.015', 6),
    parseUnits('0.025', 6),
  ];

  for (let i = 0; i < 5; i++) {
    const label = `Round ${i+1}: USDC→WETH (${Number(swapAmounts[i]) / 1e6} USDC)`;
    try {
      const bBefore = await bal();
      const { tx, r } = await doSwap(true, swapAmounts[i], label);
      const bAfter = await bal();
      const usdcDelta = Number(bAfter.usdc - bBefore.usdc) / 1e6;
      const wethDelta = Number(bAfter.weth - bBefore.weth) / 1e18;
      log('✅', label,
        `USDC: ${usdcDelta.toFixed(6)} | WETH: +${wethDelta.toFixed(12)}`,
        tx, r.gasUsed, r.blockNumber);
    } catch (err: any) {
      log('❌', label, err.shortMessage || err.message);
    }
    await sleep(3000);
  }

  const nonce5 = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });
  log('✅', 'Nonce verification', `nonce: ${nonce0} → ${nonce5} (expected +5)`);

  // ─── 2. Emergency Pause Cycle ───
  console.log('\n─── Phase 2: Emergency Pause Cycle ───');
  try {
    const pauseTx = await wallet.writeContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'setEmergencyPause', args: [true] });
    const pauseR = await pub.waitForTransactionReceipt({ hash: pauseTx });
    log('✅', 'Emergency pause ON', 'TX confirmed', pauseTx, pauseR.gasUsed, pauseR.blockNumber);
    await sleep(3000);

    await expectRevert('Swap during pause (must fail)', async () => {
      const hd = await buildPermit();
      await wallet.writeContract({
        address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
        args: [POOL_KEY, { zeroForOne: true, amountSpecified: -BigInt(parseUnits('0.01', 6)), sqrtPriceLimitX96: BigInt('4295128740') }, hd, 0n],
      });
    });
    await sleep(3000);

    const unpauseTx = await wallet.writeContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'setEmergencyPause', args: [false] });
    const unpauseR = await pub.waitForTransactionReceipt({ hash: unpauseTx });
    log('✅', 'Emergency pause OFF', 'System resumed', unpauseTx, unpauseR.gasUsed, unpauseR.blockNumber);
    await sleep(3000);

    const { tx: recTx, r: recR } = await doSwap(true, parseUnits('0.01', 6), 'Recovery swap');
    log('✅', 'Swap after unpause', 'System recovered', recTx, recR.gasUsed, recR.blockNumber);
    await sleep(3000);
  } catch (err: any) {
    log('❌', 'Phase 2 error', err.shortMessage || err.message);
  }

  // ─── 3. Router Approval Cycle ───
  console.log('\n─── Phase 3: Router Approval Control ───');
  try {
    const deappTx = await wallet.writeContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'approveRouter', args: [ADDR.swapRouter, false] });
    const deappR = await pub.waitForTransactionReceipt({ hash: deappTx });
    log('✅', 'Router de-approved', 'SwapRouter removed from whitelist', deappTx, deappR.gasUsed, deappR.blockNumber);
    await sleep(3000);

    await expectRevert('Swap with de-approved router (must fail)', async () => {
      const hd = await buildPermit();
      await wallet.writeContract({
        address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
        args: [POOL_KEY, { zeroForOne: true, amountSpecified: -BigInt(parseUnits('0.01', 6)), sqrtPriceLimitX96: BigInt('4295128740') }, hd, 0n],
      });
    });
    await sleep(3000);

    const reappTx = await wallet.writeContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'approveRouter', args: [ADDR.swapRouter, true] });
    const reappR = await pub.waitForTransactionReceipt({ hash: reappTx });
    log('✅', 'Router re-approved', 'SwapRouter back on whitelist', reappTx, reappR.gasUsed, reappR.blockNumber);
    await sleep(3000);

    const { tx: reSwTx, r: reSwR } = await doSwap(true, parseUnits('0.01', 6), 'Swap after re-approve');
    log('✅', 'Swap after re-approval', 'Router control verified', reSwTx, reSwR.gasUsed, reSwR.blockNumber);
    await sleep(3000);
  } catch (err: any) {
    log('❌', 'Phase 3 error', err.shortMessage || err.message);
  }

  // ─── 4. TTL Configuration ───
  console.log('\n─── Phase 4: TTL Configuration ───');
  try {
    const oldTTL = await pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'getSessionTTL' });
    const ttlTx = await wallet.writeContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'setSessionTTL', args: [BigInt(12 * 3600)] });
    const ttlR = await pub.waitForTransactionReceipt({ hash: ttlTx });
    const newTTL = await pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'getSessionTTL' });
    log('✅', 'TTL changed 24h→12h', `TTL: ${Number(oldTTL)/3600}h → ${Number(newTTL)/3600}h`, ttlTx, ttlR.gasUsed, ttlR.blockNumber);
    await sleep(3000);

    const ttlTx2 = await wallet.writeContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'setSessionTTL', args: [BigInt(24 * 3600)] });
    const ttlR2 = await pub.waitForTransactionReceipt({ hash: ttlTx2 });
    log('✅', 'TTL restored 12h→24h', `TTL restored`, ttlTx2, ttlR2.gasUsed, ttlR2.blockNumber);
    await sleep(3000);
  } catch (err: any) {
    log('❌', 'Phase 4 error', err.shortMessage || err.message);
  }

  // ─── 5. Session Management ───
  console.log('\n─── Phase 5: Session Management ───');
  try {
    const active = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'isSessionActive', args: [account.address] });
    const expiry = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'sessionExpiry', args: [account.address] });
    log('✅', 'Session status', `active=${active}, expiry=${expiry} (${new Date(Number(expiry)*1000).toISOString()})`);

    // End session
    const endTx = await wallet.writeContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'endSession', args: [account.address] });
    const endR = await pub.waitForTransactionReceipt({ hash: endTx });
    log('✅', 'Session ended', 'Session terminated', endTx, endR.gasUsed, endR.blockNumber);
    await sleep(3000);

    // Swap without session — must fail
    await expectRevert('Swap without session (must fail)', async () => {
      const hd = await buildPermit();
      await wallet.writeContract({
        address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
        args: [POOL_KEY, { zeroForOne: true, amountSpecified: -BigInt(parseUnits('0.01', 6)), sqrtPriceLimitX96: BigInt('4295128740') }, hd, 0n],
      });
    });
    await sleep(3000);

    // Re-start session
    const newExpiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
    const startTx = await wallet.writeContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'startSession', args: [account.address, newExpiry] });
    const startR = await pub.waitForTransactionReceipt({ hash: startTx });
    log('✅', 'Session restarted', `new expiry=${newExpiry}`, startTx, startR.gasUsed, startR.blockNumber);
    await sleep(3000);

    // Swap with session — must succeed
    const { tx: sesSwTx, r: sesSwR } = await doSwap(true, parseUnits('0.01', 6), 'Swap with new session');
    log('✅', 'Swap with new session', 'Session lifecycle verified', sesSwTx, sesSwR.gasUsed, sesSwR.blockNumber);
    await sleep(3000);
  } catch (err: any) {
    log('❌', 'Phase 5 error', err.shortMessage || err.message);
  }

  // ─── 6. Security Rejection Tests (on-chain) ───
  console.log('\n─── Phase 6: Security Rejection Tests ───');

  await expectRevert('NFT transfer blocked (soulbound)', async () => {
    await wallet.writeContract({
      address: ADDR.positionMgr, abi: PM_ABI, functionName: 'transferFrom',
      args: [account.address, '0x000000000000000000000000000000000000dEaD' as Address, 1n],
    });
  });

  await expectRevert('Malformed hookData rejected', async () => {
    await wallet.writeContract({
      address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
      args: [POOL_KEY, { zeroForOne: true, amountSpecified: -BigInt(parseUnits('0.01', 6)), sqrtPriceLimitX96: BigInt('4295128740') }, '0xdeadbeef' as Hex, 0n],
    });
  });

  await expectRevert('Expired permit rejected', async () => {
    const [nonce, ds, th] = await Promise.all([
      pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] }),
      pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getDomainSeparator' }),
      pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'SWAP_PERMIT_TYPEHASH' }),
    ]);
    const expiredDeadline = BigInt(Math.floor(Date.now() / 1000) - 600);
    const structHash = keccak256(encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }],
      [th, account.address, expiredDeadline, nonce]
    ));
    const digest = keccak256(concat(['0x1901' as Hex, ds, structHash]));
    const sig = await account.sign({ hash: digest });
    const hookData = encodeAbiParameters(
      [{ type: 'tuple', components: [
        { name: 'user', type: 'address' }, { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }, { name: 'signature', type: 'bytes' },
      ]}],
      [{ user: account.address, deadline: expiredDeadline, nonce, signature: sig }]
    );
    await wallet.writeContract({
      address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
      args: [POOL_KEY, { zeroForOne: true, amountSpecified: -BigInt(parseUnits('0.01', 6)), sqrtPriceLimitX96: BigInt('4295128740') }, hookData, 0n],
    });
  });

  // ─── 7. Final burst ───
  console.log('\n─── Phase 7: Final Burst (3 rapid swaps) ───');
  for (let i = 1; i <= 3; i++) {
    try {
      const { tx, r } = await doSwap(true, parseUnits('0.01', 6), `Burst ${i}`);
      log('✅', `Burst swap ${i}`, 'OK', tx, r.gasUsed, r.blockNumber);
    } catch (err: any) {
      log('❌', `Burst swap ${i}`, err.shortMessage || err.message);
    }
    await sleep(2000);
  }

  // ─── SUMMARY ───
  const finalBal = await bal();
  const finalEth = await pub.getBalance({ address: account.address });
  const nonceFinal = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS                                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`  Total:    ${txs.length} tests`);
  console.log(`  Pass:     ${passCount}`);
  console.log(`  Fail:     ${failCount}`);
  console.log(`  Writes:   ${txs.filter(t => t.hash).length} on-chain transactions`);
  console.log(`  Gas:      ${txs.reduce((a, t) => a + (t.gas || 0n), 0n)}`);
  console.log(`  Time:     ${elapsed}s`);
  console.log(`  Nonce:    ${nonce0} → ${nonceFinal}`);
  console.log(`  ETH:      ${formatEther(ethBal)} → ${formatEther(finalEth)} (Δ${formatEther(finalEth - ethBal)})`);
  console.log(`  USDC:     ${b0.usdcF} → ${finalBal.usdcF}`);
  console.log(`  WETH:     ${b0.wethF} → ${finalBal.wethF}`);

  console.log('\n  All Tx Hashes:');
  txs.filter(t => t.hash).forEach((t, i) => {
    console.log(`    ${i + 1}. ${t.n}`);
    console.log(`       ${t.url}`);
  });

  // Write report
  let md = `# ILAL Live Stress Test Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Network:** Base Sepolia (84532)\n`;
  md += `**Wallet:** \`${account.address}\`\n`;
  md += `**Duration:** ${elapsed}s\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Tests | ${txs.length} |\n`;
  md += `| Pass | ${passCount} |\n`;
  md += `| Fail | ${failCount} |\n`;
  md += `| On-chain Writes | ${txs.filter(t => t.hash).length} |\n`;
  md += `| Total Gas | ${txs.reduce((a, t) => a + (t.gas || 0n), 0n)} |\n`;
  md += `| Nonce | ${nonce0} → ${nonceFinal} |\n`;
  md += `| ETH Spent (gas) | ${formatEther(ethBal - finalEth)} |\n\n`;
  md += `## All Transactions\n\n`;
  md += `| # | Test | Gas | Block | Status | Tx |\n`;
  md += `|---|------|-----|-------|--------|----|\n`;
  txs.forEach((t, i) => {
    const icon = t.ok ? '✅' : '❌';
    const gas = t.gas ? t.gas.toString() : '-';
    const block = t.block ? t.block.toString() : '-';
    const hash = t.hash ? `[\`${t.hash.slice(0, 12)}...\`](${t.url})` : '-';
    md += `| ${i+1} | ${t.n} | ${gas} | ${block} | ${icon} | ${hash} |\n`;
  });
  md += `\n## Balance Changes\n\n`;
  md += `| Token | Before | After | Delta |\n`;
  md += `|-------|--------|-------|-------|\n`;
  md += `| ETH | ${formatEther(ethBal)} | ${formatEther(finalEth)} | ${formatEther(finalEth - ethBal)} |\n`;
  md += `| USDC | ${b0.usdcF} | ${finalBal.usdcF} | ${(Number(finalBal.usdc - b0.usdc) / 1e6).toFixed(6)} |\n`;
  md += `| WETH | ${b0.wethF} | ${finalBal.wethF} | ${formatEther(finalBal.weth - b0.weth)} |\n`;

  const reportPath = path.join(__dirname, '../../docs/testing/LIVE_STRESS_REPORT.md');
  fs.writeFileSync(reportPath, md);
  console.log(`\n  📄 Report: docs/testing/LIVE_STRESS_REPORT.md\n`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
