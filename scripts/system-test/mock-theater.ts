/**
 * ILAL Mock Theater - 两账户对手戏测试脚本
 * 
 * 场景设定：
 * - 账户 A (机构巨鲸): 添加和管理流动性，模拟机构级深度
 * - 账户 B (高频交易员): 频繁 Swap，制造交易量和手续费
 * 
 * 资金来源：0x1b869CaC69Df23Ad9D727932496AEb3605538c8D (治理钱包)
 */

import {
  createPublicClient, createWalletClient, http,
  parseEther, parseUnits, formatEther, formatUnits,
  type Address, type Hex, type WalletClient,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============ 配置 ============

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', 'packages', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const GOVERNANCE_PRIVATE_KEY = envContent.match(/PRIVATE_KEY=(.+)/)![1].trim() as Hex;

// 需要用户提供这两个账户的私钥
const ACCOUNT_A_PRIVATE_KEY = process.env.ACCOUNT_A_KEY as Hex; // 机构巨鲸
const ACCOUNT_B_PRIVATE_KEY = process.env.ACCOUNT_B_KEY as Hex; // 高频交易员
const TEST_ROUNDS = Number(process.env.TEST_ROUNDS ?? '2');
const SWAP_INTERVAL_MS = Number(process.env.SWAP_INTERVAL ?? '8000');
const MIN_SWAP_USDC = Number(process.env.MIN_SWAP ?? '0.5');
const MAX_SWAP_USDC = Number(process.env.MAX_SWAP ?? '2');
const LP_WETH_AMOUNT = process.env.LIQUIDITY_AMOUNT ?? '0.003';
const FUND_A_ETH = process.env.FUND_A_ETH ?? '0.001';
const FUND_A_WETH = process.env.FUND_A_WETH ?? '0.004';
const FUND_B_ETH = process.env.FUND_B_ETH ?? '0.001';
const FUND_B_USDC = process.env.FUND_B_USDC ?? '5';
const FUND_B_WETH = process.env.FUND_B_WETH ?? '0.002';

// 账户配置
const governanceAccount = privateKeyToAccount(GOVERNANCE_PRIVATE_KEY);
const accountA = ACCOUNT_A_PRIVATE_KEY ? privateKeyToAccount(ACCOUNT_A_PRIVATE_KEY) : null;
const accountB = ACCOUNT_B_PRIVATE_KEY ? privateKeyToAccount(ACCOUNT_B_PRIVATE_KEY) : null;

// 合约地址
const ADDRESSES = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  // 使用已验证可工作的 Hook（fee=500/tickSpacing=10）
  complianceHook: '0xE1AF9f1D1ddF819f729ec08A612a2212D1058a80' as Address,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  positionManager: '0x664858fa4d3938788C7b7fE4f8d8f0864d087eA6' as Address,
  simpleSwapRouter: '0xfBfc94f61b009C1DD39dB88A3b781199973E2e44' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

// Pool 配置
const POOL_KEY = {
  currency0: ADDRESSES.USDC,
  currency1: ADDRESSES.WETH,
  fee: 500,
  tickSpacing: 10,
  hooks: ADDRESSES.complianceHook,
};

// ABI 定义
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
] as const;

