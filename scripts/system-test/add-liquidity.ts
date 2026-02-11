/**
 * ILAL — 为新 Pool (fee=500) 添加 WETH 单边流动性
 *
 * 流程：
 * 1. 确保 PositionManager 是 Registry 白名单路由
 * 2. 激活 Session
 * 3. Wrap ETH → WETH
 * 4. Approve WETH → PositionManager
 * 5. 调用 PositionManager.mint() 添加单边 WETH 流动性
 */

import {
  createPublicClient, createWalletClient, http,
  parseEther, formatEther,
  type Address, type Hex,
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
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80' as Address,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  positionManager: '0x5b460c8Bd32951183a721bdaa3043495D8861f31' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

// 新 Pool Key (fee=500, tickSpacing=10)
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
] as const;

const REGISTRY_ABI = [
  { type: 'function', name: 'isRouterApproved', inputs: [{ name: 'router', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'approveRouter', inputs: [{ name: 'router', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const SESSION_ABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const POSITION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'mint',
    inputs: [
      {
        name: 'poolKey', type: 'tuple', components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function', name: 'getPosition', inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{
      name: '', type: 'tuple', components: [
        { name: 'owner', type: 'address' },
        { name: 'poolKey', type: 'tuple', components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ]},
        { name: 'liquidity', type: 'uint128' },
        { name: 'tickLower', type: 'int24' },
        { name: 'tickUpper', type: 'int24' },
        { name: 'createdAt', type: 'uint256' },
      ],
    }],
    stateMutability: 'view',
  },
  { type: 'function', name: 'nextTokenId', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
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

// ============ 主流程 ============

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  ILAL — 为 Pool (fee=500) 添加 WETH 流动性              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  钱包: ${account.address}`);
  console.log(`  Pool: USDC/WETH (fee=500, tickSpacing=10)`);
  console.log(`  Hook: ${ADDRESSES.complianceHook}`);
  console.log(`  时间: ${new Date().toISOString()}`);

  // ================================================================
  // 1. 确保 PositionManager 是白名单路由
  // ================================================================
  section('1. 注册 PositionManager 为白名单路由');

  const isRouterApproved = await publicClient.readContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: 'isRouterApproved',
    args: [ADDRESSES.positionManager],
  });

  if (isRouterApproved) {
    log('✅', 'PositionManager 已在白名单中');
  } else {
    log('🔄', '注册 PositionManager 为白名单路由...');
    const tx = await walletClient.writeContract({
      address: ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'approveRouter',
      args: [ADDRESSES.positionManager, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `已注册! TX: ${tx.slice(0, 20)}...`);
  }

  // ================================================================
  // 2. 激活 Session
  // ================================================================
  section('2. 激活 Session');

  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: SESSION_ABI,
    functionName: 'isSessionActive',
    args: [account.address],
  });

  if (isActive) {
    log('✅', 'Session 已激活');
  } else {
    log('🔄', '激活 Session...');
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const tx = await walletClient.writeContract({
      address: ADDRESSES.sessionManager,
      abi: SESSION_ABI,
      functionName: 'startSession',
      args: [account.address, expiry],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `Session 激活! TX: ${tx.slice(0, 20)}...`);
  }

  // ================================================================
  // 3. Wrap ETH → WETH
  // ================================================================
  section('3. Wrap ETH → WETH');

  const wethBefore = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  log('💎', `当前 WETH: ${formatEther(wethBefore)}`);

  const wrapAmount = parseEther('0.01');
  if (wethBefore < parseEther('0.012')) {
    log('🔄', `Wrapping ${formatEther(wrapAmount)} ETH → WETH...`);
    const tx = await walletClient.sendTransaction({
      to: ADDRESSES.WETH,
      value: wrapAmount,
      data: '0xd0e30db0', // deposit()
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    const wethAfter = await publicClient.readContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    log('✅', `WETH 余额: ${formatEther(wethAfter)}`);
  } else {
    log('✅', `WETH 充足: ${formatEther(wethBefore)}`);
  }

  // ================================================================
  // 4. Approve WETH → PositionManager
  // ================================================================
  section('4. Approve WETH → PositionManager');

  const allowance = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, ADDRESSES.positionManager],
  });

  const neededApproval = parseEther('1');
  if (allowance < neededApproval) {
    log('🔄', 'Approving WETH → PositionManager...');
    const tx = await walletClient.writeContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ADDRESSES.positionManager, neededApproval],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `已授权 ${formatEther(neededApproval)} WETH`);
  } else {
    log('✅', `已有授权: ${formatEther(allowance)} WETH`);
  }

  // ================================================================
  // 5. 添加流动性
  // ================================================================
  section('5. 添加 WETH 单边流动性');

  // Pool 初始 tick = 196250
  // 单边 WETH: tickLower > 196250
  // 选择合理范围覆盖 WETH 价格 3000-5000 USDC
  const tickLower = 196260;  // just above current tick (multiple of 10)
  const tickUpper = 201560;  // ~5000 USDC per WETH (multiple of 10)

  // 计算流动性: 先用较小值测试
  // amount1 = L * (sqrt(price_upper) - sqrt(price_lower))
  // price = 1.0001^tick, sqrt(price) = 1.0001^(tick/2)
  const sqrtLower = Math.pow(1.0001, tickLower / 2);
  const sqrtUpper = Math.pow(1.0001, tickUpper / 2);
  const diffSqrt = sqrtUpper - sqrtLower;

  // 目标: 提供 0.01 WETH
  const targetWeth = 0.01; // ETH
  const targetWethWei = BigInt(Math.floor(targetWeth * 1e18));
  const liquidityFloat = (targetWeth * 1e18) / diffSqrt;
  const liquidity = BigInt(Math.floor(liquidityFloat));

  log('📊', `Tick 范围: [${tickLower}, ${tickUpper}]`);
  log('📊', `预计 WETH: ~${targetWeth} WETH`);
  log('📊', `Liquidity: ${liquidity.toString()}`);

  // hookData: 白名单路由模式 — 传用户地址 (20 bytes)
  const hookData = account.address as Hex;

  log('🔄', '调用 PositionManager.mint()...');

  try {
    const tx = await walletClient.writeContract({
      address: ADDRESSES.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'mint',
      args: [
        {
          currency0: POOL_KEY.currency0,
          currency1: POOL_KEY.currency1,
          fee: POOL_KEY.fee,
          tickSpacing: POOL_KEY.tickSpacing,
          hooks: POOL_KEY.hooks,
        },
        tickLower,
        tickUpper,
        liquidity,
        hookData,
      ],
    });

    log('⏳', `TX 已发送: ${tx}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `确认! Block #${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
    log('📝', `状态: ${receipt.status === 'success' ? '成功' : '失败'}`);

    // 查询头寸
    const nextTokenId = await publicClient.readContract({
      address: ADDRESSES.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'nextTokenId',
    });
    const tokenId = Number(nextTokenId) - 1;
    log('🎫', `Position Token ID: ${tokenId}`);

    // 查询 WETH 余额变化
    const wethFinal = await publicClient.readContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    log('💎', `WETH 余额: ${formatEther(wethFinal)}`);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ 流动性添加成功!                                      ║');
    console.log('║                                                          ║');
    console.log('║  Pool: USDC/WETH (fee=500, tickSpacing=10)               ║');
    console.log(`║  Position #${tokenId} — Liquidity: ${liquidity.toString().padEnd(20)} ║`);
    console.log(`║  Range: [${tickLower}, ${tickUpper}]                          ║`);
    console.log('║                                                          ║');
    console.log('║  链路: Session验证 → ComplianceHook放行 → 流动性部署      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n  Explorer: https://sepolia.basescan.org/tx/${tx}`);

  } catch (err: any) {
    log('❌', `添加流动性失败: ${err.shortMessage || err.message}`);
    console.error('\n详细错误:', err);

    if (err.message?.includes('NotVerified')) {
      log('💡', 'ComplianceHook 拒绝 — Session 未激活或 hookData 无效');
    } else if (err.message?.includes('EmergencyPaused')) {
      log('💡', '系统处于紧急暂停状态');
    } else if (err.message?.includes('PoolNotInitialized')) {
      log('💡', 'Pool 未初始化 (fee=500 的 Pool 可能需要先初始化)');
    }
  }
}

main().catch(console.error);
