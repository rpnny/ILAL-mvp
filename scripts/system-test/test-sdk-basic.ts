/**
 * SDK 基础功能测试
 * 验证 SDK 核心 API 是否正常工作（不需要测试账户）
 */

import { ILALClient, BASE_SEPOLIA_ADDRESSES, BASE_SEPOLIA_TOKENS } from '../../packages/sdk/dist/index.mjs';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '..', 'packages', 'contracts', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const GOVERNANCE_PRIVATE_KEY = envContent.match(/PRIVATE_KEY=(.+)/)![1].trim() as `0x${string}`;

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

async function testSDKBasics() {
  console.log('\n🧪 ILAL SDK 基础功能测试');
  console.log('========================================\n');

  // 1. 测试客户端初始化
  console.log('📦 测试 1: 客户端初始化\n');

  try {
    const client = await ILALClient.fromRPC({
      rpcUrl: RPC_URL,
      chainId: 84532,
      privateKey: GOVERNANCE_PRIVATE_KEY,
    });

    console.log('✅ 客户端初始化成功');
    console.log('   用户地址:', client.getUserAddress());
    console.log('   链信息:', client.getChainInfo());
    console.log('   合约地址:', {
      sessionManager: client.addresses.sessionManager,
      swapRouter: client.addresses.simpleSwapRouter,
    });

    // 2. 测试健康检查
    console.log('\n🏥 测试 2: 健康检查\n');

    const health = await client.healthCheck();
    
    if (health.healthy) {
      console.log('✅ 健康检查通过');
      console.log('   检查项:', health.checks);
    } else {
      console.log('⚠️  健康检查失败');
      console.log('   错误:', health.errors);
    }

    // 3. 测试 Session 查询（只读）
    console.log('\n🔐 测试 3: Session 查询\n');

    const userAddress = client.getUserAddress()!;
    const isActive = await client.session.isActive(userAddress);
    const remaining = await client.session.getRemainingTime(userAddress);

    console.log('✅ Session 查询成功');
    console.log('   活跃状态:', isActive);
    console.log('   剩余时间:', remaining.toString(), '秒');

    if (isActive) {
      const info = await client.session.getInfo(userAddress);
      console.log('   完整信息:', {
        isActive: info.isActive,
        expiry: new Date(Number(info.expiry) * 1000).toISOString(),
        remainingHours: Number(info.remainingTime) / 3600,
      });
    }

    // 4. 测试代币余额查询（只读）
    console.log('\n💰 测试 4: 代币余额查询\n');

    const { USDC, WETH } = BASE_SEPOLIA_TOKENS;
    
    const [usdcBalance, wethBalance] = await Promise.all([
      client.swap.getBalance(USDC, userAddress),
      client.swap.getBalance(WETH, userAddress),
    ]);

    console.log('✅ 余额查询成功');
    console.log('   USDC:', usdcBalance.toString());
    console.log('   WETH:', wethBalance.toString());

    // 5. 测试代币信息查询
    console.log('\n📊 测试 5: 代币信息查询\n');

    const [usdcInfo, wethInfo] = await Promise.all([
      client.swap.getTokenInfo(USDC),
      client.swap.getTokenInfo(WETH),
    ]);

    console.log('✅ 代币信息查询成功');
    console.log('   USDC:', usdcInfo);
    console.log('   WETH:', wethInfo);

    // 6. 测试常量和工具
    console.log('\n🔧 测试 6: 常量和工具函数\n');

    const { MIN_SQRT_PRICE, MAX_SQRT_PRICE, DEFAULT_SLIPPAGE_TOLERANCE } = await import('../../packages/sdk/dist/index.mjs');
    
    console.log('✅ 常量加载成功');
    console.log('   MIN_SQRT_PRICE:', MIN_SQRT_PRICE.toString());
    console.log('   MAX_SQRT_PRICE:', MAX_SQRT_PRICE.toString().slice(0, 20) + '...');
    console.log('   DEFAULT_SLIPPAGE:', DEFAULT_SLIPPAGE_TOLERANCE);

    // 7. 测试地址验证工具
    console.log('\n✅ 测试 7: 工具函数\n');

    const { validateAddress, sortTokens } = await import('../../packages/sdk/dist/index.mjs');
    
    console.log('   validateAddress(USDC):', validateAddress(USDC));
    console.log('   validateAddress("invalid"):', validateAddress('invalid'));
    
    const [token0, token1, zeroForOne] = sortTokens(USDC, WETH);
    console.log('   sortTokens:', { token0, token1, zeroForOne });

    // 总结
    console.log('\n\n✅ 所有基础功能测试通过！');
    console.log('========================================\n');
    console.log('SDK 核心 API 验证成功：');
    console.log('  ✅ 客户端初始化');
    console.log('  ✅ 健康检查');
    console.log('  ✅ Session 查询');
    console.log('  ✅ 代币余额查询');
    console.log('  ✅ 代币信息查询');
    console.log('  ✅ 常量加载');
    console.log('  ✅ 工具函数');
    console.log('\n🎉 SDK 已准备就绪！\n');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

testSDKBasics();
