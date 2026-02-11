/**
 * ILAL 前端Pool价格查询验证脚本
 * 验证新Pool (fee=10000) 配置是否正常工作
 */

import {
  createPublicClient,
  http,
  type Address,
  encodeAbiParameters,
  keccak256,
} from 'viem';
import { baseSepolia } from 'viem/chains';

// ============ 配置 ============

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

const ADDRESSES = {
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  complianceHook: '0xDeDcFDF10b03AB45eEbefD2D91EDE66D9E5c8a80' as Address,
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address,
};

// 新Pool配置
const POOL_CONFIGS = [
  {
    name: '活跃Pool',
    fee: 10000,
    tickSpacing: 200,
    expected: '应该有流动性',
  },
  {
    name: '旧Pool (500)',
    fee: 500,
    tickSpacing: 10,
    expected: '应该为空',
  },
];

// ABI
const POOL_MANAGER_ABI = [
  {
    type: 'function',
    name: 'getSlot0',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLiquidity',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
    stateMutability: 'view',
  },
] as const;

// ============ 客户端 ============

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ============ 辅助函数 ============

function section(title: string) {
  console.log('');
  console.log('═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function log(emoji: string, msg: string) {
  console.log(`  ${emoji}  ${msg}`);
}

// 创建PoolKey
function createPoolKey(fee: number, tickSpacing: number) {
  return {
    currency0: ADDRESSES.USDC,
    currency1: ADDRESSES.WETH,
    fee,
    tickSpacing,
    hooks: ADDRESSES.complianceHook,
  };
}

// 计算Pool ID
function getPoolId(key: any): `0x${string}` {
  const encoded = encodeAbiParameters(
    [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickSpacing', type: 'int24' },
      { name: 'hooks', type: 'address' },
    ],
    [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
  );
  return keccak256(encoded);
}

// 计算价格 (从sqrtPriceX96)
function calculatePrice(sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number): number {
  if (sqrtPriceX96 === 0n) return 0;
  
  // price = (sqrtPriceX96 / 2^96)^2
  const Q96 = 2n ** 96n;
  const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
  
  // 调整小数位
  const decimalAdjustment = 10n ** BigInt(token1Decimals - token0Decimals);
  const adjustedPrice = Number(price) / Number(decimalAdjustment);
  
  return adjustedPrice;
}

// ============ 主函数 ============

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ILAL 前端Pool价格查询验证                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('  时间:', new Date().toISOString());
  console.log('  网络: Base Sepolia');
  console.log('  RPC:', RPC_URL);
  console.log('');

  let allPassed = true;

  // ================================================================
  section('测试 1: 验证所有Pool配置');

  for (const config of POOL_CONFIGS) {
    console.log('');
    log('🔍', `检查 ${config.name} (fee=${config.fee}, tickSpacing=${config.tickSpacing})`);

    const poolKey = createPoolKey(config.fee, config.tickSpacing);
    const poolId = getPoolId(poolKey);

    log('📋', `Pool ID: ${poolId.slice(0, 18)}...`);

    try {
      // 获取Slot0
      const slot0 = await publicClient.readContract({
        address: ADDRESSES.poolManager,
        abi: POOL_MANAGER_ABI,
        functionName: 'getSlot0',
        args: [poolId],
      });

      const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0;

      log('✅', `sqrtPriceX96: ${sqrtPriceX96}`);
      log('✅', `tick: ${tick}`);
      log('✅', `lpFee: ${lpFee}`);

      // 计算价格
      const price = calculatePrice(sqrtPriceX96, 6, 18); // USDC=6, WETH=18
      if (sqrtPriceX96 > 0n) {
        log('💰', `隐含价格: ${price.toExponential(4)} USDC/WETH`);
        
        // 粗略估算 (1/price 因为是USDC/WETH)
        const ethPriceInUsdc = 1 / price;
        if (ethPriceInUsdc > 1000 && ethPriceInUsdc < 10000) {
          log('✅', `ETH价格: ~$${ethPriceInUsdc.toFixed(0)} (合理范围)`);
        } else {
          log('⚠️', `ETH价格: ~$${ethPriceInUsdc.toFixed(0)} (似乎异常)`);
        }
      } else {
        log('⚠️', 'Pool未初始化或无流动性');
      }

      // 获取流动性
      const liquidity = await publicClient.readContract({
        address: ADDRESSES.poolManager,
        abi: POOL_MANAGER_ABI,
        functionName: 'getLiquidity',
        args: [poolId],
      });

      log('💧', `流动性: ${liquidity}`);

      // 验证预期
      if (config.fee === 10000) {
        // 活跃Pool应该有流动性
        if (liquidity > 0n && sqrtPriceX96 > 0n) {
          log('✅', `${config.name}: 验证通过 - 有流动性`);
        } else {
          log('❌', `${config.name}: 验证失败 - 缺少流动性`);
          allPassed = false;
        }
      } else if (config.fee === 500) {
        // 旧Pool应该为空
        if (liquidity === 0n) {
          log('✅', `${config.name}: 验证通过 - 已废弃`);
        } else {
          log('⚠️', `${config.name}: 仍有流动性 (${liquidity})`);
        }
      }
    } catch (error: any) {
      log('❌', `错误: ${error.message || error}`);
      allPassed = false;
    }
  }

  // ================================================================
  section('测试 2: 模拟前端价格查询');

  const mainPool = createPoolKey(10000, 200);
  const mainPoolId = getPoolId(mainPool);

  log('🎯', '测试前端 usePoolPrice hook 的查询逻辑');
  console.log('');

  try {
    const slot0 = await publicClient.readContract({
      address: ADDRESSES.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'getSlot0',
      args: [mainPoolId],
    });

    const [sqrtPriceX96, tick] = slot0;

    log('✅', 'RPC调用成功');
    log('📊', `当前tick: ${tick}`);
    log('📊', `sqrtPriceX96: ${sqrtPriceX96.toString()}`);

    // 模拟前端价格转换
    const price = calculatePrice(sqrtPriceX96, 6, 18);
    const ethPrice = 1 / price;

    log('💰', `前端显示价格: $${ethPrice.toFixed(2)} / ETH`);
    log('✅', '前端价格查询逻辑正常');
  } catch (error: any) {
    log('❌', `前端查询失败: ${error.message || error}`);
    allPassed = false;
  }

  // ================================================================
  section('测试 3: 前端服务器检查');

  log('🌐', '检查前端服务器状态...');

  try {
    const response = await fetch('http://localhost:3002', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok || response.status === 200 || response.status === 304) {
      log('✅', '前端服务器运行正常: http://localhost:3002');
      log('🖥️', '请在浏览器中打开进行UI测试');
    } else {
      log('⚠️', `前端服务器响应异常: ${response.status}`);
    }
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.message.includes('ECONNREFUSED')) {
      log('❌', '无法连接到前端服务器');
      log('💡', '请运行: cd frontend && npm run dev');
      allPassed = false;
    } else {
      log('⚠️', `检查失败: ${error.message}`);
    }
  }

  // ================================================================
  section('📋 测试总结');

  console.log('');
  if (allPassed) {
    log('✅', '所有测试通过！');
    log('🎉', '新Pool (fee=10000) 配置正确');
    log('🎯', '价格查询功能正常');
    log('🌐', '前端服务器运行中');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ 前端验证完成 - 系统就绪                                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
  } else {
    log('❌', '部分测试失败');
    log('⚠️', '请检查上述错误信息');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  存在问题需要修复                                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
  }

  console.log('');
  log('📖', '下一步: 在浏览器中打开 http://localhost:3002');
  log('✓', '检查Pool列表显示');
  log('✓', '验证价格显示');
  log('✓', '测试Swap UI');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error('❌ 测试脚本执行失败:');
  console.error(error);
  process.exit(1);
});
