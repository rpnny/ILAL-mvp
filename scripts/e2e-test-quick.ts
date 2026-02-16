#!/usr/bin/env tsx
/**
 * ILAL 端到端快速测试
 * 验证已部署的合约功能
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM 模块兼容性
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../packages/contracts/.env') });

// ============ 配置 ============

const DEPLOYMENT = {
  network: 'Base Sepolia',
  chainId: 84532,
  contracts: {
    registry: '0x104DA869aDd4f1598127F03763a755e7dDE4f988' as `0x${string}`,
    sessionManager: '0x4CB61d41E8D4ceCFb8C477ed069adFF309fB6d0e' as `0x${string}`,
    plonkVerifier: '0x92eF7F6440466eb2138F7d179Cf2031902eF94be' as `0x${string}`,
    verifierAdapter: '0x428aC1E38197bf37A42abEbA5f35B080438Ada22' as `0x${string}`,
    complianceHook: '0xc2eD8e6F4C3a29275cC43e435795c5528BC9CF6A' as `0x${string}`,
    positionManager: '0x2A1046A6d0EBdbfe4e45072CAf25833f4FAaEAB4' as `0x${string}`,
  },
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
};

// ============ ABI 定义 ============

const REGISTRY_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getSessionTTL',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const SESSION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'isSessionActive',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getRemainingTime',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// ============ 主测试函数 ============

async function main() {
  console.log('🧪 ILAL 端到端快速测试');
  console.log('='.repeat(60));
  console.log(`📡 网络: ${DEPLOYMENT.network} (Chain ID: ${DEPLOYMENT.chainId})`);
  console.log(`🔗 RPC: ${DEPLOYMENT.rpcUrl}`);
  console.log('');

  // 创建客户端
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(DEPLOYMENT.rpcUrl),
  });

  let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // ============ 测试 1: 检查合约代码存在 ============
    console.log('📋 测试 1: 检查合约部署状态');
    console.log('-'.repeat(60));

    for (const [name, address] of Object.entries(DEPLOYMENT.contracts)) {
      try {
        const code = await publicClient.getBytecode({ address });
        if (code && code !== '0x' && code.length > 2) {
          console.log(`✅ ${name}: ${address}`);
          testResults.passed++;
        } else {
          console.log(`❌ ${name}: ${address} (无字节码)`);
          testResults.failed++;
        }
      } catch (error: any) {
        console.log(`❌ ${name}: ${address} (错误: ${error.message})`);
        testResults.failed++;
      }
    }
    console.log('');

    // ============ 测试 2: Registry 状态检查 ============
    console.log('📋 测试 2: Registry 状态检查');
    console.log('-'.repeat(60));

    try {
      const owner = await publicClient.readContract({
        address: DEPLOYMENT.contracts.registry,
        abi: REGISTRY_ABI,
        functionName: 'owner',
      });
      console.log(`✅ Registry Owner: ${owner}`);
      testResults.passed++;

      try {
        const paused = await publicClient.readContract({
          address: DEPLOYMENT.contracts.registry,
          abi: REGISTRY_ABI,
          functionName: 'paused',
        });
        console.log(`✅ Registry Paused: ${paused}`);
        testResults.passed++;
      } catch {
        console.log(`ℹ️  Registry Paused 状态检查跳过（方法可能不存在）`);
        testResults.skipped++;
      }

      const sessionTTL = await publicClient.readContract({
        address: DEPLOYMENT.contracts.registry,
        abi: REGISTRY_ABI,
        functionName: 'getSessionTTL',
      });
      console.log(`✅ Session TTL: ${sessionTTL} seconds (${Number(sessionTTL) / 3600} hours)`);
      testResults.passed++;
    } catch (error: any) {
      console.log(`❌ Registry 读取失败: ${error.message}`);
      testResults.failed++;
    }
    console.log('');

    // ============ 测试 3: 检查账户 Session 状态 ============
    console.log('📋 测试 3: SessionManager 状态检查');
    console.log('-'.repeat(60));

    // 使用部署者地址作为测试地址
    const testAddress = process.env.PRIVATE_KEY 
      ? privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`).address
      : '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D' as `0x${string}`;

    try {
      const isActive = await publicClient.readContract({
        address: DEPLOYMENT.contracts.sessionManager,
        abi: SESSION_MANAGER_ABI,
        functionName: 'isSessionActive',
        args: [testAddress],
      });
      console.log(`✅ Session Active (${testAddress}): ${isActive}`);
      testResults.passed++;

      if (isActive) {
        const remainingTime = await publicClient.readContract({
          address: DEPLOYMENT.contracts.sessionManager,
          abi: SESSION_MANAGER_ABI,
          functionName: 'getRemainingTime',
          args: [testAddress],
        });
        console.log(`✅ Remaining Time: ${remainingTime} seconds (${Number(remainingTime) / 60} minutes)`);
        testResults.passed++;
      } else {
        console.log(`ℹ️  Session 未激活（这是正常的，需要先验证 ZK Proof）`);
        testResults.skipped++;
      }
    } catch (error: any) {
      console.log(`❌ SessionManager 读取失败: ${error.message}`);
      testResults.failed++;
    }
    console.log('');

    // ============ 测试 4: 检查区块链连接性 ============
    console.log('📋 测试 4: 区块链连接性检查');
    console.log('-'.repeat(60));

    try {
      const blockNumber = await publicClient.getBlockNumber();
      console.log(`✅ 当前区块高度: ${blockNumber}`);
      testResults.passed++;

      const chainId = await publicClient.getChainId();
      console.log(`✅ Chain ID: ${chainId}`);
      testResults.passed++;

      if (testAddress) {
        const balance = await publicClient.getBalance({ address: testAddress });
        console.log(`✅ 测试账户余额: ${formatEther(balance)} ETH`);
        testResults.passed++;
      }
    } catch (error: any) {
      console.log(`❌ 区块链连接失败: ${error.message}`);
      testResults.failed++;
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ 测试过程发生错误:', error);
    testResults.failed++;
  }

  // ============ 测试总结 ============
  console.log('='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`⏭️  跳过: ${testResults.skipped}`);
  console.log('');

  if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！合约部署正常。');
    console.log('');
    console.log('🚀 下一步:');
    console.log('   1. 使用 Web Demo 进行完整的用户流程测试');
    console.log('   2. 测试 ZK Proof 生成和验证');
    console.log('   3. 测试 Swap 和流动性操作');
    console.log('');
    console.log('📚 文档链接:');
    console.log(`   - Registry: https://sepolia.basescan.org/address/${DEPLOYMENT.contracts.registry}`);
    console.log(`   - SessionManager: https://sepolia.basescan.org/address/${DEPLOYMENT.contracts.sessionManager}`);
    console.log(`   - ComplianceHook: https://sepolia.basescan.org/address/${DEPLOYMENT.contracts.complianceHook}`);
    
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查合约部署和网络配置。');
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
