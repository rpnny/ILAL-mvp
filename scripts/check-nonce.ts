/**
 * 检查用户当前 nonce 和签名验证
 */

import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const COMPLIANCE_HOOK = '0xe633220f15932428FcA60A1A2C2C48797A180A80';

const COMPLIANCE_HOOK_ABI = [
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDomainSeparator',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SWAP_PERMIT_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
] as const;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           检查 Nonce 和 EIP-712 配置                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`User: ${account.address}`);
  console.log();

  // 1. 获取用户当前 nonce
  console.log('【1/3】获取用户当前 nonce...');
  
  const currentNonce = await publicClient.readContract({
    address: COMPLIANCE_HOOK as `0x${string}`,
    abi: COMPLIANCE_HOOK_ABI,
    functionName: 'nonces',
    args: [account.address],
  });

  console.log(`  Current Nonce: ${currentNonce.toString()}`);
  
  if (currentNonce > 0n) {
    console.log(`  ⚠️  Nonce 不为 0！用户之前可能已经进行过 swap 或验证`);
    console.log(`  🔍 前端需要确保每次调用时获取最新的 nonce`);
  } else {
    console.log(`  ✅ Nonce 为 0，这是首次 swap`);
  }
  console.log();

  // 2. 获取域分隔符
  console.log('【2/3】获取合约的域分隔符...');
  
  const domainSeparator = await publicClient.readContract({
    address: COMPLIANCE_HOOK as `0x${string}`,
    abi: COMPLIANCE_HOOK_ABI,
    functionName: 'getDomainSeparator',
  });

  console.log(`  Domain Separator: ${domainSeparator}`);
  console.log();

  // 3. 获取 SWAP_PERMIT_TYPEHASH
  console.log('【3/3】获取 SWAP_PERMIT_TYPEHASH...');
  
  const typeHash = await publicClient.readContract({
    address: COMPLIANCE_HOOK as `0x${string}`,
    abi: COMPLIANCE_HOOK_ABI,
    functionName: 'SWAP_PERMIT_TYPEHASH',
  });

  console.log(`  SWAP_PERMIT_TYPEHASH: ${typeHash}`);
  console.log();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    分析结果                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  if (currentNonce === 0n) {
    console.log('✅ 用户首次 swap，nonce 为 0');
    console.log('   前端应该获取 nonce = 0 并生成签名');
  } else {
    console.log('❌ 用户 nonce 已递增到', currentNonce.toString());
    console.log('   可能的原因:');
    console.log('   1. 用户之前成功完成过 swap（nonce 已使用）');
    console.log('   2. 用户尝试过 swap 但失败了，但 nonce 已递增（BUG！）');
    console.log();
    console.log('🔧 解决方案:');
    console.log('   前端必须在每次 swap 前调用 ComplianceHook.nonces(user)');
    console.log('   获取最新的 nonce，而不是假设 nonce = 0');
  }
  console.log();

  console.log('📋 前端应该使用的 EIP-712 配置:');
  console.log(`   Domain Name: "ILAL ComplianceHook"`);
  console.log(`   Domain Version: "1"`);
  console.log(`   ChainId: 84532 (Base Sepolia)`);
  console.log(`   Verifying Contract: ${COMPLIANCE_HOOK}`);
  console.log(`   Domain Separator: ${domainSeparator}`);
  console.log();
  console.log(`   SwapPermit Types:`);
  console.log(`     user: address`);
  console.log(`     deadline: uint256`);
  console.log(`     nonce: uint256 (当前值: ${currentNonce.toString()})`);
}

main().catch(console.error);
