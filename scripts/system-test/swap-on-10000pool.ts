/**
 * ILAL 端到端合规 Swap 测试 - 使用 fee=10000 Pool
 */

import {
  createPublicClient, createWalletClient, http,
  parseEther, parseUnits, formatEther, formatUnits,
  encodePacked, type Address, type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============ 配置 ============

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const PRIVATE_KEY = envContent.match(/PRIVATE_KEY=(.+)/)![1].trim() as Hex;

const account = privateKeyToAccount(PRIVATE_KEY);

const ADDRESSES = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  complianceHook: '0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80' as Address,
  simpleSwapRouter: '0x96ad5eAE7e5797e628F9d3FD21995dB19aE17d58' as Address,  // 新部署
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

// 新 Pool Key: USDC/WETH — fee=10000 (1%)
const POOL_KEY = {
  currency0: ADDRESSES.USDC,
  currency1: ADDRESSES.WETH,
  fee: 10000,
  tickSpacing: 200,
  hooks: ADDRESSES.complianceHook,
};

// ABI
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const SESSION_MANAGER_ABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
] as const;

const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swap',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'zeroForOne', type: 'bool' },
          { name: 'amountSpecified', type: 'int256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: 'delta', type: 'int256' }],
    stateMutability: 'payable',
  },
] as const;

// ============ 客户端 ============

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ============ 辅助函数 ============

function section(title: string) {
  console.log('');
  console.log('═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function log(emoji: string, msg: string) {
  console.log(`  ${emoji}  ${msg}`);
}

// ============ 主函数 ============

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ILAL Swap测试 - Pool (fee=10000)               ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('  钱包:', account.address);
  console.log('  网络: Base Sepolia');
  console.log('  时间:', new Date().toISOString());
  console.log('');

  // ================================================================
  section('阶段 1: 前置条件检查');

  const ethBalance = await publicClient.getBalance({ address: account.address });
  const usdcBalance = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const wethBalance = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  log('⛽', `ETH 余额: ${formatEther(ethBalance)} ETH`);
  log('💵', `USDC 余额: ${formatUnits(usdcBalance, 6)} USDC`);
  log('💎', `WETH 余额: ${formatEther(wethBalance)} WETH`);

  // ================================================================
  section('阶段 2: Session 检查');

  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: SESSION_MANAGER_ABI,
    functionName: 'isSessionActive',
    args: [account.address],
  });

  log('✅', `链上 Session 状态: ${isActive ? '活跃' : '未激活'}`);
  
  if (!isActive) {
    throw new Error('Session 未激活，请先激活 Session');
  }

  // ================================================================
  section('阶段 3: Token授权');

  // 检查并授权USDC
  const usdcAllowance = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, ADDRESSES.simpleSwapRouter],
  });

  if (usdcAllowance < parseUnits('100', 6)) {
    log('🔓', 'USDC授权中...');
    const approveTx = await walletClient.writeContract({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ADDRESSES.simpleSwapRouter, parseUnits('1000000', 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    log('✅', 'USDC已授权');
  } else {
    log('✅', `USDC授权充足: ${formatUnits(usdcAllowance, 6)}`);
  }

  // ================================================================
  section('阶段 4: 执行合规 Swap (USDC → WETH)');

  const hookData = account.address as Hex;
  const swapAmount = parseUnits('0.1', 6); // 0.1 USDC  
  log('📊', `交易: 0.1 USDC → WETH`);
  log('🔗', `Pool: USDC/WETH (fee=10000, tickSpacing=200)`);
  log('🔐', `hookData: ${account.address.slice(0, 18)}...`);

  const usdcBefore = usdcBalance;
  const wethBefore = wethBalance;

  try {
    log('🔄', '发送 Swap 交易...');

    const swapTx = await walletClient.writeContract({
      address: ADDRESSES.simpleSwapRouter,
      abi: SWAP_ROUTER_ABI,
      functionName: 'swap',
      args: [
        {
          currency0: POOL_KEY.currency0,
          currency1: POOL_KEY.currency1,
          fee: POOL_KEY.fee,
          tickSpacing: POOL_KEY.tickSpacing,
          hooks: POOL_KEY.hooks,
        },
        {
          zeroForOne: true,  // USDC → WETH
          amountSpecified: BigInt(swapAmount) * -1n,
          sqrtPriceLimitX96: BigInt('4295128740'), // MIN_SQRT_PRICE + 1 (for zeroForOne: true)
        },
        hookData,
      ],
    });

    log('⏳', `TX 已发送: ${swapTx}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });

    log('✅', `确认! Block #${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
    log('📝', `状态: ${receipt.status}`);

    // 检查余额变化
    const usdcAfter = await publicClient.readContract({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    const wethAfter = await publicClient.readContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    console.log('');
    section('阶段 5: 余额变化');
    
    const usdcDelta = Number(usdcAfter) - Number(usdcBefore);
    const wethDelta = Number(wethAfter) - Number(wethBefore);
    
    log('💵', `USDC: ${formatUnits(usdcBefore, 6)} → ${formatUnits(usdcAfter, 6)} (${usdcDelta > 0 ? '+' : ''}${formatUnits(BigInt(usdcDelta), 6)})`);
    log('💎', `WETH: ${formatEther(wethBefore)} → ${formatEther(wethAfter)} (${wethDelta > 0 ? '+' : ''}${formatEther(BigInt(wethDelta))})`);

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Swap 成功!                                           ║');
    console.log('║                                                          ║');
    console.log(`║  Pool: USDC/WETH (fee=10000, tickSpacing=200)            ║`);
    console.log(`║  链路: Session验证 → ComplianceHook放行 → Swap执行       ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Explorer: https://sepolia.basescan.org/tx/${swapTx}`);
    console.log('');

  } catch (err: any) {
    log('❌', `Swap 失败: ${err.shortMessage || err.message}`);
    console.log('');
    console.log('详细错误:', err);
    process.exit(1);
  }
}

main().catch(console.error);
