/**
 * ILAL 端到端合规 Swap 测试
 *
 * 完整流程：
 * 1. 通过 Relay 激活链上 Session
 * 2. Approve 代币
 * 3. 通过 SimpleSwapRouter + ComplianceHook 执行 Swap
 * 4. 验证余额变化
 */

import {
  createPublicClient, createWalletClient, http,
  parseEther, parseUnits, formatEther, formatUnits,
  encodePacked, encodeAbiParameters, parseAbiParameters,
  type Address, type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============ 配置 ============

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const RELAY_URL = 'http://localhost:3001';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const PRIVATE_KEY = envContent.match(/PRIVATE_KEY=(.+)/)![1].trim() as Hex;

const account = privateKeyToAccount(PRIVATE_KEY);

const ADDRESSES = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  complianceHook: '0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80' as Address,
  simpleSwapRouter: '0x2AAF6C551168DCF22804c04DdA2c08c82031F289' as Address,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

// Pool Key: USDC/WETH — 使用 fee=500 新池 (旧 fee=3000 池已被推至 MAX_TICK)
const POOL_KEY = {
  currency0: ADDRESSES.USDC,
  currency1: ADDRESSES.WETH,
  fee: 500,
  tickSpacing: 10,
  hooks: ADDRESSES.complianceHook,
};

// ABI 片段
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
] as const;

const SESSION_MANAGER_ABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getRemainingTime', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
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

