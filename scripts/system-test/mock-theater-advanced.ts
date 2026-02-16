/**
 * ILAL Mock Theater Advanced - 高级对手戏测试
 * 
 * 特性：
 * - 支持命令行参数自定义
 * - 支持单步执行模式
 * - 详细的统计数据
 * - 支持暂停和继续
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

// ============ 类型定义 ============

interface TestConfig {
  rounds: number;
  swapInterval: number;
  minSwapAmount: number;
  maxSwapAmount: number;
  liquidityAmount: string;
  stepByStep: boolean;
  verbose: boolean;
}

interface Statistics {
  totalSwaps: number;
  totalVolume: bigint;
  totalGasUsed: bigint;
  successfulSwaps: number;
  failedSwaps: number;
  liquidityAdditions: number;
  startTime: number;
  endTime: number;
}

// ============ 配置 ============

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const GOVERNANCE_PRIVATE_KEY = envContent.match(/PRIVATE_KEY=(.+)/)![1].trim() as Hex;

// 从环境变量或命令行参数获取配置
const config: TestConfig = {
  rounds: parseInt(process.env.TEST_ROUNDS || '5'),
  swapInterval: parseInt(process.env.SWAP_INTERVAL || '10000'),
  minSwapAmount: parseFloat(process.env.MIN_SWAP || '10'),
  maxSwapAmount: parseFloat(process.env.MAX_SWAP || '100'),
  liquidityAmount: process.env.LIQUIDITY_AMOUNT || '0.1',
  stepByStep: process.argv.includes('--step'),
  verbose: process.argv.includes('--verbose'),
};

const ACCOUNT_A_PRIVATE_KEY = process.env.ACCOUNT_A_KEY as Hex;
const ACCOUNT_B_PRIVATE_KEY = process.env.ACCOUNT_B_KEY as Hex;

// 账户
const governanceAccount = privateKeyToAccount(GOVERNANCE_PRIVATE_KEY);
const accountA = ACCOUNT_A_PRIVATE_KEY ? privateKeyToAccount(ACCOUNT_A_PRIVATE_KEY) : null;
const accountB = ACCOUNT_B_PRIVATE_KEY ? privateKeyToAccount(ACCOUNT_B_PRIVATE_KEY) : null;

// 合约地址
const ADDRESSES = {
  registry: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as Address,
  sessionManager: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as Address,
  complianceHook: '0x3407E999DD5d96CD53f8ce17731d4B16C9429cE2' as Address,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  positionManager: '0x5b460c8Bd32951183a721bdaa3043495D8861f31' as Address,
  simpleSwapRouter: '0x2AAF6C551168DCF22804c04DdA2c08c82031F289' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

const POOL_KEY = {
  currency0: ADDRESSES.USDC,
  currency1: ADDRESSES.WETH,
  fee: 500,
  tickSpacing: 10,
  hooks: ADDRESSES.complianceHook,
};

// ABI 定义（与之前相同）
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
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

// ============ 统计数据 ============

const stats: Statistics = {
  totalSwaps: 0,
  totalVolume: 0n,
  totalGasUsed: 0n,
  successfulSwaps: 0,
  failedSwaps: 0,
  liquidityAdditions: 0,
  startTime: Date.now(),
  endTime: 0,
};

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

async function waitForUser(prompt: string = '按 Enter 继续...') {
  if (config.stepByStep) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    await new Promise<void>(resolve => {
      rl.question(`\n  ⏸️  ${prompt} `, () => {
        rl.close();
        resolve();
      });
    });
  }
}

function displayStats() {
  const duration = ((stats.endTime || Date.now()) - stats.startTime) / 1000;
  
  section('📊 统计数据');
  log('🔢', `总 Swap 数: ${stats.totalSwaps}`);
  log('✅', `成功: ${stats.successfulSwaps}`);
  log('❌', `失败: ${stats.failedSwaps}`);
  log('💰', `总交易量: ${formatUnits(stats.totalVolume, 6)} USDC`);
  log('⛽', `总 Gas 消耗: ${stats.totalGasUsed.toString()}`);
  log('🏦', `流动性操作: ${stats.liquidityAdditions} 次`);
  log('⏱️', `总耗时: ${duration.toFixed(1)} 秒`);
  
  if (stats.totalSwaps > 0) {
    const avgGas = Number(stats.totalGasUsed) / stats.totalSwaps;
    log('📈', `平均 Gas/Swap: ${avgGas.toFixed(0)}`);
  }
}

// ============ 核心功能（复用之前的函数）============

async function distributeTestFunds(targetAddress: Address, ethAmount: string, usdcAmount: string, wethAmount: string) {
  section(`💰 分发资金给 ${targetAddress.slice(0, 10)}...`);
  
  if (parseFloat(ethAmount) > 0) {
    log('⛽', `发送 ${ethAmount} ETH...`);
    const ethTx = await governanceWallet.sendTransaction({
      to: targetAddress,
      value: parseEther(ethAmount),
    });
    await publicClient.waitForTransactionReceipt({ hash: ethTx });
    log('✅', `ETH 已发送`);
  }

  if (parseFloat(usdcAmount) > 0) {
    log('💵', `发送 ${usdcAmount} USDC...`);
    const usdcTx = await governanceWallet.writeContract({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [targetAddress, parseUnits(usdcAmount, 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: usdcTx });
    log('✅', `USDC 已发送`);
  }

  if (parseFloat(wethAmount) > 0) {
    log('💎', `Wrap 并发送 ${wethAmount} WETH...`);
    const wrapTx = await governanceWallet.sendTransaction({
      to: ADDRESSES.WETH,
      value: parseEther(wethAmount),
      data: '0xd0e30db0',
    });
    await publicClient.waitForTransactionReceipt({ hash: wrapTx });
    
    const wethTx = await governanceWallet.writeContract({
      address: ADDRESSES.WETH,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [targetAddress, parseEther(wethAmount)],
    });
    await publicClient.waitForTransactionReceipt({ hash: wethTx });
    log('✅', `WETH 已发送`);
  }
}

async function activateSession(userAddress: Address) {
  const isActive = await publicClient.readContract({
    address: ADDRESSES.sessionManager,
    abi: SESSION_ABI,
    functionName: 'isSessionActive',
    args: [userAddress],
  });

  if (!isActive) {
    log('🔄', `激活 Session`);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const tx = await governanceWallet.writeContract({
      address: ADDRESSES.sessionManager,
      abi: SESSION_ABI,
      functionName: 'startSession',
      args: [userAddress, expiry],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    log('✅', `Session 激活成功`);
  } else {
    log('✅', 'Session 已激活');
  }
}

async function approveTokens(wallet: WalletClient, tokenAddress: Address, spenderAddress: Address, amount: bigint) {
  const userAddress = wallet.account!.address;
  
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
  });

  if (currentAllowance < amount) {
    const tx = await wallet.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    if (config.verbose) log('✅', `已授权`);
  }
}

async function accountA_AddLiquidity(wallet: WalletClient, wethAmount: string) {
  section('🏦 账户 A: 添加流动性');
  
  const userAddress = wallet.account!.address;
  
  const tickLower = 196260;
  const tickUpper = 201560;
  
  const sqrtLower = Math.pow(1.0001, tickLower / 2);
  const sqrtUpper = Math.pow(1.0001, tickUpper / 2);
  const diffSqrt = sqrtUpper - sqrtLower;
  
  const targetWeth = parseFloat(wethAmount);
  const liquidityFloat = (targetWeth * 1e18) / diffSqrt;
  const liquidity = BigInt(Math.floor(liquidityFloat));
  
  log('💎', `添加 ${wethAmount} WETH 流动性`);
  
  await approveTokens(wallet, ADDRESSES.WETH, ADDRESSES.positionManager, parseEther('100'));
  
  const hookData = userAddress as Hex;
  
  try {
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
    log('✅', `成功! Gas: ${receipt.gasUsed}`);
    
    stats.liquidityAdditions++;
    stats.totalGasUsed += receipt.gasUsed;
    
    if (config.verbose) {
      log('🔗', `https://sepolia.basescan.org/tx/${tx}`);
    }
    
    return true;
  } catch (err: any) {
    log('❌', `失败: ${err.shortMessage || err.message}`);
    return false;
  }
}

async function accountB_Swap(wallet: WalletClient, amountUSDC: string, zeroForOne: boolean) {
  const userAddress = wallet.account!.address;
  
  const direction = zeroForOne ? 'USDC→WETH' : 'WETH→USDC';
  log('💱', `${direction} | ${parseFloat(amountUSDC).toFixed(2)} USDC`);
  
  const tokenToApprove = zeroForOne ? ADDRESSES.USDC : ADDRESSES.WETH;
  const amount = zeroForOne ? parseUnits(amountUSDC, 6) : parseEther((parseFloat(amountUSDC) / 3000).toFixed(6));
  
  await approveTokens(wallet, tokenToApprove, ADDRESSES.poolManager, amount * 10n);
  
  const hookData = userAddress as Hex;
  const swapAmount = zeroForOne ? parseUnits(amountUSDC, 6) : parseEther((parseFloat(amountUSDC) / 3000).toFixed(6));
  const sqrtPriceLimit = zeroForOne ? BigInt('4295128740') : BigInt('1461446703485210103287273052203988822378723970341');
  
  stats.totalSwaps++;
  
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
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    
    stats.successfulSwaps++;
    stats.totalVolume += parseUnits(amountUSDC, 6);
    stats.totalGasUsed += receipt.gasUsed;
    
    log('✅', `成功 (Gas: ${receipt.gasUsed})`);
    
    if (config.verbose) {
      log('🔗', `https://sepolia.basescan.org/tx/${tx}`);
    }
    
    return true;
  } catch (err: any) {
    stats.failedSwaps++;
    log('❌', `失败: ${err.shortMessage || err.message}`);
    return false;
  }
}

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
  
  log('💰', `${label}:`);
  log('  ', `  ETH:  ${formatEther(eth)}`);
  log('  ', `  USDC: ${formatUnits(usdc, 6)}`);
  log('  ', `  WETH: ${formatEther(weth)}`);
}

// ============ 主流程 ============

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ILAL Mock Theater Advanced - 高级对手戏测试                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`  时间: ${new Date().toISOString()}`);
  console.log(`  网络: Base Sepolia`);
  
  if (!accountA || !accountB) {
    console.log('\n❌ 错误: 请设置环境变量 ACCOUNT_A_KEY 和 ACCOUNT_B_KEY');
    process.exit(1);
  }
  
  console.log(`\n  配置:`);
  console.log(`  • 测试轮数: ${config.rounds}`);
  console.log(`  • Swap 间隔: ${config.swapInterval}ms`);
  console.log(`  • Swap 金额范围: ${config.minSwapAmount}-${config.maxSwapAmount} USDC`);
  console.log(`  • 流动性金额: ${config.liquidityAmount} WETH`);
  console.log(`  • 单步模式: ${config.stepByStep ? '开启' : '关闭'}`);
  console.log(`  • 详细日志: ${config.verbose ? '开启' : '关闭'}`);
  
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
  
  await waitForUser('按 Enter 开始测试');
  
  // 初始化
  section('阶段 1: 初始化');
  
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
  
  await distributeTestFunds(accountA.address, '0.05', '0', '0.5');
  await distributeTestFunds(accountB.address, '0.05', '10000', '0.1');
  
  section('激活 Sessions');
  await activateSession(accountA.address);
  await activateSession(accountB.address);
  
  section('初始余额');
  await checkBalances(accountA.address, '账户 A');
  await checkBalances(accountB.address, '账户 B');
  
  await waitForUser('按 Enter 开始对手戏循环');
  
  // 对手戏循环
  section('阶段 2: 对手戏循环');
  
  for (let round = 1; round <= config.rounds; round++) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  第 ${round}/${config.rounds} 轮`);
    console.log('─'.repeat(70));
    
    if (round === 1) {
      await accountA_AddLiquidity(walletA, config.liquidityAmount);
      await waitForUser();
    }
    
    const numSwaps = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numSwaps; i++) {
      const amount = randomAmount(config.minSwapAmount, config.maxSwapAmount).toFixed(2);
      const direction = Math.random() > 0.5;
      await accountB_Swap(walletB, amount, direction);
      
      if (i < numSwaps - 1) {
        await sleep(config.swapInterval);
      }
    }
    
    if (round % 2 === 0 || config.stepByStep) {
      section(`第 ${round} 轮后的余额`);
      await checkBalances(accountA.address, '账户 A');
      await checkBalances(accountB.address, '账户 B');
      displayStats();
    }
    
    if (round < config.rounds) {
      await waitForUser(`第 ${round} 轮完成，按 Enter 继续下一轮`);
      await sleep(2000);
    }
  }
  
  // 最终统计
  stats.endTime = Date.now();
  
  section('最终余额');
  await checkBalances(accountA.address, '账户 A (机构巨鲸)');
  await checkBalances(accountB.address, '账户 B (高频交易员)');
  
  displayStats();
  
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ 对手戏测试完成!                                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  console.log('\n  查看链上记录:');
  console.log(`  • 账户 A: https://sepolia.basescan.org/address/${accountA.address}`);
  console.log(`  • 账户 B: https://sepolia.basescan.org/address/${accountB.address}`);
}

main().catch(console.error);
