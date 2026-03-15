/**
 * ══════════════════════════════════════════════════════════════
 *  ILAL 机构操作全流程 — 真实链上演示
 * ══════════════════════════════════════════════════════════════
 *
 *  本脚本在 Base Sepolia 上执行真实交易，模拟一个机构从
 *  "第一天 onboarding" 到 "日常交易" 的完整操作流程。
 *
 *  运行: cd ilal && ./apps/api/node_modules/.bin/tsx examples/institutional-demo/live-demo/run.ts
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

// ═══════════════════════════════════════
//  合约地址 & ABI（来自 @ilal/sdk）
// ═══════════════════════════════════════

const ADDR = {
  registry:       '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  hook:           '0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80' as Address,
  swapRouter:     '0x9450fAfdE8aB1E68E29cB6F3faCaEC0CF2221C73' as Address,
  poolManager:    '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
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

// ═══════════════════════════════════════
//  初始化
// ═══════════════════════════════════════

const envPath = path.join(__dirname, '../../../.env');
const PRIVATE_KEY = process.env.PRIVATE_KEY ||
  fs.readFileSync(envPath, 'utf-8').match(/PRIVATE_KEY=(.+)/)![1].trim();

const account = privateKeyToAccount(PRIVATE_KEY as Hex);
const pub = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════
//  工具函数
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

async function doSwap(amount: bigint): Promise<{ hash: Hash; gas: bigint; block: bigint }> {
  const hookData = await buildPermit();
  const tx = await wallet.writeContract({
    address: ADDR.swapRouter, abi: SWAP_ABI, functionName: 'swap',
    args: [POOL_KEY, { zeroForOne: true, amountSpecified: -amount, sqrtPriceLimitX96: BigInt('4295128740') }, hookData, 0n],
  });
  const r = await pub.waitForTransactionReceipt({ hash: tx });
  return { hash: tx, gas: r.gasUsed, block: r.blockNumber };
}

async function getBalances() {
  const [eth, usdc, weth] = await Promise.all([
    pub.getBalance({ address: account.address }),
    pub.readContract({ address: ADDR.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    pub.readContract({ address: ADDR.WETH, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
  ]);
  return { eth, usdc, weth };
}

function printBal(label: string, b: { eth: bigint; usdc: bigint; weth: bigint }) {
  console.log(`   ${label}: ETH=${formatEther(b.eth)} | USDC=${formatUnits(b.usdc, 6)} | WETH=${formatEther(b.weth)}`);
}

// ═══════════════════════════════════════
//  主流程
// ═══════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                   ║');
  console.log('║   ILAL — 机构操作全流程演示 (Base Sepolia 真实链上交易)              ║');
  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══════════════════════════════════════
  //  Scene 1: 机构第一天 — Onboarding
  // ═══════════════════════════════════════

  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  Scene 1: 机构 Onboarding — 系统检查 & 身份确认          │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  console.log('  👤 Trader: ' + account.address);
  const bal0 = await getBalances();
  printBal('Wallet', bal0);

  // 检查合约状态
  const [paused, routerOk, ttl] = await Promise.all([
    pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'emergencyPaused' }),
    pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'isRouterApproved', args: [ADDR.swapRouter] }),
    pub.readContract({ address: ADDR.registry, abi: REGISTRY_ABI, functionName: 'getSessionTTL' }),
  ]);

  console.log(`\n  🏗️  System Status:`);
  console.log(`     Emergency Paused: ${paused ? '❌ YES' : '✅ NO'}`);
  console.log(`     Router Approved:  ${routerOk ? '✅ YES' : '❌ NO'}`);
  console.log(`     Session TTL:      ${Number(ttl) / 3600}h`);

  // 检查 session
  const sessionActive = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'isSessionActive', args: [account.address] });
  const sessionExpiry = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'sessionExpiry', args: [account.address] });

  console.log(`\n  🔑 Session:`);
  console.log(`     Active: ${sessionActive ? '✅ YES' : '❌ NO'}`);
  if (sessionActive) {
    console.log(`     Expiry: ${new Date(Number(sessionExpiry) * 1000).toISOString()}`);
  }

  // 检查 nonce
  const nonce0 = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });
  console.log(`     Permit Nonce: ${nonce0}`);

  // ═══════════════════════════════════════
  //  Scene 2: 交易员开始工作 — 授权 & 首笔交易
  // ═══════════════════════════════════════

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Scene 2: 交易员上班 — Token 授权 & 首笔交易              │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  // 确保 USDC 授权
  const allow = await pub.readContract({ address: ADDR.USDC, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, ADDR.swapRouter] });
  if (allow < parseEther('1')) {
    console.log('  🔓 Approving USDC for SwapRouter...');
    const appTx = await wallet.writeContract({ address: ADDR.USDC, abi: ERC20_ABI, functionName: 'approve', args: [ADDR.swapRouter, parseEther('100')] });
    await pub.waitForTransactionReceipt({ hash: appTx });
    console.log(`     ✅ Approved. TX: ${appTx.slice(0, 20)}...`);
    await sleep(2000);
  } else {
    console.log('  ✅ USDC already approved');
  }

  // 首笔交易
  console.log('\n  📊 Trade 1: Buy WETH with 0.02 USDC');
  console.log('     Signing EIP-712 permit...');
  const t1 = await doSwap(parseUnits('0.02', 6));
  console.log(`     ✅ Executed!`);
  console.log(`     Hash:  ${t1.hash}`);
  console.log(`     Block: ${t1.block}`);
  console.log(`     Gas:   ${t1.gas}`);
  console.log(`     📎 https://sepolia.basescan.org/tx/${t1.hash}`);
  await sleep(3000);

  // ═══════════════════════════════════════
  //  Scene 3: 连续交易 — 模拟做市 / DCA
  // ═══════════════════════════════════════

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Scene 3: 连续交易 — 做市 / DCA 策略                     │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  const trades = [
    { amount: parseUnits('0.01', 6), reason: 'DCA round 1' },
    { amount: parseUnits('0.015', 6), reason: 'DCA round 2 — price dip' },
    { amount: parseUnits('0.01', 6), reason: 'DCA round 3' },
  ];

  for (let i = 0; i < trades.length; i++) {
    const { amount, reason } = trades[i];
    console.log(`  📊 Trade ${i + 2}: ${formatUnits(amount, 6)} USDC → WETH (${reason})`);
    const t = await doSwap(amount);
    console.log(`     ✅ Hash: ${t.hash.slice(0, 20)}... | Gas: ${t.gas} | Block: ${t.block}`);
    await sleep(3000);
  }

  // ═══════════════════════════════════════
  //  Scene 4: 收盘 — 余额 & 状态检查
  // ═══════════════════════════════════════

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Scene 4: 收盘 — 资产变化 & 状态检查                     │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  const bal1 = await getBalances();
  printBal('Before', bal0);
  printBal('After ', bal1);
  console.log(`   Delta:  USDC=${formatUnits(bal1.usdc - bal0.usdc, 6)} | WETH=${formatEther(bal1.weth - bal0.weth)} | ETH(gas)=${formatEther(bal1.eth - bal0.eth)}`);

  const nonce1 = await pub.readContract({ address: ADDR.hook, abi: HOOK_ABI, functionName: 'getNonce', args: [account.address] });
  console.log(`\n   Permit Nonce: ${nonce0} → ${nonce1} (${Number(nonce1) - Number(nonce0)} permits consumed)`);

  const session1 = await pub.readContract({ address: ADDR.sessionManager, abi: SESSION_ABI, functionName: 'isSessionActive', args: [account.address] });
  console.log(`   Session:      ${session1 ? '✅ Still active' : '❌ Expired'}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ═══════════════════════════════════════
  //  总结
  // ═══════════════════════════════════════

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Trades:       4 swaps                                     ║`);
  console.log(`║  Permits Signed:     ${Number(nonce1) - Number(nonce0)} EIP-712 signatures                          ║`);
  console.log(`║  USDC Spent:         ${formatUnits(bal0.usdc - bal1.usdc, 6).padEnd(40)}║`);
  console.log(`║  WETH Received:      ${formatEther(bal1.weth - bal0.weth).padEnd(40)}║`);
  console.log(`║  ETH Gas Cost:       ${formatEther(bal0.eth - bal1.eth).padEnd(40)}║`);
  console.log(`║  Duration:           ${elapsed}s${' '.repeat(41 - elapsed.length)}║`);
  console.log(`║  Session Status:     ${session1 ? 'Active ✅' : 'Expired ❌'}${' '.repeat(33)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  console.log(`\n  💡 Key takeaways for institutions:`);
  console.log(`     • Session activated once, ${Number(nonce1) - Number(nonce0)} trades executed without re-verification`);
  console.log(`     • Each trade only requires a wallet signature (zero gas) + 1 TX`);
  console.log(`     • All compliance checks happen automatically in the Hook`);
  console.log(`     • Total experience is nearly identical to using standard Uniswap`);
  console.log('');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
