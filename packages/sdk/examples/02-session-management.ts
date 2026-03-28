/**
 * Example 2: Session Management
 * 展示如何通过 ILAL API 激活和查询 Session
 *
 * 运行:
 *   PRIVATE_KEY=0x... ILAL_API_KEY=ilal_live_... npx tsx packages/sdk/examples/02-session-management.ts
 *
 * 前提:
 *   - 已在 ilal.tech 注册并创建 API Key
 *   - 已完成机构 Onboarding (POST /onboarding/register)
 *   - 已生成并提交 ZK Proof (POST /verify)，Session 已激活
 */

import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ILALClient } from '@ilal/sdk';

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const API_KEY     = process.env.ILAL_API_KEY;
const API_URL     = process.env.ILAL_API_URL || 'https://ilal-mvp-production.up.railway.app';

if (!PRIVATE_KEY) {
  console.error('❌ Set PRIVATE_KEY env var');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

const client = new ILALClient({
  walletClient,
  publicClient,
  chainId: 84532,
});

// Configure API for session activation flow
if (API_KEY) {
  client.session.configureApi({ apiBaseUrl: API_URL, apiKey: API_KEY });
}

async function sessionExample() {
  const address = account.address;
  console.log('Wallet:', address);

  // 1. 查询 Session 状态（直接读链上）
  const isActive = await client.session.isActive();
  console.log('\n1. Session active:', isActive);

  // 2. 获取剩余时间
  if (isActive) {
    const remaining = await client.session.getRemainingTime();
    const hours = Math.floor(Number(remaining) / 3600);
    const mins  = Math.floor((Number(remaining) % 3600) / 60);
    console.log(`2. Remaining: ${hours}h ${mins}m`);

    const info = await client.session.getInfo();
    console.log('3. Expiry:', new Date(Number(info.expiry) * 1000).toISOString());
  } else {
    console.log('2. Session not active — submit ZK Proof via POST /api/v1/verify to activate');
    console.log(`   API: ${API_URL}/api/v1/verify`);
  }

  // 3. 通过 API 激活（仅示例，实际需要先生成 ZK proof）
  // const result = await client.session.activateViaApi(proofHex, publicSignals);
  // console.log('Session activated, txHash:', result.txHash);
}

sessionExample().catch(err => { console.error('Error:', err.message); process.exit(1); });