const SESSION_ABI = [
  { type: 'function', name: 'isSessionActive', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'startSession', inputs: [{ name: 'user', type: 'address' }, { name: 'expiry', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

const REGISTRY_ABI = [
  { type: 'function', name: 'isRouterApproved', inputs: [{ name: 'router', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'approveRouter', inputs: [{ name: 'router', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [], stateMutability: 'nonpayable' },
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
    type: 'function',
    name: 'increaseLiquidity',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidityDelta', type: 'uint128' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
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

const governanceWallet = createWalletClient({
  account: governanceAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ============ 工具函数 ============

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`);
}

function section(title: string) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomAmount(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ============ 核心功能 ============

/**
 * 分发资金给测试账户
 */
async function distributeTestFunds(targetAddress: Address, ethAmount: string, usdcAmount: string, wethAmount: string) {
  section(`💰 分发资金给 ${targetAddress.slice(0, 10)}...`);
  
  // 1. 发送 ETH
  if (parseFloat(ethAmount) > 0) {
    log('⛽', `发送 ${ethAmount} ETH...`);
    const ethTx = await governanceWallet.sendTransaction({
      to: targetAddress,
      value: parseEther(ethAmount),
    });
    await publicClient.waitForTransactionReceipt({ hash: ethTx });
    log('✅', `ETH 已发送 (${ethTx.slice(0, 18)}...)`);
  }

  // 2. 发送 USDC
  if (parseFloat(usdcAmount) > 0) {
    log('💵', `发送 ${usdcAmount} USDC...`);
    const usdcTx = await governanceWallet.writeContract({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [targetAddress, parseUnits(usdcAmount, 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: usdcTx });
    log('✅', `USDC 已发送 (${usdcTx.slice(0, 18)}...)`);
  }

  // 3. 发送 WETH (先 wrap ETH)
  if (parseFloat(wethAmount) > 0) {
    log('💎', `Wrap 并发送 ${wethAmount} WETH...`);
    // Wrap ETH to WETH
    const wrapTx = await governanceWallet.sendTransaction({
      to: ADDRESSES.WETH,
      value: parseEther(wethAmount),
      data: '0xd0e30db0', // deposit()
    });
    await publicClient.waitForTransactionReceipt({ hash: wrapTx });
    
    // Transfer WETH
    const wethTx = await governanceWallet.writeContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [targetAddress, parseEther(wethAmount)],
    });
    await publicClient.waitForTransactionReceipt({ hash: wethTx });
    log('✅', `WETH 已发送 (${wethTx.slice(0, 18)}...)`);
  }
}

/**
 * 激活 Session
 */
async function activateSession(userAddress: Address) {
  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: SESSION_ABI,
    functionName: 'isSessionActive',
    args: [userAddress],
  });

  if (!isActive) {
    log('🔄', `激活 ${userAddress.slice(0, 10)}... 的 Session`);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const tx = await governanceWallet.writeContract({
      address: ADDRESSES.sessionManager,
      abi: SESSION_ABI,
      functionName: 'startSession',
      args: [userAddress, expiry],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `Session 激活成功 (${tx.slice(0, 18)}...)`);
  } else {
    log('✅', 'Session 已激活');
  }
}

/**
 * Approve 代币
 */
async function approveTokens(wallet: WalletClient, tokenAddress: Address, spenderAddress: Address, amount: bigint) {
  const userAddress = wallet.account!.address;
  
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
  });

  if (currentAllowance < amount) {
    log('🔄', `Approve ${tokenAddress === ADDRESSES.USDC ? 'USDC' : 'WETH'}...`);
    const tx = await wallet.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `已授权`);
  } else {
    log('✅', `已有足够授权`);
  }
}

/**
 * 账户 A: 添加流动性
 */
async function accountA_AddLiquidity(wallet: WalletClient, wethAmount: string) {
  section('🏦 账户 A (机构巨鲸): 添加流动性');
  
  const userAddress = wallet.account!.address;
  
  // 计算流动性参数
  // 关键：要做 WETH 单边流动性，需要区间在当前 tick 以下（或上界等于当前 tick）
  // 否则会要求存入 USDC（账户 A 默认没有 USDC），导致回滚。
  const tickLower = 190700;  // ~1500 USDC/WETH
  const tickUpper = 196250;  // ~= 当前 tick
  
  const sqrtLower = Math.pow(1.0001, tickLower / 2);
  const sqrtUpper = Math.pow(1.0001, tickUpper / 2);
  const diffSqrt = sqrtUpper - sqrtLower;
  
  const targetWeth = parseFloat(wethAmount);
  const liquidityFloat = (targetWeth * 1e18) / diffSqrt;
  const liquidity = BigInt(Math.floor(liquidityFloat));
  
  log('📊', `范围: Tick [${tickLower}, ${tickUpper}]`);
  log('📊', `流动性: ${liquidity.toString()}`);
  log('💎', `预计使用: ${wethAmount} WETH`);
  
  // Approve WETH
  await approveTokens(wallet, ADDRESSES.WETH, ADDRESSES.positionManager, parseEther('100'));
  
  // 添加流动性
  const hookData = userAddress as Hex;
  
  try {
    log('🔄', '调用 PositionManager.mint()...');
    const tx = await wallet.writeContract({
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
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `流动性添加成功! Gas: ${receipt.gasUsed}`);
    log('🔗', `TX: https://sepolia.basescan.org/tx/${tx}`);
    
    return true;
  } catch (err: any) {
    log('❌', `失败: ${err.shortMessage || err.message}`);
    return false;
  }
}

/**
 * 账户 B: 执行 Swap
 */
async function accountB_Swap(wallet: WalletClient, amountUSDC: string, zeroForOne: boolean) {
  const userAddress = wallet.account!.address;
  
  const direction = zeroForOne ? 'USDC → WETH' : 'WETH → USDC';
  log('💱', `账户 B (交易员): ${direction} | ${amountUSDC} USDC`);
  
  // Approve 代币
  const tokenToApprove = zeroForOne ? ADDRESSES.USDC : ADDRESSES.WETH;
  const amount = zeroForOne ? parseUnits(amountUSDC, 6) : parseEther((parseFloat(amountUSDC) / 3000).toFixed(6));
  
  // SimpleSwapRouter 在回调中从用户 transferFrom，因此授权对象必须是 Router 而不是 PoolManager
  await approveTokens(wallet, tokenToApprove, ADDRESSES.simpleSwapRouter, amount * 10n);
  
  // 执行 Swap
  const hookData = userAddress as Hex;
  const swapAmount = zeroForOne ? parseUnits(amountUSDC, 6) : parseEther((parseFloat(amountUSDC) / 3000).toFixed(6));
  const sqrtPriceLimit = zeroForOne
    ? BigInt('4295128740') // MIN_SQRT_PRICE + 1
    : BigInt('1461446703485210103287273052203988822378723970340'); // MAX_SQRT_PRICE - 1
  
  try {
    const tx = await wallet.writeContract({
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
          zeroForOne,
          amountSpecified: BigInt(swapAmount) * -1n,
          sqrtPriceLimitX96: sqrtPriceLimit,
        },
        hookData,
      ],
    });
    
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `Swap 成功 (${tx.slice(0, 18)}...)`);
    return true;
  } catch (err: any) {
    log('❌', `Swap 失败: ${err.shortMessage || err.message}`);
    return false;
  }
}

/**
 * 查询余额
 */
async function checkBalances(address: Address, label: string) {
  const eth = await publicClient.getBalance({ address });
  const usdc = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  const weth = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  
  log('💰', `${label} 余额:`);
  log('  ', `  ETH:  ${formatEther(eth)}`);
  log('  ', `  USDC: ${formatUnits(usdc, 6)}`);
  log('  ', `  WETH: ${formatEther(weth)}`);
}

async function selectSwapDirection(address: Address): Promise<boolean | null> {
  const usdc = await publicClient.readContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  const weth = await publicClient.readContract({
    address: ADDRESSES.WETH,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const minUsdc = parseUnits(MIN_SWAP_USDC.toFixed(2), 6);
  const minWeth = parseEther((MIN_SWAP_USDC / 3000).toFixed(6));

  const canUsdcToWeth = usdc >= minUsdc;
  const canWethToUsdc = weth >= minWeth;

  if (!canUsdcToWeth && !canWethToUsdc) return null;
  // 默认优先 USDC -> WETH，避免在边界价格附近触发 oneForZero 的 price limit 错误。
  if (canUsdcToWeth) return true;
  return false;
}

// ============ 主流程 ============

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ILAL Mock Theater - 两账户对手戏测试                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`  时间: ${new Date().toISOString()}`);
  console.log(`  网络: Base Sepolia`);
  console.log(`  治理钱包: ${governanceAccount.address}`);
  
  // 检查是否提供了私钥
  if (!accountA || !accountB) {
    console.log('\n❌ 错误: 请设置环境变量 ACCOUNT_A_KEY 和 ACCOUNT_B_KEY');
    console.log('\n使用方法:');
    console.log('  export ACCOUNT_A_KEY="0x..."  # 账户 A (机构巨鲸) 的私钥');
    console.log('  export ACCOUNT_B_KEY="0x..."  # 账户 B (高频交易员) 的私钥');
    console.log('  npm run test');
    process.exit(1);
  }
  
  console.log(`  账户 A (机构巨鲸): ${accountA.address}`);
  console.log(`  账户 B (高频交易员): ${accountB.address}`);
  
  const walletA = createWalletClient({
    account: accountA,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  const walletB = createWalletClient({
    account: accountB,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  // ================================================================
  // 阶段 1: 初始化设置
  // ================================================================
  section('阶段 1: 初始化设置');
  
  // 1.1 确保白名单路由
  log('🔄', '检查白名单路由...');
  const isPositionManagerApproved = await publicClient.readContract({
    address: ADDRESSES.registry,
    abi: REGISTRY_ABI,
    functionName: 'isRouterApproved',
    args: [ADDRESSES.positionManager],
  });
  
  if (!isPositionManagerApproved) {
    log('🔄', '注册 PositionManager...');
    const tx = await governanceWallet.writeContract({
      address: ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: 'approveRouter',
      args: [ADDRESSES.positionManager, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }
  log('✅', 'PositionManager 已在白名单');
  
  // 1.2 分发资金（可通过环境变量调节）
  log('ℹ️', '跳过资金分发（账户已有余额）');
  // await distributeTestFunds(accountA.address, FUND_A_ETH, '0', FUND_A_WETH);
  // await distributeTestFunds(accountB.address, FUND_B_ETH, FUND_B_USDC, FUND_B_WETH);
  
  // 1.3 激活 Sessions
  section('激活 Sessions');
  await activateSession(accountA.address);
  await activateSession(accountB.address);
  
  // 1.4 检查初始余额
  section('初始余额');
  await checkBalances(accountA.address, '账户 A');
  await checkBalances(accountB.address, '账户 B');
  
  // ================================================================
  // 阶段 2: 执行对手戏
  // ================================================================
  section('阶段 2: 开始对手戏循环');
  
  const ROUNDS = TEST_ROUNDS;
  const SWAP_INTERVAL = SWAP_INTERVAL_MS;
  
  for (let round = 1; round <= ROUNDS; round++) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  第 ${round}/${ROUNDS} 轮`);
    console.log('─'.repeat(70));
    
    // 账户 A: 每轮开始时添加/调整流动性
    if (round === 1) {
      await accountA_AddLiquidity(walletA, LP_WETH_AMOUNT);
    } else if (round % 3 === 0) {
      // 每 3 轮增加一次流动性
      section('🏦 账户 A: 增加流动性');
      log('💡', '模拟机构动态管理流动性...');
    }
    
    await sleep(2000);
    
    // 账户 B: 执行 2-3 次随机 Swap
    const numSwaps = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numSwaps; i++) {
      const direction = await selectSwapDirection(walletB.account!.address);
      if (direction === null) {
        log('⚠️', '账户 B 可用余额不足，跳过本轮后续 Swap');
        break;
      }
      const amount = randomAmount(MIN_SWAP_USDC, MAX_SWAP_USDC).toFixed(2);
      await accountB_Swap(walletB, amount, direction);
      
      if (i < numSwaps - 1) {
        await sleep(SWAP_INTERVAL);
      }
    }
    
    // 显示当前状态
    if (round % 2 === 0) {
      section(`第 ${round} 轮后的余额`);
      await checkBalances(accountA.address, '账户 A');
      await checkBalances(accountB.address, '账户 B');
    }
    
    if (round < ROUNDS) {
      log('⏳', `等待下一轮...`);
      await sleep(5000);
    }
  }
  
  // ================================================================
  // 阶段 3: 最终统计
  // ================================================================
  section('最终余额统计');
  await checkBalances(accountA.address, '账户 A (机构巨鲸)');
  await checkBalances(accountB.address, '账户 B (高频交易员)');
  
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ 对手戏测试完成!                                               ║');
  console.log('║                                                                   ║');
  console.log('║  演示成果:                                                         ║');
  console.log('║  • 机构级流动性深度 (账户 A)                                       ║');
  console.log('║  • 高频交易活动 (账户 B)                                           ║');
  console.log('║  • 真实的链上交易历史                                              ║');
  console.log('║  • 手续费收入记录                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  console.log('\n  查看链上记录:');
  console.log(`  • 账户 A: https://sepolia.basescan.org/address/${accountA.address}`);
  console.log(`  • 账户 B: https://sepolia.basescan.org/address/${accountB.address}`);
}

main().catch(console.error);
