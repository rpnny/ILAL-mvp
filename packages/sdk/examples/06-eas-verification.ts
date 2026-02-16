/**
 * Example 6: EAS Verification
 * 展示如何检查用户的合规验证状态
 */

import { ILALClient } from '@ilal/sdk';

declare const client: ILALClient;

async function easVerificationExample() {
  const userAddress = client.getUserAddress()!;

  // 1. 检查 Coinbase 验证状态
  console.log('Checking Coinbase verification...');
  
  const coinbaseVerification = await client.eas.checkCoinbaseVerification(userAddress);

  if (coinbaseVerification.isVerified) {
    console.log('✅ User is verified by Coinbase');
    console.log('Attestation ID:', coinbaseVerification.attestationId);
    console.log('Attestation data:', coinbaseVerification.attestationData);
  } else {
    console.log('❌ User not verified by Coinbase');
  }

  // 2. 查询所有 Provider（Coinbase + 自定义）
  const allVerification = await client.eas.checkAllProviders(userAddress);

  if (allVerification.isVerified) {
    console.log('✅ User has valid compliance attestation');
  } else {
    console.log('❌ No valid attestation found');
  }

  // 3. 确保用户已验证（否则抛出错误）
  try {
    await client.eas.ensureVerified(userAddress);
    console.log('Verification passed, can proceed with swap/liquidity');
  } catch (error) {
    console.error('Verification failed, cannot proceed');
  }

  // 4. 获取简单验证结果
  const verification = await client.eas.getVerification(userAddress);
  console.log('Verification result:', verification);
}

// 注册自定义 KYC Provider
function customProviderExample() {
  // 示例：Ondo Finance KYC Provider
  client.eas.registerProvider({
    name: 'Ondo KYB',
    attesterAddress: '0x...' as `0x${string}`,
    schemaUID: '0x...' as `0x${string}`,
    verify: async (userAddress, publicClient) => {
      // 从 Ondo 的合约/API 查询 KYC 状态
      const isVerified = await checkOndoKYC(userAddress);
      
      if (isVerified) {
        // 返回 attestation 数据
        return {
          uid: '0x...',
          schema: '0x...',
          // ... 其他字段
        };
      }
      
      return null;
    },
  });

  // 查询时会自动包含自定义 Provider
  return client.eas.checkAllProviders('0x...' as `0x${string}`);
}

// 模拟 attestation（仅用于测试）
function mockAttestationExample() {
  const userAddress = '0x...' as `0x${string}`;

  // 正常有效凭证
  const normalAttestation = client.eas.createMockAttestation(userAddress, 'normal');

  // 已过期凭证（用于测试拒绝逻辑）
  const expiredAttestation = client.eas.createMockAttestation(userAddress, 'expired');

  // 已撤销凭证（用于测试拒绝逻辑）
  const revokedAttestation = client.eas.createMockAttestation(userAddress, 'revoked');

  console.log('Mock attestations created for testing');
}

// 辅助函数示例
async function checkOndoKYC(userAddress: string): Promise<boolean> {
  // 实际实现应该查询 Ondo 的合约或 API
  return false;
}

easVerificationExample().catch(console.error);
