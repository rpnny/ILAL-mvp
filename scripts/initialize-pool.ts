/**
 * 初始化 USDC/WETH Pool
 * 
 * 使用 PoolManager.initialize() 在链上创建 Pool
 */

import { createPublicClient, createWalletClient, http, parseEther, encodeAbiParameters, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// 加载环境变量
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

// 合约地址
const POOL_MANAGER = '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH = '0x4200000000000000000000000000000000000006';
const COMPLIANCE_HOOK = '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80';

// Pool 参数 - 使用不同的 fee tier 避免冲突
const POOL_FEE = 3000; // 0.3% (常用的 fee tier)
const TICK_SPACING = 60; // 对应 3000 fee 的 tickSpacing

// PoolManager ABI (仅需要的函数)
const POOL_MANAGER_ABI = [
  {
    type: 'function',
    name: 'initialize',
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
      { name: 'sqrtPriceX96', type: 'uint160' },
    ],
    outputs: [{ name: 'tick', type: 'int24' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSlot0',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      {
        name: 'slot0',
        type: 'tuple',
        components: [
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'tick', type: 'int24' },
          { name: 'protocolFee', type: 'uint24' },
          { name: 'lpFee', type: 'uint24' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

/**
 * 计算 Pool ID
 */
function computePoolId(poolKey: {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address', name: 'currency0' },
        { type: 'address', name: 'currency1' },
        { type: 'uint24', name: 'fee' },
        { type: 'int24', name: 'tickSpacing' },
        { type: 'address', name: 'hooks' },
      ],
      [poolKey.currency0 as `0x${string}`, poolKey.currency1 as `0x${string}`, poolKey.fee, poolKey.tickSpacing, poolKey.hooks as `0x${string}`]
    )
  );
}

/**
 * 计算初始 sqrtPriceX96
 * 假设 1 WETH = 2500 USDC
 * USDC/WETH 价格 = 1/2500 = 0.0004
 */
function calculateSqrtPriceX96(price: number): bigint {
  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)));
  return sqrtPriceX96;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Initialize USDC/WETH Pool on Base Sepolia            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // 检查私钥
  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ 错误: 未找到私钥');
    console.error('   请在 contracts/.env 或根目录 .env 设置 PRIVATE_KEY 或 DEPLOYER_PRIVATE_KEY');
    process.exit(1);
  }

  // 创建账户和客户端
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  console.log('📋 配置信息:');
  console.log(`   账户: ${account.address}`);
  console.log(`   网络: Base Sepolia`);
  console.log(`   PoolManager: ${POOL_MANAGER}`);
  console.log();

  // Pool Key
  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: POOL_FEE,
    tickSpacing: TICK_SPACING,
    hooks: COMPLIANCE_HOOK,
  };

  console.log('🔑 Pool Key:');
  console.log(`   currency0 (USDC): ${poolKey.currency0}`);
  console.log(`   currency1 (WETH): ${poolKey.currency1}`);
  console.log(`   fee: ${poolKey.fee} (${poolKey.fee / 10000}%)`);
  console.log(`   tickSpacing: ${poolKey.tickSpacing}`);
  console.log(`   hooks: ${poolKey.hooks}`);
  console.log();

  // 计算 Pool ID
  const poolId = computePoolId(poolKey);
  console.log(`📊 Pool ID: ${poolId}`);
  console.log();

  // 检查 Pool 是否已存在
  console.log('🔍 检查 Pool 是否已存在...');
  try {
    const slot0 = await publicClient.readContract({
      address: POOL_MANAGER as `0x${string}`,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [poolId],
    });

    if (slot0.sqrtPriceX96 > 0n) {
      console.log('✅ Pool 已存在！');
      console.log(`   sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
      console.log(`   tick: ${slot0.tick}`);
      console.log(`   protocolFee: ${slot0.protocolFee}`);
      console.log(`   lpFee: ${slot0.lpFee}`);
      console.log();
      console.log('✨ 无需初始化，Pool 已准备就绪！');
      process.exit(0);
    }
  } catch (error: any) {
    console.log('⚠️  Pool 不存在，继续初始化...');
  }
  console.log();

  // 计算初始价格
  // 假设 1 WETH = 2500 USDC
  // USDC/WETH 比率 = 1/2500 = 0.0004
  const initialPrice = 1 / 2500;
  const sqrtPriceX96 = calculateSqrtPriceX96(initialPrice);

  console.log('💰 初始价格:');
  console.log(`   1 WETH = 2500 USDC`);
  console.log(`   USDC/WETH 比率 = ${initialPrice}`);
  console.log(`   sqrtPriceX96 = ${sqrtPriceX96.toString()}`);
  console.log();

  // 检查余额
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💳 账户余额: ${(Number(balance) / 1e18).toFixed(6)} ETH`);
  
  if (balance < parseEther('0.001')) {
    console.error('❌ 余额不足，至少需要 0.001 ETH 用于 Gas');
    process.exit(1);
  }
  console.log();

  // 初始化 Pool
  console.log('⏳ 发送初始化交易...');
  console.log();

  try {
    const hash = await walletClient.writeContract({
      address: POOL_MANAGER as `0x${string}`,
      abi: POOL_MANAGER_ABI,
      functionName: 'initialize',
      args: [poolKey, sqrtPriceX96],
      gas: 500000n,
    });

    console.log(`📤 交易已发送: ${hash}`);
    console.log('⏳ 等待确认...');
    console.log();

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ Pool 初始化成功！');
      console.log();
      console.log(`📊 交易详情:`);
      console.log(`   Hash: ${receipt.transactionHash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log();

      // 验证 Pool 状态
      console.log('🔍 验证 Pool 状态...');
      const slot0 = await publicClient.readContract({
        address: POOL_MANAGER as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'getSlot0',
        args: [poolId],
      });

      console.log('✅ Pool 状态:');
      console.log(`   sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
      console.log(`   tick: ${slot0.tick}`);
      console.log(`   protocolFee: ${slot0.protocolFee}`);
      console.log(`   lpFee: ${slot0.lpFee}`);
      console.log();

      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║                    🎉 初始化完成！                          ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log();
      console.log('✨ 现在可以在前端进行 Swap 和添加流动性了！');
      console.log('   http://localhost:3000/trade');
      console.log('   http://localhost:3000/liquidity');
      console.log();
    } else {
      console.error('❌ 交易失败');
      console.error(`   Hash: ${receipt.transactionHash}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ 初始化失败:');
    console.error(error);
    
    if (error.message?.includes('user rejected')) {
      console.error('\n⚠️  用户取消了交易');
    } else if (error.message?.includes('insufficient funds')) {
      console.error('\n⚠️  余额不足');
    } else if (error.message?.includes('AlreadyInitialized')) {
      console.log('\n✅ Pool 已经初始化过了！');
    }
    
    process.exit(1);
  }
}

main();