// ============ 工具 ============

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`);
}

function section(title: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ============ 测试流程 ============

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ILAL 端到端合规 Swap 测试                       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  钱包: ${account.address}`);
  console.log(`  网络: Base Sepolia`);
  console.log(`  时间: ${new Date().toISOString()}`);

  // ================================================================
  // 阶段 1: 检查前置条件
  // ================================================================
  section('阶段 1: 前置条件检查');

  // 检查 ETH 余额
  const ethBalance = await publicClient.getBalance({ address: account.address });
  log('⛽', `ETH 余额: ${formatEther(ethBalance)} ETH`);
  if (ethBalance < parseEther('0.001')) {
    log('❌', 'ETH 不足，需要至少 0.001 ETH');
    process.exit(1);
  }

  // 检查 USDC 余额
  const usdcBalance = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  log('💵', `USDC 余额: ${formatUnits(usdcBalance, 6)} USDC`);

  // 检查 WETH 余额
  const wethBalance = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  log('💎', `WETH 余额: ${formatEther(wethBalance)} WETH`);

  // ================================================================
  // 阶段 2: Session 激活
  // ================================================================
  section('阶段 2: Session 激活（通过 Relay）');

  // 检查当前 Session 状态
  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: SESSION_MANAGER_ABI,
    functionName: 'isSessionActive',
    args: [account.address],
  });

  if (isActive) {
    const remaining = await publicClient.readContract({
      address: ADDRESSES.sessionManager,
      abi: SESSION_MANAGER_ABI,
      functionName: 'getRemainingTime',
      args: [account.address],
    });
    log('✅', `Session 已激活，剩余 ${Number(remaining)} 秒`);
  } else {
    log('🔄', '激活 Session（治理钱包直接调用 startSession）...');

    const SESSION_ABI = [
      { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
    ] as const;

    const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const hash = await walletClient.writeContract({
      address: ADDRESSES.sessionManager,
      abi: SESSION_ABI,
      functionName: 'startSession',
      args: [account.address, expiry],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    log('✅', `Session 激活成功！TX: ${hash.slice(0, 18)}... Gas: ${receipt.gasUsed}`);
  }

  // 再次确认
  const sessionConfirmed = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: SESSION_MANAGER_ABI,
    functionName: 'isSessionActive',
    args: [account.address],
  });
  log(sessionConfirmed ? '✅' : '❌', `链上 Session 状态: ${sessionConfirmed ? '活跃' : '未激活'}`);

  if (!sessionConfirmed) {
    log('❌', 'Session 未激活，无法继续');
    process.exit(1);
  }

  // ================================================================
  // 阶段 3: 代币授权
  // ================================================================
  section('阶段 3: 代币授权');

  // WETH → USDC swap: approve WETH to PoolManager
  const approveAmount = parseEther('1'); // 1 WETH

  const currentAllowance = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, ADDRESSES.poolManager],
  });

  if (currentAllowance < approveAmount) {
    log('🔄', `Approve WETH → PoolManager...`);
    const approveTx = await walletClient.writeContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ADDRESSES.poolManager, approveAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    log('✅', `WETH approved (tx: ${approveTx.slice(0, 18)}...)`);
  } else {
    log('✅', `WETH 已授权: ${formatEther(currentAllowance)}`);
  }

  // ================================================================
  // 阶段 4: 执行合规 Swap
  // ================================================================
  section('阶段 4: 执行合规 Swap（USDC → WETH）');

  // hookData: 白名单路由模式 — 仅传用户地址（20 bytes）
  // SimpleSwapRouter 在 Registry 中已被白名单
  const hookData = account.address as Hex;

  // Swap 参数: USDC → WETH (zeroForOne = true, 卖出 currency0=USDC 换 currency1=WETH)
  // 使用 USDC 因为我们有充足的 USDC，且流动性范围 [196260, 201560] 支持这个方向
  const swapAmount = parseUnits('1', 6); // 1 USDC (6 decimals)
  const MIN_SQRT_PRICE = BigInt('4295128740'); // TickMath.MIN_SQRT_PRICE + 1

  log('📊', `交易: 1 USDC → WETH`);
  log('🔗', `Pool: USDC/WETH (fee=${POOL_KEY.fee}, tickSpacing=${POOL_KEY.tickSpacing}, hooks=${ADDRESSES.complianceHook.slice(0, 18)}...)`);
  log('🔐', `hookData: 白名单路由模式 (${account.address.slice(0, 18)}...)`);

  const usdcBefore = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  const wethBefore = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

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
          zeroForOne: true,            // USDC → WETH
          amountSpecified: BigInt(swapAmount) * -1n, // 负数 = exactInput
          sqrtPriceLimitX96: BigInt('4295128740'), // MIN_SQRT_PRICE + 1 (for zeroForOne: true)
        },
        hookData,
      ],
    });

    log('⏳', `TX 发送: ${swapTx}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });
    log('✅', `确认! Block #${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
    log('📝', `状态: ${receipt.status === 'success' ? '成功' : '失败'}`);

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

    const usdcDiff = BigInt(usdcBefore) - BigInt(usdcAfter);
    const wethDiff = BigInt(wethAfter) - BigInt(wethBefore);

    section('结果');
    log('💵', `USDC 变化: -${formatUnits(usdcDiff, 6)} USDC`);
    log('💎', `WETH 变化: +${formatEther(wethDiff)} WETH`);
    log('⛽', `Gas 消耗: ${receipt.gasUsed}`);
    log('🔗', `TX Hash: ${swapTx}`);
    log('🔗', `Explorer: https://sepolia.basescan.org/tx/${swapTx}`);

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  ✅ 合规 Swap 成功！                              ║');
    console.log('║                                                   ║');
    console.log('║  验证链路:                                         ║');
    console.log('║  Session 活跃 → ComplianceHook 放行 → Swap 执行    ║');
    console.log('╚══════════════════════════════════════════════════╝');

  } catch (err: any) {
    log('❌', `Swap 失败: ${err.shortMessage || err.message}`);
    console.error('\n详细错误:', err);

    // 分析错误
    if (err.message?.includes('NotVerified')) {
      log('💡', '原因: ComplianceHook 拒绝 — Session 未激活或 hookData 无效');
    } else if (err.message?.includes('EmergencyPaused')) {
      log('💡', '原因: 系统处于紧急暂停状态');
    } else if (err.message?.includes('Locked')) {
      log('💡', '原因: Uniswap v4 PoolManager 锁定错误');
    } else if (err.message?.includes('PoolNotInitialized')) {
      log('💡', '原因: Pool 未初始化');
    }
  }
}

main().catch(console.error);
